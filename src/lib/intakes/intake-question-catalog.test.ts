import { describe, expect, it } from 'vitest'
import {
  getVisibleIntakeCategories,
  getVisibleQuestionKeys,
  isCatalogQuestionActive,
  isCatalogQuestionVisible,
  isReviewQuestionVisible,
} from './intake-question-catalog'

describe('intakevraagcatalogus', () => {
  it('toont BHV-vragen alleen na bevestiging van BHV', () => {
    expect(isCatalogQuestionVisible('BHV_LOCATION_COUNT', new Map())).toBe(false)
    expect(isCatalogQuestionVisible('BHV_LOCATION_COUNT', new Map([['CONFIRMED_HELP_CATEGORY', ['BHV']]]))).toBe(true)
  })

  it('maakt na categoriecorrectie alle primaire verplichte BHV-vragen zichtbaar', () => {
    const answers = new Map([['CONFIRMED_HELP_CATEGORY', ['BHV']]])
    const requiredBhvKeys = [
      'BHV_LOCATION_COUNT',
      'BHV_EMPLOYEE_COUNT',
      'BHV_SHIFT_PATTERN',
      'BHV_EVACUATION_SUPPORT',
      'BHV_EXISTING_STAFF',
      'BHV_SUPPORT_NEEDED',
    ]

    expect([...getVisibleQuestionKeys(requiredBhvKeys, answers, 2)]).toEqual(requiredBhvKeys)
  })

  it('toont planning en de vrije locatielijst niet meer in nieuwe versie-2-intakes', () => {
    expect(isCatalogQuestionVisible('PREFERRED_START', new Map())).toBe(false)
    expect(isCatalogQuestionVisible('PREFERRED_START_DATE', new Map([['PREFERRED_START', ['NO_PREFERENCE']]]))).toBe(false)
    expect(isCatalogQuestionVisible('PREFERRED_START_DATE', new Map([['PREFERRED_START', ['SPECIFIC_DATE']]]))).toBe(false)
    expect(isCatalogQuestionVisible('EXPECTED_ENGAGEMENT_SIZE', new Map())).toBe(false)
    expect(isCatalogQuestionVisible('MULTIPLE_LOCATION_DETAILS', new Map([['LOCATION_MODE', ['MULTIPLE']]]))).toBe(true)
    expect(isCatalogQuestionVisible('OTHER_LOCATION_DETAILS', new Map([['LOCATION_MODE', ['OTHER']]]))).toBe(false)
    expect(isCatalogQuestionActive('GENERAL_SUPPORT_GOAL')).toBe(false)
    expect(isCatalogQuestionVisible('GENERAL_SUPPORT_GOAL', new Map([['CONFIRMED_HELP_CATEGORY', ['RIE']]]))).toBe(false)
  })

  it.each([
    ['REGISTERED', ['LOCATION_MODE', 'REGISTERED_LOCATION']],
    ['OTHER', ['LOCATION_MODE', 'OTHER_LOCATION_CITY']],
    ['MULTIPLE', ['LOCATION_MODE', 'MULTIPLE_LOCATION_DETAILS']],
    ['REMOTE', ['LOCATION_MODE']],
    ['UNKNOWN', ['LOCATION_MODE']],
  ])('toont voor locatievorm %s uitsluitend relevante locatievragen', (mode, expectedKeys) => {
    const questionKeys = [
      'LOCATION_MODE',
      'REGISTERED_LOCATION',
      'OTHER_LOCATION_CITY',
      'OTHER_LOCATION_DETAILS',
      'MULTIPLE_LOCATION_DETAILS',
    ]
    expect([...getVisibleQuestionKeys(questionKeys, new Map([['LOCATION_MODE', [mode]]]))]).toEqual(expectedKeys)
  })

  it('laat een intake zonder categorievragen direct doorstromen naar locatie', () => {
    const categories = getVisibleIntakeCategories([
      { key: 'CONFIRMED_HELP_CATEGORY', category: 'HELP_REQUEST' },
      { key: 'GENERAL_SUPPORT_GOAL', category: 'SITUATION' },
      { key: 'GENERAL_RELEVANT_CONTEXT', category: 'SITUATION' },
      { key: 'LOCATION_MODE', category: 'LOCATION' },
    ], new Map([['CONFIRMED_HELP_CATEGORY', ['MACHINERY_SAFETY']]]), 2)

    expect(categories).toEqual(['HELP_REQUEST', 'LOCATION'])
  })

  it.each(['RIE', 'MACHINERY_SAFETY', 'HAZARDOUS_SUBSTANCES'])(
    'laat een correctie naar %s veilig doorstromen zonder verborgen situatievalidatie',
    (category) => {
      const categories = getVisibleIntakeCategories([
        { key: 'CONFIRMED_HELP_CATEGORY', category: 'HELP_REQUEST' },
        { key: 'BHV_LOCATION_COUNT', category: 'SITUATION' },
        { key: 'GENERAL_SUPPORT_GOAL', category: 'SITUATION' },
        { key: 'LOCATION_MODE', category: 'LOCATION' },
      ], new Map([['CONFIRMED_HELP_CATEGORY', [category]]]), 2)

      expect(categories).toEqual(['HELP_REQUEST', 'LOCATION'])
    },
  )

  it('laat een onbekende historische vraag standaard zichtbaar', () => {
    expect(getVisibleQuestionKeys(['LEGACY_QUESTION'], new Map())).toEqual(new Set(['LEGACY_QUESTION']))
  })

  it('behoudt versie-1-planning en opgeslagen historische versie-2-antwoorden leesbaar', () => {
    expect(isCatalogQuestionVisible('PREFERRED_START', new Map(), 1)).toBe(true)
    expect(isReviewQuestionVisible('PREFERRED_START', new Map(), 2, true)).toBe(true)
    expect(isReviewQuestionVisible('EXPECTED_ENGAGEMENT_SIZE', new Map(), 2, true)).toBe(true)
    expect(isReviewQuestionVisible('GENERAL_SUPPORT_GOAL', new Map(), 2, true)).toBe(true)
    expect(isReviewQuestionVisible('PREFERRED_START', new Map(), 2, false)).toBe(false)
  })
})
