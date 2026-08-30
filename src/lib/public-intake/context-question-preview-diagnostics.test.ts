import { afterEach, describe, expect, it, vi } from 'vitest'
import { compatibilityContextGoals } from './context-goal-catalog'
import { tracePreviewQuestionAuthorization, tracePreviewQuestionVerification } from './context-question-preview-diagnostics'
import { formulateContextQuestion, type ContextQuestionFormulationInput } from './context-question-formulator'

const input: ContextQuestionFormulationInput = {
  originalInput: 'Sinds we drie maanden geleden naar een nieuw kantoor zijn verhuisd, hebben meerdere medewerkers aan het einde van de middag last van hoofdpijn, droge ogen en vermoeidheid. We weten niet waar het door komt. Kan iemand dit onderzoeken?',
  facts: [{ code: 'HEALTH_COMPLAINT', value: 'sensitive fact value', status: 'RELIABLE_EXTRACTION', confidence: 1 },
    { code: 'INDOOR_ENVIRONMENT', value: 'sensitive hypothesis', status: 'HYPOTHESIS', confidence: 0.9 }],
  goal: { ...compatibilityContextGoals[0], selectedContextRuleId: '11111111-1111-4111-8111-111111111201',
    ruleVersion: 4, variantKey: 'CASE:S1:LOCATION_PATTERN',
    questionGeneration: { contractVersion: 2, informationNeed: 'Verschillen tussen werkplekken',
      runtimeQuestionInstructions: 'Vraag neutraal naar verschillen.', neutralFallbackQuestion: 'Zijn er verschillen tussen werkplekken bekend?' } },
  evidence: [],
}
const question = 'Zijn er verschillen tussen werkplekken bekend?'
const verdict = { informationNeedPreserved: true, oneDutchQuestion: true,
  unsupportedPresuppositions: [], supportingFactCodes: ['HEALTH_COMPLAINT'], evidenceQuotes: ['hoofdpijn'] }
function preview() {
  vi.stubEnv('VERCEL_ENV', 'preview')
  vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'codex/ai-help-request-intake-v2')
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks() })

describe('temporary Preview verifier diagnostics', () => {
  it.each(['RATE_LIMITED', 'PROTECTION_UNAVAILABLE', 'ABUSE_CONTEXT_MISSING', null] as const)('observes authorization reason %s', (reason) => {
    preview()
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    tracePreviewQuestionAuthorization(input, reason)
    expect(JSON.parse(String(log.mock.calls[0][0]))).toEqual({
      event: 'PREVIEW_SYNTHETIC_QUESTION_AUTHORIZATION', check: 'allowPublicIntakeAIClassification',
      allowed: reason === null, reason: reason === 'PROTECTION_UNAVAILABLE' ? 'SECURITY_CHECK_UNAVAILABLE' : reason,
    })
  })
  it('authorization diagnostics are Preview/case scoped and cannot throw', () => {
    preview()
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    tracePreviewQuestionAuthorization({ ...input, originalInput: 'private' }, 'RATE_LIMITED')
    vi.stubEnv('VERCEL_ENV', 'production')
    tracePreviewQuestionAuthorization(input, 'RATE_LIMITED')
    expect(log).not.toHaveBeenCalled()
    preview(); vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'main')
    tracePreviewQuestionAuthorization(input, 'RATE_LIMITED')
    expect(log).not.toHaveBeenCalled()
    preview(); log.mockImplementation(() => { throw new Error('logger') })
    expect(() => tracePreviewQuestionAuthorization(input, 'RATE_LIMITED')).not.toThrow()
  })
  it.each(['production', 'development', ''])('logs nothing in %s', (environment) => {
    preview(); vi.stubEnv('VERCEL_ENV', environment)
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    tracePreviewQuestionVerification(input, question, verdict)
    expect(log).not.toHaveBeenCalled()
  })
  it('logs nothing for another branch or arbitrary input', () => {
    preview()
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    tracePreviewQuestionVerification({ ...input, originalInput: 'Personal case' }, question, verdict)
    vi.stubEnv('VERCEL_GIT_COMMIT_REF', 'main')
    tracePreviewQuestionVerification(input, question, verdict)
    expect(log).not.toHaveBeenCalled()
  })
  it('records all verifier checks without raw facts or arbitrary model text', () => {
    preview()
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    tracePreviewQuestionVerification(input, `${question} jane@example.com sk-secret-value`, {
      ...verdict, supportingFactCodes: ['INDOOR_ENVIRONMENT'], evidenceQuotes: ['Hoofdpijn'],
    })
    const text = String(log.mock.calls[0][0])
    const result = JSON.parse(text)
    expect(result.rejectedChecks).toEqual(['supportingFactCodesKnown', 'evidenceQuotesLiteral'])
    expect(result.quoteChecks[0]).toMatchObject({ literal: false, caseInsensitive: true })
    expect(result.hypotheses).toEqual(['INDOOR_ENVIRONMENT'])
    expect(result.questionTextRedacted).toBe(true)
    expect(text).not.toMatch(/sensitive fact|sensitive hypothesis|jane@example|sk-secret/)
  })
  it('leaves the verifier decision and response unchanged', async () => {
    const run = () => formulateContextQuestion(input, { authorizeExternalCall: async () => true,
      transport: vi.fn().mockResolvedValueOnce({ question, selectedContextRuleId: input.goal.selectedContextRuleId,
        variantKey: input.goal.variantKey, goalCode: input.goal.code })
        .mockResolvedValueOnce({ ...verdict, evidenceQuotes: ['Hoofdpijn'] }) })
    const before = await run()
    preview(); vi.spyOn(console, 'info').mockImplementation(() => {})
    expect(await run()).toEqual(before)
    expect(before.provenance.reasonCode).toBe('QUESTION_VERIFICATION_REJECTED')
  })
  it('records a denied verifier call without calling or bypassing it', () => {
    preview()
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    tracePreviewQuestionVerification(input, question, null)
    expect(JSON.parse(String(log.mock.calls[0][0])).rejectedChecks).toEqual(['VERIFICATION_NOT_AUTHORIZED'])
  })
  it.each([
    [{ informationNeedPreserved: false }, 'informationNeedPreserved'],
    [{ oneDutchQuestion: false }, 'oneDutchQuestion'],
    [{ unsupportedPresuppositions: ['ASSUMED_CAUSALITY'] }, 'noUnsupportedPresuppositions'],
  ] as const)('identifies an individual semantic rejection %j', (change, failedCheck) => {
    preview()
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    tracePreviewQuestionVerification(input, question, { ...verdict, ...change })
    expect(JSON.parse(String(log.mock.calls[0][0])).rejectedChecks).toEqual([failedCheck])
  })
  it('cannot change application behavior if logging throws', () => {
    preview(); vi.spyOn(console, 'info').mockImplementation(() => { throw new Error('logging unavailable') })
    expect(() => tracePreviewQuestionVerification(input, question, verdict)).not.toThrow()
  })
})
