import { describe, expect, it } from 'vitest'
import { getKnowledgeControlRequirement } from './knowledge-control-policy'
import { deterministicKnowledgeSourceControl } from './knowledge-source-control'

describe('risicogestuurde kenniscontrole', () => {
  it('maakt voor geen enkele risicoklasse alleen op basis van risico een menselijke taak', () => {
    expect(getKnowledgeControlRequirement('LOW').humanControlRequiredByRiskAlone).toBe(false)
    expect(getKnowledgeControlRequirement('MEDIUM').humanControlRequiredByRiskAlone).toBe(false)
    expect(getKnowledgeControlRequirement('HIGH').humanControlRequiredByRiskAlone).toBe(false)
    expect(getKnowledgeControlRequirement('CRITICAL')).toMatchObject({
      humanControlRequiredByRiskAlone: false,
      minimumCurrentAuthoritativeSources: 2,
    })
  })

  it('rondt een consistente controle met voldoende bronnen deterministisch af', () => {
    const result = deterministicKnowledgeSourceControl.evaluate({
      risk: 'MEDIUM', currentAuthoritativeSourceFamilies: ['officiele-richtlijn'],
      hasConflict: false, hasOutdatedSource: false, hasUnclearApplicability: false,
    })
    expect(result).toMatchObject({ status: 'CONSISTENT', humanControlRequired: false, reasons: [] })
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.reasons)).toBe(true)
  })

  it('stuurt uitzonderingen fail-closed naar controle', () => {
    expect(deterministicKnowledgeSourceControl.evaluate({
      risk: 'LOW', currentAuthoritativeSourceFamilies: ['bron'], hasConflict: true,
      hasOutdatedSource: false, hasUnclearApplicability: false,
    }).status).toBe('CONFLICT_DETECTED')
    expect(deterministicKnowledgeSourceControl.evaluate({
      risk: 'LOW', currentAuthoritativeSourceFamilies: ['bron'], hasConflict: false,
      hasOutdatedSource: true, hasUnclearApplicability: false,
    }).status).toBe('OUTDATED')
    expect(deterministicKnowledgeSourceControl.evaluate({
      risk: 'LOW', currentAuthoritativeSourceFamilies: ['bron'], hasConflict: false,
      hasOutdatedSource: false, hasUnclearApplicability: true,
    })).toMatchObject({ status: 'HUMAN_EXCEPTION_REQUIRED', humanControlRequired: true })
    expect(deterministicKnowledgeSourceControl.evaluate({
      risk: 'MEDIUM', currentAuthoritativeSourceFamilies: [], hasConflict: false,
      hasOutdatedSource: false, hasUnclearApplicability: false,
    })).toMatchObject({ status: 'SOURCES_REQUIRED', humanControlRequired: true })
  })
})
