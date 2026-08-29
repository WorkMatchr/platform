import reviewPackage from '../../../data/knowledge/review/case-understanding-10-scenario-review-v1.json'
import { describe, expect, it } from 'vitest'

import { parseCaseUnderstandingKnowledgeReview } from './case-understanding-review-schema'

const expectedInputs = [
  'Sinds we drie maanden geleden naar een nieuw kantoor zijn verhuisd, hebben meerdere medewerkers aan het einde van de middag last van hoofdpijn, droge ogen en vermoeidheid. We weten niet waar het door komt. Kan iemand dit onderzoeken?',
  'In ons magazijn melden steeds meer orderpickers rug- en schouderklachten. We werken met rolcontainers, pallets en handscanners. We willen weten of het werk verkeerd is ingericht en wat we eraan kunnen doen.',
  'Bij het lassen en slijpen in onze werkplaats hangt regelmatig een zichtbare waas in de hal. Er is afzuiging aanwezig, maar medewerkers zeggen dat ze de rook nog steeds ruiken en soms last hebben van hun keel. Hoe kunnen we laten beoordelen of dit veilig is?',
  'We hebben een oude productiemachine aangepast zodat deze sneller kan produceren. Er zijn nieuwe sensoren en een andere besturing geplaatst en een deel van de afscherming is veranderd. Wij weten niet of de machine na deze aanpassing nog veilig gebruikt mag worden. Wie kan dit beoordelen?',
  'Op één afdeling is het ziekteverzuim het afgelopen jaar sterk gestegen. Medewerkers noemen hoge werkdruk, slechte communicatie met de leidinggevende en onderlinge spanningen. We willen laten onderzoeken wat er werkelijk aan de hand is zonder meteen iemand de schuld te geven.',
  'Een medewerker meldt zich de laatste maanden regelmatig één of twee dagen ziek met verschillende klachten. De leidinggevende denkt dat het werk ermee te maken heeft en wil graag weten wat de medewerker precies mankeert. Wat mogen wij als werkgever doen en kan een bedrijfsarts hier onderzoek naar doen?',
  'Een medewerker is na langdurige uitval weer gedeeltelijk aan het werk. De medewerker zegt dat vier uur per dag het maximum is, terwijl de leidinggevende vindt dat zes uur inmiddels mogelijk moet zijn. Wij willen geen medische informatie opvragen, maar wel weten wat verantwoord is. Wie moet dit beoordelen en hoe pakken we dit goed aan?',
  'Wij hebben twee bedrijfslocaties die ongeveer twintig minuten uit elkaar liggen. Op beide locaties wordt in ploegendienst gewerkt, ’s nachts zijn er veel minder mensen aanwezig en op één locatie werken regelmatig mensen alleen. We twijfelen of onze huidige BHV-organisatie voldoende is.',
  'Op onze BRZO/Seveso-locatie wordt tijdens een grote onderhoudsstop gelijktijdig gewerkt door ongeveer 250 eigen medewerkers en medewerkers van twaalf aannemers. Er vinden werkzaamheden plaats aan installaties met brandbare en toxische stoffen, er wordt heetwerk uitgevoerd en delen van de installatie blijven in bedrijf. Iedere aannemer heeft eigen veiligheidsdocumenten. Wij willen weten of de totale risico’s van al deze gelijktijdige werkzaamheden voldoende worden beheerst en wie zo’n integrale beoordeling kan uitvoeren.',
  'In een chemische fabriek zijn de afgelopen maanden meerdere kleine lekkages geweest waarbij medewerkers korte tijd een onbekende geur hebben waargenomen. De metingen achteraf bleven onder de bekende grenswaarden en er zijn geen acute ziektegevallen geweest, maar enkele medewerkers melden hoofdpijn en maken zich zorgen over mogelijke gezondheidseffecten. Tegelijk vermoedt de technische dienst dat de lekkages samenhangen met verouderende procesinstallaties. We willen weten welk onderzoek nodig is en welke deskundigen hierbij betrokken moeten worden.',
]

describe('Case Understanding knowledge-reviewpakket', () => {
  const parsed = parseCaseUnderstandingKnowledgeReview(reviewPackage)

  it('bevat exact de tien vastgestelde scenario’s in de juiste volgorde', () => {
    expect(parsed.scenarios.map((scenario) => scenario.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(parsed.scenarios.map((scenario) => scenario.originalInput)).toEqual(expectedInputs)
  })

  it('houdt alle inhoud en beslissingen voor menselijke review open', () => {
    expect(parsed.schemaVersion).toBe('2.0')
    expect(parsed.reviewStatus).toBe('PENDING_HUMAN_REVIEW')
    expect(parsed.candidateClaims.every((claim) => claim.reviewStatus === 'PENDING_HUMAN_REVIEW')).toBe(true)
    expect(parsed.routingRules.every((rule) => rule.reviewStatus === 'PENDING_HUMAN_REVIEW')).toBe(true)
    expect(parsed.scenarios.every((scenario) => scenario.humanReviewDecision === null)).toBe(true)
    expect(parsed.specialismProposal.reviewStatus).toBe('PENDING_HUMAN_REVIEW')
    expect(parsed.sources.every((source) => source.reviewStatus === 'PENDING_HUMAN_REVIEW')).toBe(true)
    expect(parsed.contextGoals.every((goal) => goal.reviewStatus === 'PENDING_HUMAN_REVIEW')).toBe(true)
    expect(parsed.scenarios.flatMap((scenario) => scenario.questionExamples).every((example) => example.reviewStatus === 'PENDING_HUMAN_REVIEW')).toBe(true)
  })

  it('gebruikt herbruikbare Context Goals en geen onderwerpflows', () => {
    const prohibited = /(?:HEADACHE|BHV|BRZO)_FLOW/
    expect(parsed.contextGoals.some((goal) => prohibited.test(goal.code))).toBe(false)
    expect(parsed.contextGoals.length).toBe(25)
    expect(parsed.contextGoals.map((goal) => goal.code)).toContain('WORK_ENVIRONMENT_FACTORS')
    expect(parsed.scenarios[0].contextGoals).not.toContain('EXPOSURE_SOURCE')
    expect(parsed.scenarios[0].contextGoals).toContain('WORK_ENVIRONMENT_FACTORS')
  })

  it('scheidt medische privacy, procesveiligheid en causaliteit expliciet', () => {
    expect(parsed.scenarios[5].primaryExpertise).toBe('BEDRIJFSARTS')
    expect(parsed.scenarios[6].primaryExpertise).toBe('BEDRIJFSARTS')
    expect(parsed.scenarios[6].multidisciplinary).toBe('CONDITIONAL')
    expect(parsed.scenarios[6].conditionalExpertise).toEqual([
      expect.objectContaining({ discipline: 'ARBEIDSDESKUNDIGE' }),
    ])
    expect(parsed.scenarios[8].primaryExpertise).toBe('PROCESS_SAFETY_MAJOR_HAZARDS')
    expect(parsed.scenarios[9].primaryExpertise).toBe('PROCESS_SAFETY_MAJOR_HAZARDS')
    expect(parsed.scenarios[0].prohibitedAssumptions.join(' ')).toMatch(/oorzaak|veroorzaakt/i)
    expect(parsed.scenarios[9].prohibitedAssumptions.join(' ')).toMatch(/oorzaak|veroorzaakt/i)
  })

  it('markeert de ontbrekende procesveiligheidsbron als kennishiaat', () => {
    const source = parsed.sources.find((item) => item.sourceId === 'process-safety-source-gap')
    expect(source?.governanceStatus).toBe('INSUFFICIENTLY_TRACEABLE')
    expect(parsed.sources).toHaveLength(24)
    expect(parsed.routingRules).toHaveLength(10)
    expect(parsed.candidateClaims).toHaveLength(13)
  })

  it('levert voor ieder resterend Context Goal precies één reviewvraag', () => {
    for (const scenario of parsed.scenarios) {
      expect(scenario.questionExamples.map((example) => example.contextGoal)).toEqual(scenario.contextGoals)
      expect(scenario.questionExamples.every((example) => example.type === 'QUESTION_EXAMPLE_FOR_REVIEW')).toBe(true)
    }
  })

  it('modelleert procesveiligheid als cross-discipline specialisme zonder verplichte HVK-parent', () => {
    expect(parsed.specialismProposal.parentDisciplines).toEqual([])
    expect(parsed.specialismProposal.recommendedModel).toMatch(/cross-discipline/i)
    expect(parsed.specialismProposal.matchingImpact).toMatch(/HVK/i)
  })
})
