import { describe, expect, it } from 'vitest'
import { emptyCaseUnderstanding } from '@/lib/ai-intake-classifier/case-understanding-contract'
import { buildNeutralAssignmentSummary } from './case-understanding'

describe('neutrale matching-ready opdrachtsamenvatting', () => {
  it('vertaalt beheerde antwoordcodes naar leesbare bevestigde context', () => {
    const understanding = {
      ...emptyCaseUnderstanding(),
      userGoal: { value: ['Onderzoek naar klachten in een nieuw kantoor.'], evidence: ['onderzoek'], confidence: 1, status: 'EXPLICIT_INPUT' as const },
    }
    const summary = buildNeutralAssignmentSummary(understanding, [
      { code: 'SECTOR', value: 'zakelijke-dienstverlening', status: 'USER_CONFIRMED', confidence: 1 },
      { code: 'EXISTING_ASSESSMENT', value: 'NO', status: 'USER_CONFIRMED', confidence: 1 },
      { code: 'DURATION_FREQUENCY', value: 'REPEATED', status: 'USER_CONFIRMED', confidence: 1 },
    ])

    expect(summary).toContain('Sector: zakelijke dienstverlening.')
    expect(summary).toContain('Is deze situatie al onderzocht of beoordeeld? Nee.')
    expect(summary).toContain('Wanneer of hoe vaak doet de situatie zich tijdens het werk voor? Regelmatig of herhaald.')
    expect(summary).not.toMatch(/\bNO\b|\bREPEATED\b/)
  })
})
