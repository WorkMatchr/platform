import { describe, expect, it } from 'vitest'
import { emptyCaseUnderstanding } from '@/lib/ai-intake-classifier/case-understanding-contract'
import { buildNeutralAssignmentSummary, caseUnderstandingFacts } from './case-understanding'

describe('neutrale matching-ready opdrachtsamenvatting', () => {
  it('onderdrukt gedeelde vragen wanneer semantische case-elementen die context al bevatten', () => {
    const understanding = {
      ...emptyCaseUnderstanding(),
      activities: { value: ['Lassen en slijpen.'], evidence: ['Bij het lassen en slijpen'], confidence: 1, status: 'EXPLICIT_INPUT' as const },
      peopleAffected: { value: ['Meerdere medewerkers.'], evidence: ['medewerkers'], confidence: 1, status: 'EXPLICIT_INPUT' as const },
      locationContext: { value: ['In de werkplaats.'], evidence: ['in onze werkplaats'], confidence: 1, status: 'EXPLICIT_INPUT' as const },
      timePattern: { value: ['Regelmatig.'], evidence: ['regelmatig'], confidence: 1, status: 'EXPLICIT_INPUT' as const },
    }

    expect(caseUnderstandingFacts(understanding).map((fact) => fact.code)).toEqual(expect.arrayContaining([
      'WORK_ACTIVITY', 'AFFECTED_SCOPE', 'LOCATION_PATTERN', 'DURATION_FREQUENCY',
    ]))
  })

  it('beschouwt betrouwbare procescontext als voldoende werkcontext voor routing', () => {
    const understanding = {
      ...emptyCaseUnderstanding(),
      workContext: {
        value: ['Werkomgeving met procesinstallaties.'],
        evidence: ['chemische fabriek met procesinstallaties'],
        confidence: 0.95,
        status: 'RELIABLE_EXTRACTION' as const,
      },
    }

    expect(caseUnderstandingFacts(understanding)).toContainEqual(expect.objectContaining({
      code: 'WORK_ACTIVITY',
      status: 'RELIABLE_EXTRACTION',
    }))
  })

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

  it('onderdrukt de medische-privacyvraag alleen wanneer de gebruiker die grens al bevestigt', () => {
    const confirmedBoundary = {
      ...emptyCaseUnderstanding(),
      legalOrComplianceContext: {
        value: ['De werkgever wil geen medische informatie opvragen.'],
        evidence: ['Wij willen geen medische informatie opvragen'],
        confidence: 1,
        status: 'EXPLICIT_INPUT' as const,
      },
    }
    const diagnosisRequest = {
      ...emptyCaseUnderstanding(),
      legalOrComplianceContext: {
        value: ['De leidinggevende wil weten wat de medewerker precies mankeert.'],
        evidence: ['wil graag weten wat de medewerker precies mankeert'],
        confidence: 1,
        status: 'EXPLICIT_INPUT' as const,
      },
    }

    expect(caseUnderstandingFacts(confirmedBoundary).map((fact) => fact.code)).toContain('MEDICAL_PRIVACY_BOUNDARY')
    expect(caseUnderstandingFacts(diagnosisRequest).map((fact) => fact.code)).not.toContain('MEDICAL_PRIVACY_BOUNDARY')
  })
})
