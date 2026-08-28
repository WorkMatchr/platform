import { describe, expect, it } from 'vitest'
import {
  determineRIEIntent,
  knownRIEContextQuestionKeys,
  selectRIEContextQuestionKeys,
} from './rie-context-profile'

describe('RI&E Context Profile v1', () => {
  it.each([
    ['Wij hebben een RI&E nodig voor ons bedrijf.', 'NEW_RIE'],
    ['Onze RI&E is vier jaar oud en moet worden bijgewerkt.', 'UPDATE_RIE'],
    ['Hebben wij een RI&E nodig?', 'RIE_QUESTION_OR_UNCLEAR'],
    ['Wij hebben veel lawaai in onze werkplaats en weten niet of dit goed in onze RI&E staat.', 'RISK_IN_EXISTING_RIE'],
  ] as const)('herkent voor %s de intentie %s', (input, expected) => {
    expect(determineRIEIntent(input)).toBe(expected)
  })

  it('stelt de onderzoeksvraag nooit bij een nieuwe RI&E', () => {
    expect(selectRIEContextQuestionKeys('Wij hebben een RI&E nodig voor ons bedrijf.')).toEqual([
      'context_employee_count',
      'context_location_count',
      'context_preferred_start',
    ])
    expect(selectRIEContextQuestionKeys('Wij hebben een RI&E nodig voor ons bedrijf.'))
      .not.toContain('context_existing_investigation')
  })

  it('staat de onderzoeksvraag alleen toe voor een concreet risico in een bestaande RI&E', () => {
    expect(selectRIEContextQuestionKeys(
      'Wij hebben veel lawaai in onze werkplaats en weten niet of dit goed in onze RI&E staat.',
    )[0]).toBe('context_existing_investigation')
  })

  it('slaat feiten uit de oorspronkelijke hulpvraag over', () => {
    const input = 'Wij zijn een metaalbedrijf met 85 medewerkers op twee locaties en willen voor het eerst een RI&E laten uitvoeren.'
    const known = knownRIEContextQuestionKeys(input)
    expect(known).toEqual(new Set([
      'context_rie_status',
      'context_employee_count',
      'context_location_count',
      'context_affected_scope',
    ]))
    expect(selectRIEContextQuestionKeys(input)).toEqual(['context_preferred_start'])
  })

  it('vraagt bij actualisatie niet of er al een RI&E bestaat', () => {
    const questions = selectRIEContextQuestionKeys('Onze RI&E is vier jaar oud en moet worden bijgewerkt.')
    expect(questions).not.toContain('context_rie_status')
    expect(questions).not.toContain('context_existing_investigation')
  })
})
