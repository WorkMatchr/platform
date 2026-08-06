import { describe, expect, it } from 'vitest'
import {
  findIntakeClassificationClarificationSet,
  getIntakeClassificationClarificationSet,
  resolveIntakeClassificationClarification,
} from './intake-classification-clarifications'

describe('intake-classificatieverduidelijkingen', () => {
  it('vindt de actieve, versieerbare keukenset op context', () => {
    const set = findIntakeClassificationClarificationSet('Hoe kunnen wij veilig werken in een horecakeuken?', 'LOW')

    expect(set).toMatchObject({
      id: 'WORKPLACE_CONTEXT_KITCHEN_V2',
      version: 2,
      active: true,
      priority: 110,
      question: 'Waar gaat uw vraag vooral over?',
    })
    expect(Object.isFrozen(set)).toBe(true)
  })

  it.each([
    ['KITCHEN_V2_EQUIPMENT', 'MACHINERY_SAFETY'],
    ['KITCHEN_V2_CUTTING_EQUIPMENT', 'MACHINERY_SAFETY'],
    ['KITCHEN_V2_HEAT_BURNS', 'RIE'],
    ['KITCHEN_V2_FIRE_EVACUATION', 'BHV'],
    ['KITCHEN_V2_CHEMICALS', 'HAZARDOUS_SUBSTANCES'],
    ['KITCHEN_V2_PHYSICAL_LOAD', 'ERGONOMICS'],
    ['KITCHEN_V2_GENERAL_SAFETY', 'RIE'],
    ['KITCHEN_V2_NOT_SURE', null],
  ] as const)('mapt %s centraal naar %s', (optionId, category) => {
    expect(resolveIntakeClassificationClarification('WORKPLACE_CONTEXT_KITCHEN_V2', optionId)?.category).toBe(category)
  })

  it('mapt hitte en brandwonden niet naar BHV', () => {
    expect(resolveIntakeClassificationClarification('WORKPLACE_CONTEXT_KITCHEN_V2', 'KITCHEN_V2_HEAT_BURNS')?.category)
      .not.toBe('BHV')
  })

  it('houdt historische V1-antwoorden uitleesbaar zonder V1 opnieuw te activeren', () => {
    expect(getIntakeClassificationClarificationSet('WORKPLACE_CONTEXT_KITCHEN_V1')?.active).toBe(false)
    expect(resolveIntakeClassificationClarification('WORKPLACE_CONTEXT_KITCHEN_V1', 'KITCHEN_CUT_HEAT_FIRE'))
      .toMatchObject({ category: 'BHV' })
  })

  it('weigert onbekende set- en antwoord-ID’s', () => {
    expect(getIntakeClassificationClarificationSet('UNKNOWN_SET')).toBeUndefined()
    expect(resolveIntakeClassificationClarification('WORKPLACE_CONTEXT_KITCHEN_V2', 'MANIPULATED')).toBeUndefined()
  })

  it('activeert nog geen toekomstige context zonder configuratie', () => {
    expect(findIntakeClassificationClarificationSet('Hoe werken wij veilig in een magazijn?', 'LOW')).toBeUndefined()
  })
})
