import { describe, expect, it, vi } from 'vitest'
import { compatibilityContextGoals } from './context-goal-catalog'
import { formulateContextQuestion, type ContextQuestionFormulationInput } from './context-question-formulator'
import { assessContextQuestionGrounding } from './context-question-grounding'

const ruleId = '11111111-1111-4111-8111-111111111201'
const claimId = '11111111-1111-4111-8111-111111111101'
const fallback = 'Zijn er relevante metingen beschikbaar en zo ja, wat is daarbij onderzocht?'
const input: ContextQuestionFormulationInput = {
  originalInput: 'Wij hebben lawaai bij persen.', facts: [],
  goal: {
    ...compatibilityContextGoals[0], code: 'EXISTING_MEASUREMENTS',
    selectedContextRuleId: ruleId, ruleVersion: 3, variantKey: 'NOISE:MEASUREMENTS',
    relevantConceptCodes: ['NOISE'], supportingKnowledgeIds: [claimId],
    applicability: { requiredAllConceptCodes: ['NOISE'], requiredFactCodes: [], requiredAnyFactCodes: [], excludedFactValues: [] },
    questionGeneration: { contractVersion: 2, informationNeed: 'Beschikbaarheid en omstandigheden van relevante metingen.',
      runtimeQuestionInstructions: 'Vraag naar ontbrekende meetinformatie zonder aan te nemen dat er gemeten is.', neutralFallbackQuestion: fallback },
    text: 'Wanneer zijn de metingen tijdens de lekkages uitgevoerd?',
  },
  evidence: [
    { knowledgeId: ruleId, source: 'PUBLISHED_ROUTING_RULE', topicCode: 'rule', confidence: 1 },
    { knowledgeId: claimId, source: 'PUBLISHED_CLAIM', topicCode: 'noise', confidence: 1 },
  ],
}
const generated = { question: 'Zijn er geluidsmetingen beschikbaar voor de situatie bij de persen?',
  selectedContextRuleId: ruleId, variantKey: input.goal.variantKey, goalCode: input.goal.code }
const verdict = { informationNeedPreserved: true, oneDutchQuestion: true,
  unsupportedPresuppositions: [], supportingFactCodes: [], evidenceQuotes: ['lawaai bij persen'] }

describe('case-bound question formulation', () => {
  it('formuleert en controleert afzonderlijk zonder oude voorbeeldtekst te versturen', async () => {
    const transport = vi.fn().mockResolvedValueOnce(generated).mockResolvedValueOnce(verdict)
    const authorize = vi.fn().mockResolvedValue(true)
    const result = await formulateContextQuestion(input, { transport, authorizeExternalCall: authorize })
    expect(result).toMatchObject({ text: generated.question, provenance: { status: 'VERIFIED' } })
    expect(authorize).toHaveBeenCalledTimes(2)
    expect(transport.mock.calls[0][0].phase).toBe('FORMULATE')
    expect(transport.mock.calls[1][0].phase).toBe('VERIFY')
    expect(JSON.stringify(transport.mock.calls)).not.toContain('lekkages')
    const grounding = assessContextQuestionGrounding({ ...input, formulation: result,
      concepts: [{ code: 'NOISE', confidence: 1, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: [] }] })
    expect(grounding.knowledgeGroundingApplicableToCase).toBe(true)
    expect(assessContextQuestionGrounding({ ...input, formulation: { ...result, text: 'Een andere vraag?' },
      concepts: [{ code: 'NOISE', confidence: 1, source: 'EXPLICIT_INPUT', supportingKnowledgeIds: [] }] })
      .knowledgeGroundingApplicableToCase).toBe(false)
  })

  it.each(['epoxy en huidklachten', 'lawaai bij persen', 'hitte in bakkerij', 'lichaamstrillingen', 'agressie in thuiszorg'])(
    'verwerpt scenario-aannames bij %s', async (originalInput) => {
      const transport = vi.fn().mockResolvedValueOnce({ ...generated, question: 'Wanneer lekten de twaalf installaties op deze afdeling?' })
        .mockResolvedValueOnce({ ...verdict, unsupportedPresuppositions: ['UNSUPPORTED_ENTITY'], evidenceQuotes: [] })
      const result = await formulateContextQuestion({ ...input, originalInput }, { transport, authorizeExternalCall: async () => true })
      expect(result.text).toBe(fallback)
      expect(result.text).not.toMatch(/lekkage|twaalf|afdeling/)
      expect(result.provenance.status).toBe('SAFE_FALLBACK')
    },
  )

  it('weigert een andere variant en roept de verifier niet aan', async () => {
    const transport = vi.fn().mockResolvedValue({ ...generated, variantKey: 'PROCESS:MEASUREMENTS' })
    expect((await formulateContextQuestion(input, { transport, authorizeExternalCall: async () => true })).text).toBe(fallback)
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('weigert verzonnen evidence en nieuwe informatiedoelen', async () => {
    for (const invalid of [{ ...verdict, evidenceQuotes: ['twaalf aannemers'] }, { ...verdict, informationNeedPreserved: false }]) {
      const transport = vi.fn().mockResolvedValueOnce(generated).mockResolvedValueOnce(invalid)
      expect((await formulateContextQuestion(input, { transport, authorizeExternalCall: async () => true })).provenance.status).toBe('SAFE_FALLBACK')
    }
  })

  it('faalt veilig bij timeout en ontbrekende configuratie zonder providerinformatie', async () => {
    const transport = vi.fn().mockRejectedValue(new Error('sensitive provider error'))
    for (const provider of [transport, null]) {
      const result = await formulateContextQuestion(input, { transport: provider, authorizeExternalCall: async () => true })
      expect(result.text).toBe(fallback)
      expect(JSON.stringify(result)).not.toContain('sensitive')
    }
  })

  it('doet geen providerrequest zonder limitergoedkeuring', async () => {
    const transport = vi.fn()
    await formulateContextQuestion(input, { transport, authorizeExternalCall: async () => false })
    expect(transport).not.toHaveBeenCalled()
  })

  it('gebruikt neutrale fallback wanneer de verifier geen limietruimte meer heeft', async () => {
    const transport = vi.fn().mockResolvedValue(generated)
    const authorize = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    expect((await formulateContextQuestion(input, { transport, authorizeExternalCall: authorize })).provenance.reasonCode)
      .toBe('VERIFICATION_NOT_AUTHORIZED')
    expect(transport).toHaveBeenCalledTimes(1)
  })
})
