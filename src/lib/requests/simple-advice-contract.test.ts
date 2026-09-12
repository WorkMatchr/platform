import { describe, expect, it } from 'vitest'
import { simpleAdviceSchema, requestedExpertiseOptions, helpTopicLabels, startLabels, simpleAdviceSummary } from './simple-advice-contract'

export const simpleInput = { routeChoice: 'KNOWS_EXPERTISE', requestedExpertise: 'HVK', requestTitle: 'Veilig werken', requestDescription: 'Wij zoeken hulp bij veilig werken op onze locatie.', desiredOutcome: 'ADVICE', workLocationMode: 'REMOTE', desiredStartMode: 'AS_SOON_AS_POSSIBLE' }
describe('Eenvoudige Advieswijzer contract', () => {
  it.each(requestedExpertiseOptions.map(o => o.value))('accepteert bestaande deskundigheid %s zonder AI', requestedExpertise => {
    expect(simpleAdviceSchema.parse({ ...simpleInput, requestedExpertise }).requestedExpertise).toBe(requestedExpertise)
  })
  it.each(Object.keys(helpTopicLabels))('publiceerbaar onderwerp %s zonder expertise', helpTopic => {
    const parsed = simpleAdviceSchema.parse({ ...simpleInput, routeChoice: 'NEEDS_TOPIC', helpTopic })
    expect(parsed.requestedExpertise).toBeNull()
    expect(parsed.helpTopic).toBe(helpTopic)
  })
  it('vereist expertise voor A en onderwerp voor B', () => {
    expect(simpleAdviceSchema.safeParse({ ...simpleInput, requestedExpertise: null }).success).toBe(false)
    expect(simpleAdviceSchema.safeParse({ ...simpleInput, routeChoice: 'NEEDS_TOPIC' }).success).toBe(false)
  })
  it('verwijdert onverenigbare verborgen keuzes', () => {
    expect(simpleAdviceSchema.parse({ ...simpleInput, helpTopic: 'OTHER', helpTopicOther: 'oud', otherLocationCity: 'oud', desiredStartDate: '2026-10-01' })).toMatchObject({ helpTopic: null, helpTopicOther: '', otherLocationCity: '', desiredStartDate: '' })
  })
  it('behoudt optionele toelichting bij onderwerp Anders', () => {
    expect(simpleAdviceSchema.parse({ ...simpleInput, routeChoice: 'NEEDS_TOPIC', helpTopic: 'OTHER', helpTopicOther: 'Een andere vraag' }).helpTopicOther).toBe('Een andere vraag')
  })
  it('vereist toelichting bij gewenst resultaat Anders', () => {
    expect(simpleAdviceSchema.safeParse({ ...simpleInput, desiredOutcome: 'OTHER' }).success).toBe(false)
  })
  it.each(['ORGANIZATION', 'REMOTE', 'OTHER_LOCATION', 'COMBINATION'])('ondersteunt locatie %s', workLocationMode => {
    expect(simpleAdviceSchema.safeParse({ ...simpleInput, workLocationMode, otherLocationCity: 'Utrecht', combinationModes: ['OTHER_LOCATION', 'REMOTE'] }).success).toBe(true)
  })
  it.each(['OTHER_LOCATION', 'COMBINATION'])('vereist plaats voor %s', workLocationMode => {
    expect(simpleAdviceSchema.safeParse({ ...simpleInput, workLocationMode, combinationModes: ['OTHER_LOCATION', 'REMOTE'] }).success).toBe(false)
  })
  it('vereist twee verschillende combinatiemodi', () => {
    expect(simpleAdviceSchema.safeParse({ ...simpleInput, workLocationMode: 'COMBINATION', combinationModes: ['REMOTE', 'REMOTE'] }).success).toBe(false)
  })
  it.each(Object.keys(startLabels))('ondersteunt start %s', desiredStartMode => {
    expect(simpleAdviceSchema.safeParse({ ...simpleInput, desiredStartMode, desiredStartDate: '2026-10-12' }).success).toBe(true)
  })
  it.each(['', '2026-02-30', 'geen datum'])('weigert ongeldige specifieke datum %s', desiredStartDate => {
    expect(simpleAdviceSchema.safeParse({ ...simpleInput, desiredStartMode: 'SPECIFIC_DATE', desiredStartDate }).success).toBe(false)
  })
  it('toont controle vanuit exact de gevalideerde invoer', () => {
    const value = simpleAdviceSchema.parse(simpleInput)
    expect(simpleAdviceSummary(value)).toContainEqual(['Beschrijving', simpleInput.requestDescription])
  })
})
