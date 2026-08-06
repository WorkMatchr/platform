import { describe, expect, it } from 'vitest'
import type { IntakeQuestionView } from '@/lib/intakes/intake-query-service'
import { isCatalogQuestionVisible } from '@/lib/intakes/intake-question-catalog'
import { createIntakeStepAnswerLookup } from './intake-step-form'

const bhvQuestion: IntakeQuestionView = {
  id: '00000000-0000-4000-8000-000000007111',
  key: 'BHV_LOCATION_COUNT',
  category: 'SITUATION',
  inputType: 'NUMBER',
  label: 'Om hoeveel locaties gaat het?',
  helpText: null,
  isRequired: true,
  minLength: null,
  maxLength: null,
  minNumber: '1',
  maxNumber: '10000',
  minSelections: null,
  maxSelections: null,
  options: [],
  value: null,
}

describe('zichtbaarheid van intakestapvragen', () => {
  it('gebruikt de eerder bevestigde BHV-categorie bij een volgende intakestap', () => {
    const lookup = createIntakeStepAnswerLookup(
      [bhvQuestion],
      { CONFIRMED_HELP_CATEGORY: ['BHV'] },
    )

    expect(isCatalogQuestionVisible('BHV_LOCATION_COUNT', lookup, 2)).toBe(true)
  })

  it('maakt zonder bevestigde BHV-categorie geen verborgen vraag zichtbaar', () => {
    const lookup = createIntakeStepAnswerLookup([bhvQuestion], {})

    expect(isCatalogQuestionVisible('BHV_LOCATION_COUNT', lookup, 2)).toBe(false)
  })
})
