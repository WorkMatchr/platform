import { describe, expect, it } from 'vitest'
import {
  PUBLIC_INTAKE_ABANDONMENT_DAYS,
  PUBLIC_INTAKE_COOKIE_NAME,
  PUBLIC_INTAKE_RESUME_DAYS,
  publicIntakeCookieOptions,
  publicIntakeLegacyCookieRemovalOptions,
  publicIntakeCookieRemovalOptions,
  publicIntakeExpiryFrom,
} from './public-intake-config'
import { PublicIntakeServiceError } from './public-intake-errors'
import {
  canAbandonPublicIntakeDraftByUser,
  canChangePublicIntakePhase,
  determinePublicIntakeAbandonment,
  isPublicIntakeResumable,
  isTerminalPublicIntakePhase,
  shouldRecordPublicIntakeResumeEvent,
} from './public-intake-lifecycle'
import { publicIntakeQuestions } from './public-intake-questions'
import {
  generatePublicIntakeToken,
  hashPublicIntakeToken,
  publicIntakeTokenMatches,
} from './public-intake-token'
import {
  normalizePublicIntakeAnswer,
  parseCreatePublicIntakeDraftInput,
} from './public-intake-validation'

describe('publieke conceptintakefundering', () => {
  it('valideert de vrije initiële invoer centraal op 20 tot en met 2.000 tekens', () => {
    expect(() =>
      parseCreatePublicIntakeDraftInput({ entryPoint: 'FREE_TEXT', originalInput: 'te kort' }),
    ).toThrow(PublicIntakeServiceError)
    expect(() =>
      parseCreatePublicIntakeDraftInput({
        entryPoint: 'FREE_TEXT',
        originalInput: 'x'.repeat(2001),
      }),
    ).toThrow(PublicIntakeServiceError)
    expect(
      parseCreatePublicIntakeDraftInput({
        entryPoint: 'FREE_TEXT',
        originalInput: '  Wij willen onze bestaande RI&E laten actualiseren.  ',
      }).originalInput,
    ).toBe('Wij willen onze bestaande RI&E laten actualiseren.')
  })

  it('accepteert uitsluitend de zeven vastgelegde herkenbare ingangen', () => {
    expect(
      parseCreatePublicIntakeDraftInput({
        entryPoint: 'RECOGNIZABLE_REQUEST',
        selectedRequestKey: 'rie_needed',
      }).selectedRequestKey,
    ).toBe('rie_needed')
    expect(() =>
      parseCreatePublicIntakeDraftInput({
        entryPoint: 'RECOGNIZABLE_REQUEST',
        selectedRequestKey: 'onbekende_route',
      }),
    ).toThrow('Kies een geldige hulpvraag.')
  })

  it('accepteert uitsluitend bekende actieve kenniscontexten', () => {
    expect(
      parseCreatePublicIntakeDraftInput({
        entryPoint: 'FREE_TEXT',
        originalInput: 'Wij willen weten wanneer wij een bedrijfsarts moeten inschakelen.',
        knowledgeContextId: 'OCCUPATIONAL_PHYSICIAN',
      }).knowledgeContextId,
    ).toBe('OCCUPATIONAL_PHYSICIAN')

    expect(() =>
      parseCreatePublicIntakeDraftInput({
        entryPoint: 'FREE_TEXT',
        originalInput: 'Wij hebben een inhoudelijke hulpvraag voor onze organisatie.',
        knowledgeContextId: 'GEMANIPULEERDE_CONTEXT',
      }),
    ).toThrow(PublicIntakeServiceError)
  })

  it('weigert onbekende vragen en verkeerde typen', () => {
    expect(() =>
      normalizePublicIntakeAnswer({
        questionKey: 'unknown',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: 'x',
      }),
    ).toThrow('Deze vraag is niet beschikbaar.')
    expect(() =>
      normalizePublicIntakeAnswer({
        questionKey: 'location_count',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: 'anderhalf',
      }),
    ).toThrow('Voer een geldig geheel getal in.')
    expect(
      normalizePublicIntakeAnswer({
        questionKey: 'location_count',
        questionVersion: 1,
        disposition: 'UNKNOWN',
      }).disposition,
    ).toBe('UNKNOWN')
  })

  it('onderscheidt onbekend, bewust overgeslagen en getypeerde waarden', () => {
    expect(
      normalizePublicIntakeAnswer({
        questionKey: 'sector',
        questionVersion: 1,
        disposition: 'UNKNOWN',
      }).disposition,
    ).toBe('UNKNOWN')
    expect(
      normalizePublicIntakeAnswer({
        questionKey: 'preferred_start_period',
        questionVersion: 1,
        disposition: 'SKIPPED',
      }).disposition,
    ).toBe('SKIPPED')
    expect(
      normalizePublicIntakeAnswer({
        questionKey: 'remote_allowed',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: false,
      }).booleanValue,
    ).toBe(false)
  })

  it('valideert kennisgestuurde meerkeuze tegen beheerde semantische codes', () => {
    const managedQuestion = {
      questionKey: 'context_relevant_risks', version: 1, purpose: 'CLARIFICATION' as const,
      answerType: 'MULTI_OPTION' as const, requiredForSubmission: false, canSkip: true,
      decisionPurpose: 'Meerdere relevante contexten gecontroleerd vastleggen.',
      validation: { options: ['NOISE', 'EXPOSURE', 'WORK_PRESSURE'] },
      decision: { enabled: false, required: false, optional: true, dependsOn: [], visibleWhen: [], repeatIfUnknown: false, category: 'SITUATION' as const, order: 100 },
    }
    expect(normalizePublicIntakeAnswer({
      questionKey: managedQuestion.questionKey, questionVersion: 1, disposition: 'ANSWERED',
      value: ['NOISE', 'EXPOSURE'],
    }, managedQuestion).multiOptionValues).toEqual(['NOISE', 'EXPOSURE'])
    expect(() => normalizePublicIntakeAnswer({
      questionKey: managedQuestion.questionKey, questionVersion: 1, disposition: 'ANSWERED',
      value: ['NOISE', 'UNMANAGED'],
    }, managedQuestion)).toThrow('Kies geldige opties.')
  })

  it('valideert de expliciete onderwerpkeuze zonder vrije-tekstclassificatie', () => {
    expect(
      normalizePublicIntakeAnswer({
        questionKey: 'guidance_topic',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: 'HAZARDOUS_SUBSTANCES',
      }).optionValue,
    ).toBe('HAZARDOUS_SUBSTANCES')
    expect(() =>
      normalizePublicIntakeAnswer({
        questionKey: 'guidance_topic',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: 'AUTOMATISCH_GERADEN_ONDERWERP',
      }),
    ).toThrow('Kies een geldige optie.')
  })

  it('definieert versieerbare vragen met doel, type en validatie', () => {
    expect(publicIntakeQuestions.map((question) => question.questionKey)).toEqual(
      expect.arrayContaining([
        'guidance_topic',
        'incident_injury_occurred',
        'hazardous_substances_storage',
        'hazardous_substances_transport',
        'hazardous_substances_loading_unloading',
        'rie_existing_status',
        'employee_count_range',
        'rie_current_age',
        'rie_update_reason',
        'sector',
        'location_count',
        'preferred_start_period',
      ]),
    )
    expect(new Set(publicIntakeQuestions.map((question) => question.questionKey)).size).toBe(
      publicIntakeQuestions.length,
    )
    expect(publicIntakeQuestions.every((question) => question.version > 0 && question.decisionPurpose.length > 10)).toBe(true)
    expect(
      publicIntakeQuestions
        .filter((question) => question.decision.enabled)
        .every(
          (question) =>
            question.decision.required !== question.decision.optional &&
            question.decision.order > 0,
        ),
    ).toBe(true)
  })

  it('maakt tokens met 256 bits entropie en bewaart alleen een verifieerbare hash', () => {
    const first = generatePublicIntakeToken()
    const second = generatePublicIntakeToken()
    const hash = hashPublicIntakeToken(first)
    expect(first).toHaveLength(43)
    expect(second).toHaveLength(43)
    expect(first).not.toBe(second)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).not.toContain(first)
    expect(publicIntakeTokenMatches(first, hash)).toBe(true)
    expect(publicIntakeTokenMatches(second, hash)).toBe(false)
  })

  it('configureert één route-overstijgende HttpOnly-cookie zonder clienttoegang', () => {
    const options = publicIntakeCookieOptions()
    expect(PUBLIC_INTAKE_COOKIE_NAME).toBe('wm_public_intake')
    expect(options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' })
    expect(options.maxAge).toBe(PUBLIC_INTAKE_RESUME_DAYS * 24 * 60 * 60)
    expect(publicIntakeCookieRemovalOptions()).toMatchObject({
      httpOnly: true,
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    })
    expect(publicIntakeLegacyCookieRemovalOptions()).toMatchObject({
      path: '/advieswijzer',
      maxAge: 0,
      expires: new Date(0),
    })
  })

  it('centraliseert 30 dagen abandonment en 90 dagen hervatbaarheid', () => {
    const start = new Date('2026-01-01T00:00:00.000Z')
    expect(PUBLIC_INTAKE_ABANDONMENT_DAYS).toBe(30)
    expect(PUBLIC_INTAKE_RESUME_DAYS).toBe(90)
    expect(determinePublicIntakeAbandonment(start, new Date('2026-01-30T23:59:59.999Z'))).toBe(false)
    expect(determinePublicIntakeAbandonment(start, new Date('2026-01-31T00:00:00.000Z'))).toBe(true)
    const expiresAt = publicIntakeExpiryFrom(start)
    expect(isPublicIntakeResumable(expiresAt, new Date('2026-03-31T23:59:59.999Z'))).toBe(true)
    expect(isPublicIntakeResumable(expiresAt, expiresAt)).toBe(false)
  })

  it('ondersteunt alleen de Werkset 7.1-overgangen en begrenst resume-events', () => {
    expect(canChangePublicIntakePhase('STARTED', 'CLARIFYING')).toBe(true)
    expect(canChangePublicIntakePhase('CLARIFYING', 'SUMMARY_PRESENTED')).toBe(true)
    expect(canChangePublicIntakePhase('STARTED', 'SUBMITTED')).toBe(false)
    expect(shouldRecordPublicIntakeResumeEvent(null, new Date())).toBe(true)
    expect(
      shouldRecordPublicIntakeResumeEvent(
        new Date('2026-01-01T12:00:00.000Z'),
        new Date('2026-01-01T12:14:59.999Z'),
      ),
    ).toBe(false)
  })

  it('begrensd bewuste beëindiging tot actieve pre-submissionfasen', () => {
    for (const phase of [
      'STARTED',
      'CLARIFYING',
      'SUMMARY_PRESENTED',
      'REGISTRATION_STARTED',
    ] as const) {
      expect(canAbandonPublicIntakeDraftByUser(phase)).toBe(true)
    }
    for (const phase of [
      'ACCOUNT_LINKED',
      'SUBMITTED',
      'ABANDONED',
      'ABANDONED_BY_USER',
      'ABANDONED_TIMEOUT',
      'EXPIRED',
    ] as const) {
      expect(canAbandonPublicIntakeDraftByUser(phase)).toBe(false)
    }
    expect(isTerminalPublicIntakePhase('ABANDONED_BY_USER')).toBe(true)
    expect(isTerminalPublicIntakePhase('ABANDONED_TIMEOUT')).toBe(true)
    expect(isTerminalPublicIntakePhase('EXPIRED')).toBe(true)
    expect(canChangePublicIntakePhase('ABANDONED_BY_USER', 'CLARIFYING')).toBe(false)
  })
})
