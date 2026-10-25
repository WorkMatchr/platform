import { describe, expect, it } from 'vitest'
import { helpTopicLabels, simpleAdviceRouteSchema, simpleAdviceSchema, simpleAdviceSummary } from './simple-advice-contract'
import { hasTopicSituations, topicSituationOptions, topicSituationsSchema, toggleTopicSituation, type TopicSituations } from './topic-situations'

const selection: TopicSituations = { version: 1, topic: 'EXPOSURE', selected: ['NOISE', 'DUST'], otherText: '' }
const raw = { routeChoice: 'NEEDS_TOPIC', helpTopic: 'EXPOSURE', requestedExpertise: null, requestTitle: 'Onze werkplek', requestDescription: 'Wij zoeken ondersteuning voor onze werkplek.', desiredOutcome: 'ADVICE', workLocationMode: 'REMOTE', desiredStartMode: 'LATER' }
describe('versiegebonden situaties als gebruikerscontext', () => {
  it('dekt exact de bestaande onderwerpen zonder deskundighedentaxonomie', () => {
    expect(Object.keys(topicSituationOptions)).toEqual(Object.keys(helpTopicLabels))
  })
  it.each(Object.keys(topicSituationOptions).filter(hasTopicSituations))('accepteert uitsluitend de eigen inhoudelijke opties van %s', topic => {
    for (const code of [...Object.keys(topicSituationOptions[topic]), 'UNKNOWN', 'OTHER']) {
      expect(simpleAdviceSchema.safeParse({ ...raw, helpTopic: topic, topicSituations: { ...selection, topic, selected: [code], otherText: code === 'OTHER' ? 'Een eigen situatie' : '' } }).success).toBe(true)
    }
  })
  it.each(['OTHER', 'UNKNOWN'])('behoudt de bestaande vrije route voor %s zonder een dubbele onzekerheidsvraag', helpTopic => {
    expect(hasTopicSituations(helpTopic)).toBe(false)
    expect(simpleAdviceSchema.safeParse({ ...raw, helpTopic }).success).toBe(true)
    expect(simpleAdviceSchema.safeParse({ ...raw, helpTopic, topicSituations: { ...selection, topic: helpTopic, selected: ['UNKNOWN'] } }).success).toBe(false)
  })
  it('behoudt één of meerdere keuzes gestructureerd, zonder expertise of gewijzigde omschrijving', () => {
    for (const selected of [['NOISE'], ['NOISE', 'DUST'], ['NOISE', 'OTHER']]) {
      const topicSituations = { ...selection, selected, otherText: selected.includes('OTHER') ? 'Eigen toelichting' : '' }
      const value = simpleAdviceSchema.parse({ ...raw, topicSituations })
      expect(value).toMatchObject({ topicSituations, primaryExpertise: null, additionalExpertises: [], requestDescription: raw.requestDescription })
      expect(simpleAdviceSummary(value).some(([label, content]) => label === 'Herkenbare situaties' && content.includes('Geluid op de werkplek'))).toBe(true)
      expect(JSON.stringify(simpleAdviceSchema.parse(value))).toBe(JSON.stringify(value))
    }
  })
  it('onbekend wist inhoudelijk/Anders; inhoudelijk wist onbekend', () => {
    const unknown = toggleTopicSituation({ ...selection, selected: ['NOISE', 'OTHER'], otherText: 'Eigen' }, 'UNKNOWN')
    expect(unknown).toMatchObject({ selected: ['UNKNOWN'], otherText: '' })
    expect(toggleTopicSituation(unknown, 'DUST').selected).toEqual(['DUST'])
    expect(toggleTopicSituation(selection, 'NOISE').selected).toEqual(['DUST'])
  })
  it.each([
    { ...selection, selected: ['NOISE', 'NOISE'] },
    { ...selection, selected: ['NOISE', 'UNKNOWN'] },
    { ...selection, selected: ['ACTION_PLAN'] },
    { ...selection, selected: ['toString'] },
    { ...selection, selected: ['OTHER'], otherText: ' ' },
    { ...selection, otherText: 'Niet geselecteerd' },
    { ...selection, selected: [] },
    { ...selection, version: 2 },
    { ...selection, topic: 'RIE' },
  ])('weigert ongeldige/tegenstrijdige volledige invoer %j', topicSituations => {
    expect(simpleAdviceSchema.safeParse({ ...raw, topicSituations }).success).toBe(false)
    expect(simpleAdviceRouteSchema.safeParse({ ...raw, topicSituations }).success).toBe(false)
  })
  it('weigert topicdata op directe expertise-route', () => {
    expect(simpleAdviceSchema.safeParse({ ...raw, routeChoice: 'KNOWS_EXPERTISE', requestedExpertise: 'HVK', topicSituations: selection }).success).toBe(false)
  })
  it('leest oude snapshots zonder fictieve antwoorden of aanpassing van historie', () => {
    const value = simpleAdviceSchema.parse(raw)
    expect(value.topicSituations).toBeUndefined()
    expect(JSON.parse(JSON.stringify(value))).not.toHaveProperty('topicSituations')
  })
  it('ondersteunt een nog onvolledig concept, maar geen tegenstrijdige selectie', () => {
    expect(topicSituationsSchema.safeParse({ ...selection, selected: ['OTHER'], otherText: '' }).success).toBe(true)
    expect(topicSituationsSchema.safeParse({ ...selection, selected: ['UNKNOWN', 'OTHER'] }).success).toBe(false)
  })
})
