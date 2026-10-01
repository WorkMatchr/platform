import { describe, expect, it } from 'vitest'
import { buildC01RieReportSnapshot, evaluateC01Rie, normalizeC01RieAnswers } from '@/lib/compliance/c01-rie-assessment'

describe('C01 RI&E assessment', () => {
  it('normaliseert uitsluitend toegestane vaste antwoordcodes', () => {
    expect(normalizeC01RieAnswers({
      'C01-Q01': 'YES',
      'C01-Q02': 'INVALID',
      extra: 'NO',
    })).toEqual({ 'C01-Q01': 'YES' })
  })

  it('geeft actie vereist wanneer de RI&E ontbreekt', () => {
    const result = evaluateC01Rie({
      'C01-Q01': 'NO',
      'C01-Q02': 'YES',
      'C01-Q03': 'YES',
      'C01-Q04': 'YES',
      'C01-Q05': 'NO',
      'C01-Q06': 'LT_1Y',
      'C01-Q07': 'NOT_APPLICABLE',
      'C01-Q08': 'YES',
      'C01-Q08A': 'NOT_APPLICABLE',
      'C01-Q09': 'YES',
      'C01-Q10': 'YES',
    })

    expect(result.aggregation.assessmentStatus).toBe('ACTION_REQUIRED')
    expect(result.aggregation.priority).toBe('HIGH')
    expect(result.findings.some((finding) => finding.findingCode === 'RIE_MISSING')).toBe(true)
  })

  it('geeft aandacht nodig wanneer actualiteit na wijziging niet is beoordeeld', () => {
    const result = evaluateC01Rie({
      'C01-Q01': 'YES',
      'C01-Q02': 'YES',
      'C01-Q03': 'YES',
      'C01-Q04': 'YES',
      'C01-Q05': 'YES',
      'C01-Q05A': 'NO',
      'C01-Q06': 'Y1_2',
      'C01-Q07': 'YES',
      'C01-Q08': 'YES',
      'C01-Q08A': 'YES',
      'C01-Q09': 'YES',
      'C01-Q10': 'YES',
    })

    expect(result.aggregation.assessmentStatus).toBe('ACTION_REQUIRED')
    expect(result.findings.some((finding) => finding.findingCode === 'RIE_CHANGE_NOT_REVIEWED')).toBe(true)
  })

  it('maakt ouderdom alleen een aandachtssignaal en geen fictieve vervaldatum', () => {
    const result = evaluateC01Rie({
      'C01-Q01': 'YES',
      'C01-Q02': 'YES',
      'C01-Q03': 'YES',
      'C01-Q04': 'YES',
      'C01-Q05': 'NO',
      'C01-Q06': 'GT_5Y',
      'C01-Q07': 'NOT_APPLICABLE',
      'C01-Q08': 'YES',
      'C01-Q08A': 'NOT_APPLICABLE',
      'C01-Q09': 'YES',
      'C01-Q10': 'YES',
    })

    expect(result.aggregation.assessmentStatus).toBe('ATTENTION_REQUIRED')
    expect(result.findings.some((finding) => finding.findingCode === 'RIE_REVIEW_OLD')).toBe(true)
  })

  it('kan volledig op orde beoordelen als alle relevante antwoorden positief zijn', () => {
    const result = evaluateC01Rie({
      'C01-Q01': 'YES',
      'C01-Q02': 'YES',
      'C01-Q03': 'YES',
      'C01-Q04': 'YES',
      'C01-Q05': 'NO',
      'C01-Q06': 'LT_1Y',
      'C01-Q07': 'NOT_APPLICABLE',
      'C01-Q08': 'YES',
      'C01-Q08A': 'NOT_APPLICABLE',
      'C01-Q09': 'YES',
      'C01-Q10': 'YES',
    })

    expect(result.aggregation.assessmentStatus).toBe('IN_ORDER')
    expect(result.findings).toHaveLength(0)
  })

  it('bouwt een reproduceerbare ArboGuide-rapportsnapshot', () => {
    const scannedAt = new Date('2026-10-01T10:00:00.000Z')
    const report = buildC01RieReportSnapshot({
      rawAnswers: {
        'C01-Q01': 'NO',
        'C01-Q02': 'YES',
        'C01-Q03': 'YES',
        'C01-Q04': 'YES',
        'C01-Q05': 'NO',
        'C01-Q06': 'LT_1Y',
        'C01-Q07': 'NOT_APPLICABLE',
        'C01-Q08': 'YES',
        'C01-Q08A': 'NOT_APPLICABLE',
        'C01-Q09': 'YES',
        'C01-Q10': 'YES',
      },
      organizationName: 'Voorbeeld BV',
      scannedAt,
    })

    expect(report.scannedAt).toBe(scannedAt.toISOString())
    expect(report.results[0]?.id).toBe('C01')
    expect(report.results[0]?.status).toBe('ACTION')
    expect(report.sources.map((source) => source.id)).toEqual(['arbowet-current', 'arbeidsinspectie-rie'])
  })
})
