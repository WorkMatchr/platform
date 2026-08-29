import { describe, expect, it } from 'vitest'
import {
  GUIDANCE_CONTRACT_SCHEMA_VERSION,
  type GuidanceContract,
} from '@/lib/guidance/guidance-contract'
import { guidanceEngine } from '@/lib/guidance/guidance-engine'
import { presentPublicIntakeGuidance } from './public-intake-guidance-presentation'

const provenance = { sources: [], rules: [] } as const

function ergonomicsContract(): GuidanceContract {
  const helpRequest =
    'Zijn er richtlijnen voor vloeren in een verzorgingstehuis om er met een tillift overheen te rijden?'
  return {
    schemaVersion: GUIDANCE_CONTRACT_SCHEMA_VERSION,
    id: 'contract:m7b2:ergonomics',
    version: 1,
    source: {
      kind: 'PUBLIC_INTAKE_DRAFT',
      referenceId: 'm7b2-presentation-test',
      version: '1',
    },
    questionSetVersion: 'public-intake/1.0.0',
    situation: {
      code: 'OCCUPATIONAL_HEALTH',
      description: helpRequest,
      provenance,
    },
    helpRequest: {
      originalInput: helpRequest,
      confirmedDescription: null,
      confirmation: { status: 'UNCONFIRMED' },
    },
    facts: [],
    uncertainties: [],
    createdAt: '2026-07-30T12:00:00.000Z',
  }
}

describe('centrale vakdisciplinelabels', () => {
  it('presenteert dezelfde concrete disciplines en capabilitycodes voor downstream snapshots', () => {
    const presentation = presentPublicIntakeGuidance(
      guidanceEngine.evaluate(ergonomicsContract()),
    )

    expect(presentation.primaryProfessionalRequirement).toMatchObject({
      label: 'Ergonoom',
      priority: 'PRIMARY',
      capabilityCodes: ['ergonoom'],
    })
    // Keep this downstream presentation assertion aligned with the canonical
    // guidance-engine regression: the described tillift question routes to an
    // ergonomist only unless the user provides additional context.
    expect(presentation.additionalProfessionalRequirements).toEqual([])
    expect(presentation.possibleProfessionalRequirements).toEqual([])
    expect(JSON.stringify(presentation)).not.toMatch(/RI&E-deskundige/i)
  })
})
