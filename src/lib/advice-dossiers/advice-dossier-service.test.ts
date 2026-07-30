import { describe, expect, it } from 'vitest'
import { buildPublicIntakeGuidanceHandoff } from '@/lib/public-intake/public-intake-guidance-handoff'
import type {
  PublicIntakeAnswerView,
  PublicIntakeDraftView,
} from '@/lib/public-intake/public-intake-types'
import {
  buildAdviceDossierSnapshot,
  resolveAdviceDossierSituationSummary,
} from './advice-dossier-service'

const originalHelpRequest =
  'Er zijn medewerkers die aangeven dat de BHV-organisatie niet in orde is, maar ik heb tien jaar geleden een EHBO-diploma gehaald.'
const confirmedSummary =
  'U wilt weten of uw oude EHBO-diploma voldoende is voor een actuele en doeltreffende BHV-organisatie.'

function answer(
  questionKey: string,
  answerType: PublicIntakeAnswerView['answerType'],
  value: string | number | boolean,
  source: PublicIntakeAnswerView['source'] = 'USER_INPUT',
): PublicIntakeAnswerView {
  return {
    questionKey,
    questionVersion: 1,
    answerType,
    disposition: 'ANSWERED',
    source,
    version: 1,
    value,
  }
}

function completedDraft(): PublicIntakeDraftView {
  const startedAt = new Date('2026-07-29T12:00:00.000Z')
  const answers = [
    answer(
      'guidance_topic',
      'OPTION',
      'EMERGENCY_RESPONSE',
      'AI_CONFIRMED',
    ),
  ]
  const snapshot = {
    phase: 'CLARIFYING' as const,
    entryPoint: 'FREE_TEXT' as const,
    originalInput: originalHelpRequest,
    selectedRequestKey: null,
    flowVersion: 'public-intake/1.0.0',
    currentStep: null,
    version: 2,
    startedAt,
    lastInteractionAt: startedAt,
    expiresAt: new Date('2026-10-27T12:00:00.000Z'),
    answers,
  }

  return {
    id: '00000000-0000-4000-8000-000000000001',
    ...snapshot,
    guidance: buildPublicIntakeGuidanceHandoff(
      '00000000-0000-4000-8000-000000000001',
      snapshot,
    ),
    aiClassification: {
      summary: confirmedSummary,
      primarySubject: 'EMERGENCY_RESPONSE',
      secondarySubjects: [],
      confidence: 'HIGH',
      alternatives: [],
    },
  }
}

describe('AdviceDossier-snapshotbron', () => {
  it('bewaart de letterlijke hulpvraag en bevestigde interpretatie als afzonderlijke waarden', () => {
    const snapshot = buildAdviceDossierSnapshot(completedDraft())

    expect(snapshot.originalHelpRequest).toBe(originalHelpRequest)
    expect(snapshot.situationSummary).toBe(confirmedSummary)
    expect(snapshot.situationSummary).not.toBe(
      snapshot.originalHelpRequest,
    )
  })

  it('gebruikt zonder bevestigde AI-samenvatting de bestaande gevalideerde M7B-samenvatting', () => {
    const draft = completedDraft()
    const m7bSummary =
      'U wilt uw bedrijfshulpverlening toetsen aan de actuele situatie.'
    const outcome = draft.guidance.outcome!
    const historicalDraft: PublicIntakeDraftView = {
      ...draft,
      aiClassification: null,
      guidance: {
        ...draft.guidance,
        outcome: {
          ...outcome,
          summary: m7bSummary,
          professionalAdvice: {
            ...outcome.professionalAdvice,
            situationSummary: m7bSummary,
          },
        },
      },
    }

    expect(
      resolveAdviceDossierSituationSummary(historicalDraft),
    ).toBe(m7bSummary)
  })

  it('valt alleen als laatste redmiddel terug op de bestaande deterministische outcome', () => {
    const draft = completedDraft()

    expect(
      resolveAdviceDossierSituationSummary({
        ...draft,
        aiClassification: null,
      }),
    ).toBe(draft.guidance.outcome!.professionalAdvice.situationSummary)
  })

  it('neemt alle deskundigheidsprioriteiten op in de immutable snapshot', () => {
    const draft = completedDraft()
    const outcome = draft.guidance.outcome!
    const primary =
      outcome.professionalAdvice.primaryProfessionalRequirement!
    const additional = {
      ...primary,
      id: `${primary.id}:additional`,
      professionalType: 'ARBEIDSHYGIENIST' as const,
      priority: 'ADDITIONAL' as const,
    }
    const possible = {
      ...primary,
      id: `${primary.id}:possible`,
      professionalType: 'MILIEUDESKUNDIGE' as const,
      priority: 'POSSIBLE' as const,
    }
    const snapshot = buildAdviceDossierSnapshot({
      ...draft,
      guidance: {
        ...draft.guidance,
        outcome: {
          ...outcome,
          professionalRequirements: [primary, additional, possible],
          professionalAdvice: {
            ...outcome.professionalAdvice,
            additionalProfessionalRequirements: [additional],
            possibleProfessionalRequirements: [possible],
          },
        },
      },
    })

    expect(snapshot.primaryProfessionalRequirement?.priority).toBe(
      'PRIMARY',
    )
    expect(snapshot.additionalProfessionalRequirements[0]?.priority).toBe(
      'ADDITIONAL',
    )
    expect(snapshot.possibleProfessionalRequirements[0]?.priority).toBe(
      'POSSIBLE',
    )
  })
})
