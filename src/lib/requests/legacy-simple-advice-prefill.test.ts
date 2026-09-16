import { describe, expect, it } from 'vitest'
import type { IntakeQuestionView } from '@/lib/intakes/intake-query-service'
import { legacySimpleAdvicePrefill } from './legacy-simple-advice-prefill'

const question = (key: string, value: string | string[], optionValues: string[] = []): IntakeQuestionView => ({
  id: key, key, category: 'HELP_REQUEST', inputType: 'LONG_TEXT', label: key, helpText: null,
  isRequired: false, minLength: null, maxLength: null, minNumber: null, maxNumber: null,
  minSelections: null, maxSelections: null, value,
  options: optionValues.map(v => ({ id: v, value: v, label: v, isExclusive: false })),
})

describe('legacy → Simple Advice prefill', () => {
  it('behoudt beschrijving en resultaat zonder expertise uit tekst af te leiden', () => {
    const source = { freeText: 'Oorspronkelijke beschrijving over veiligheid', questions: [question('HELP_REQUEST_DESCRIPTION', 'Aangevulde beschrijving'), question('GENERAL_SUPPORT_GOAL', 'Een werkbaar plan'), question('CONFIRMED_HELP_CATEGORY', ['BHV'], ['BHV'])] }
    const before = JSON.stringify(source)
    expect(legacySimpleAdvicePrefill(source)).toMatchObject({ requestDescription: 'Aangevulde beschrijving', desiredOutcome: 'OTHER', desiredOutcomeOther: 'Een werkbaar plan' })
    expect(legacySimpleAdvicePrefill(source)).not.toHaveProperty('requestedExpertise')
    expect(JSON.stringify(source)).toBe(before)
  })
  it.each([['REGISTERED', 'ORGANIZATION'], ['OTHER', 'OTHER_LOCATION'], ['REMOTE', 'REMOTE']])('prefill van locatie %s', (old, current) => {
    expect(legacySimpleAdvicePrefill({ freeText: 'Beschrijving', questions: [question('LOCATION_MODE', [old], [old]), question('REGISTERED_LOCATION', 'location-id'), question('OTHER_LOCATION_CITY', 'Delft')] })).toMatchObject({ workLocationMode: current, organizationLocationId: 'location-id', otherLocationCity: 'Delft' })
  })
  it('v1 hybride en specifieke startdatum blijven behouden', () => {
    expect(legacySimpleAdvicePrefill({ freeText: 'Beschrijving', questions: [question('PREFERRED_WORK_MODE', ['HYBRID'], ['HYBRID']), question('PREFERRED_START_DATE', '2026-12-12')] })).toMatchObject({ workLocationMode: 'COMBINATION', combinationModes: ['ORGANIZATION', 'REMOTE'], desiredStartMode: 'SPECIFIC_DATE', desiredStartDate: '2026-12-12' })
  })
  it('niet-equivalente legacykeuzes blijven onbeslist', () => {
    expect(legacySimpleAdvicePrefill({ freeText: 'Beschrijving', questions: [question('PREFERRED_START', ['NO_PREFERENCE'], ['NO_PREFERENCE']), question('LOCATION_MODE', ['MULTIPLE'], ['MULTIPLE'])] })).toMatchObject({ desiredStartMode: '', workLocationMode: '' })
  })
})
