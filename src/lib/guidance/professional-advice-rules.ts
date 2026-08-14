import {
  PROFESSIONAL_ADVICE_SCHEMA_VERSION,
  PROFESSIONAL_REQUIREMENT_SCHEMA_VERSION,
  type GuidanceOutcome,
  type ProfessionalAdvice,
  type ProfessionalAdvicePriority,
  type ProfessionalRequirement,
  type ProfessionalRequirementCriterion,
} from './guidance-domain'
import {
  resolveProfessionalAdviceContext,
  type ProfessionalAdviceContext,
} from './professional-advice-context'
import { hazardousSubstancesContextRules } from './professional-advice-hazardous-substances-rules'
import { professionalAdviceDisciplineRules } from './professional-advice-discipline-rules'
import {
  getProfessionalDiscipline,
  type ProfessionalDisciplineCode,
} from './professional-disciplines'
import {
  confirmedFactMatches,
  physicalWorkloadFactKeys,
} from './confirmed-context'

export const PROFESSIONAL_ADVICE_RULE_SET_VERSION =
  'professional-advice-rules/1.3.0' as const

export const PROFESSIONAL_ADVICE_DISCLAIMER =
  'Dit WorkMatchr Adviesdossier is gebaseerd op de informatie die u heeft verstrekt. Het is bedoeld als eerste advies en als hulpmiddel bij het bepalen van passende vervolgstappen. Een ingeschakelde professional voert altijd een eigen beoordeling uit.' as const

export type RequirementDefinition = Readonly<{
  professionalType: ProfessionalDisciplineCode
  reason: string
  expertise: readonly string[]
  matchingTags?: readonly string[]
  capabilityCodes?: readonly string[]
}>

type ConditionalRequirement = Readonly<{
  factKey: string
  expectedValue: boolean
  definition: RequirementDefinition
}>

export type ProfessionalAdviceRule = Readonly<{
  code: string
  situationCode: string
  adviceTitle: string
  adviceBody: string
  adviceReasons: readonly string[]
  selfActions: readonly string[]
  primary: RequirementDefinition
  additional?: readonly RequirementDefinition[]
  conditionalAdditional?: readonly ConditionalRequirement[]
  possible?: readonly RequirementDefinition[]
  knowledgeContentIds: readonly string[]
  sourceIds: readonly string[]
  textSignals?: readonly string[]
  dominantContexts?: readonly ProfessionalAdviceContext['dominantContext'][]
}>

type ProfessionalAdviceInput = Omit<GuidanceOutcome, 'professionalAdvice'>

const rieAdviceRule: ProfessionalAdviceRule = Object.freeze({
  code: 'PROFESSIONAL_ADVICE_RIE',
  situationCode: 'RIE',
  adviceTitle: 'Breng uw risico’s en maatregelen systematisch in kaart',
  adviceBody:
    'Gebruik de feitelijke werkzaamheden, locaties en medewerkers als basis voor een actuele RI&E en een uitvoerbaar plan van aanpak. Professionele ondersteuning kan passend zijn wanneer kennis, tijd of onafhankelijke beoordeling ontbreekt.',
  adviceReasons: Object.freeze([
    'Een RI&E moet aansluiten op de werkelijke werkzaamheden en risico’s van uw organisatie.',
    'Een concrete opvolging in het plan van aanpak helpt om maatregelen aantoonbaar uit te voeren.',
  ]),
  selfActions: Object.freeze([
    'Beschrijf de werkzaamheden, locaties en groepen medewerkers.',
    'Verzamel bestaande maatregelen, incidenten en signalen van medewerkers.',
    'Controleer of een erkend branche-instrument bij uw situatie past.',
  ]),
  primary: Object.freeze({
    professionalType: 'MIDDELBAAR_VEILIGHEIDSKUNDIGE',
    reason:
      'Een middelbaar veiligheidskundige kan reguliere werkplekrisico’s praktisch inventariseren en vertalen naar uitvoerbare beheersmaatregelen.',
    expertise: Object.freeze(['RI&E', 'Plan van aanpak', 'Risicobeoordeling']),
    matchingTags: Object.freeze([
      'RISK_ASSESSMENT',
      'RISK_ASSESSMENT_EXECUTION',
      'rie',
    ]),
    capabilityCodes: Object.freeze(['RISK_ASSESSMENT']),
  }),
  knowledgeContentIds: Object.freeze(['knowledge:rie-required']),
  sourceIds: Object.freeze([
    'arbowet-current',
    'arbeidsinspectie-rie',
    'rijksoverheid-arbowet',
  ]),
})

const incidentAdviceRule: ProfessionalAdviceRule = Object.freeze({
  code: 'PROFESSIONAL_ADVICE_INCIDENT',
  situationCode: 'INCIDENT',
  adviceTitle: 'Maak de situatie veilig en leg de feiten zorgvuldig vast',
  adviceBody:
    'Zorg eerst voor hulp en voorkom nieuw gevaar. Beoordeel daarna direct of melding nodig is en onderzoek de gebeurtenis proportioneel, zodat oorzaken en verbetermaatregelen navolgbaar worden.',
  adviceReasons: Object.freeze([
    'Hulpverlening en het voorkomen van verder gevaar hebben altijd voorrang.',
    'Een tijdige feitenvastlegging ondersteunt wettelijke beoordeling en leren van het incident.',
  ]),
  selfActions: Object.freeze([
    'Verleen hulp en maak de situatie veilig.',
    'Controleer direct of sprake kan zijn van een meldingsplichtig arbeidsongeval.',
    'Leg feiten vast zonder al schuld of oorzaak toe te wijzen.',
  ]),
  primary: Object.freeze({
    professionalType: 'HOGER_VEILIGHEIDSKUNDIGE',
    reason:
      'Een veiligheidskundige of incidentonderzoeker kan feiten, oorzaken en maatregelen onafhankelijk en systematisch onderzoeken.',
    expertise: Object.freeze([
      'Incidentonderzoek',
      'Veiligheidsadvies',
      'Oorzaakanalyse',
    ]),
    matchingTags: Object.freeze([
      'SAFETY_ADVICE',
      'INCIDENT_INVESTIGATION',
      'veiligheidskundige',
    ]),
    capabilityCodes: Object.freeze([
      'SAFETY_ADVICE',
      'INCIDENT_INVESTIGATION',
    ]),
  }),
  conditionalAdditional: Object.freeze([
    Object.freeze({
      factKey: 'INCIDENT_INJURY_OCCURRED',
      expectedValue: true,
      definition: Object.freeze({
        professionalType: 'BEDRIJFSARTS',
        reason:
          'Bij letsel of gezondheidsgevolgen kan een bedrijfsarts adviseren over de relatie tussen werk en gezondheid, naast noodzakelijke acute zorg.',
        expertise: Object.freeze([
          'Werk en gezondheid',
          'Bedrijfsgezondheidszorg',
        ]),
        matchingTags: Object.freeze([
          'bedrijfsarts',
          'bedrijfsartsregistratie',
        ]),
        capabilityCodes: Object.freeze(['bedrijfsarts']),
      }),
    }),
  ]),
  knowledgeContentIds: Object.freeze([
    'knowledge:accident-reporting',
    'knowledge:incident-investigation',
  ]),
  sourceIds: Object.freeze([
    'arbowet-current',
    'arbeidsinspectie-ongevallen',
  ]),
})

const hazardousSubstancesAdviceRule: ProfessionalAdviceRule = Object.freeze({
  code: 'PROFESSIONAL_ADVICE_HAZARDOUS_SUBSTANCES',
  situationCode: 'HAZARDOUS_SUBSTANCES',
  adviceTitle: 'Beoordeel blootstelling en beheersmaatregelen bij de bron',
  adviceBody:
    'Breng stoffen, taken, duur, hoeveelheden en bestaande maatregelen bijeen. Bepaal daarna welke blootstellingsbeoordeling nodig is en geef maatregelen aan de bron voorrang boven persoonlijke bescherming.',
  adviceReasons: Object.freeze([
    'Veiligheidsinformatie alleen beschrijft nog niet de werkelijke blootstelling tijdens taken.',
    'Opslag, vervoer en laden of lossen kunnen elk andere risico’s en beheersmaatregelen vragen.',
  ]),
  selfActions: Object.freeze([
    'Verzamel veiligheidsinformatiebladen en een actuele stoffenlijst.',
    'Beschrijf taken, hoeveelheden, duur en afwijkende werkzaamheden.',
    'Controleer ventilatie, werkafspraken en bestaande beschermingsmaatregelen.',
  ]),
  primary: Object.freeze({
    professionalType: 'ARBEIDSHYGIENIST',
    reason:
      'Een arbeidshygiënist kan de blootstelling beoordelen en onderbouwen welke bron- en beheersmaatregelen passend zijn.',
    expertise: Object.freeze([
      'Gevaarlijke stoffen',
      'Blootstellingsbeoordeling',
      'Bronaanpak',
    ]),
    matchingTags: Object.freeze([
      'arbeidshygienist',
      'SAFETY_ADVICE',
      'SAFETY_ADVISORY',
    ]),
    capabilityCodes: Object.freeze([
      'SAFETY_ADVICE',
      'SAFETY_ADVISORY',
    ]),
  }),
  knowledgeContentIds: Object.freeze([
    'knowledge:occupational-hygienist',
  ]),
  sourceIds: Object.freeze([
    'arbowet-current',
    'arboportaal-arbobeleid',
    'arbeidsinspectie-rie',
  ]),
})

const occupationalHealthPmoAdviceRule: ProfessionalAdviceRule =
  Object.freeze({
    code: 'PROFESSIONAL_ADVICE_OCCUPATIONAL_HEALTH_PMO',
    situationCode: 'OCCUPATIONAL_HEALTH',
    textSignals: Object.freeze(['pmo', 'pago', 'gezondheidsonderzoek']),
    adviceTitle: 'Bepaal het onderzoeksdoel vanuit de risico’s in het werk',
    adviceBody:
      'Begin bij de actuele RI&E en laat de inhoud van PAGO of PMO aansluiten op de relevante arbeidsrisico’s. Borg vrijwilligheid en medische privacy voordat u een onderzoeksaanbod kiest.',
    adviceReasons: Object.freeze([
      'Niet ieder breed PMO dekt automatisch het arbeidsrisicogerichte doel van PAGO.',
      'De bedrijfsarts adviseert onafhankelijk over inhoud en frequentie van arbeidsgezondheidskundig onderzoek.',
    ]),
    selfActions: Object.freeze([
      'Noteer welke arbeidsrisico’s en groepen in de RI&E aandacht vragen.',
      'Beschrijf het preventieve doel van het onderzoek.',
      'Leg vast hoe vrijwilligheid en vertrouwelijkheid worden geborgd.',
    ]),
    primary: Object.freeze({
      professionalType: 'BEDRIJFSARTS',
      reason:
        'Een bedrijfsarts kan bepalen welke arbeidsgezondheidskundige onderzoeksopzet bij de risico’s en het preventieve doel past.',
      expertise: Object.freeze([
        'PAGO',
        'PMO',
        'Werk en gezondheid',
        'Medische privacy',
      ]),
      matchingTags: Object.freeze([
        'bedrijfsarts',
        'pmo',
        'bedrijfsartsregistratie',
      ]),
      capabilityCodes: Object.freeze(['bedrijfsarts', 'pmo']),
    }),
    knowledgeContentIds: Object.freeze([
      'knowledge:pmo-pago',
      'knowledge:occupational-physician',
    ]),
    sourceIds: Object.freeze([
      'arbowet-current',
      'arboportaal-pago',
      'arboportaal-bedrijfsarts',
    ]),
  })

const occupationalHealthPhysicalAdviceRule: ProfessionalAdviceRule =
  Object.freeze({
    code: 'PROFESSIONAL_ADVICE_OCCUPATIONAL_HEALTH_PHYSICAL',
    situationCode: 'OCCUPATIONAL_HEALTH',
    textSignals: Object.freeze([
      'stoel',
      'vering',
      'rug',
      'fysieke belasting',
      'ergonom',
      'chauffeur',
    ]),
    adviceTitle: 'Onderzoek de fysieke belasting in de werksituatie',
    adviceBody:
      'Beoordeel de werkplek, duur van de belasting, herstelmogelijkheden en signalen van medewerkers in samenhang. Pas niet alleen het hulpmiddel aan, maar controleer ook werkorganisatie en feitelijk gebruik.',
    adviceReasons: Object.freeze([
      'Lichamelijke klachten kunnen samenhangen met meerdere factoren in werkplek en werkorganisatie.',
      'Een beoordeling van de feitelijke werksituatie is nodig voordat een maatregel doelgericht kan worden gekozen.',
    ]),
    selfActions: Object.freeze([
      'Beschrijf de werkhouding, duur, trillingen en herstelmomenten.',
      'Controleer instelling, onderhoud en feitelijk gebruik van stoel en voertuig.',
      'Neem signalen van medewerkers mee zonder medische gegevens vast te leggen.',
    ]),
    primary: Object.freeze({
      professionalType: 'ERGONOOM',
      reason:
        'Een ergonoom kan beoordelen hoeveel kracht medewerkers nodig hebben, hoe werkhouding en werkplekinrichting de fysieke belasting beïnvloeden en welke hulpmiddelen of aanpassingen passend zijn.',
      expertise: Object.freeze([
        'Fysieke belasting',
        'Ergonomie',
        'Werkplekonderzoek',
      ]),
      matchingTags: Object.freeze([
        'arbeidshygienist',
        'arbeidsdeskundige',
        'SAFETY_ADVICE',
      ]),
      capabilityCodes: Object.freeze(['SAFETY_ADVICE']),
    }),
    knowledgeContentIds: Object.freeze([
      'knowledge:occupational-physician',
    ]),
    sourceIds: Object.freeze([
      'arbowet-current',
      'arboportaal-bedrijfsarts',
      'arbeidsinspectie-rie',
    ]),
  })

const occupationalHealthAdviceRule: ProfessionalAdviceRule = Object.freeze({
  code: 'PROFESSIONAL_ADVICE_OCCUPATIONAL_HEALTH',
  situationCode: 'OCCUPATIONAL_HEALTH',
  adviceTitle: 'Breng de relatie tussen werk en gezondheid zorgvuldig in kaart',
  adviceBody:
    'Beschrijf de werkzaamheden, belasting en terugkerende signalen op organisatieniveau. Houd medische gegevens buiten de organisatieanalyse en bepaal welke preventieve beoordeling passend is.',
  adviceReasons: Object.freeze([
    'Gezondheidssignalen vragen om een zorgvuldige scheiding tussen medische beoordeling en werkgeversverantwoordelijkheid.',
    'Niet-medische inzichten kunnen aanleiding zijn om de RI&E en preventieve maatregelen te verbeteren.',
  ]),
  selfActions: Object.freeze([
    'Beschrijf werkzaamheden en belasting zonder diagnoses vast te leggen.',
    'Controleer relevante risico’s en maatregelen in de RI&E.',
    'Maak de preventieve toegang tot de bedrijfsarts duidelijk.',
  ]),
  primary: Object.freeze({
    professionalType: 'BEDRIJFSARTS',
    reason:
      'Een bedrijfsarts kan onafhankelijk adviseren over de relatie tussen werk en gezondheid en bewaakt daarbij het medisch beroepsgeheim.',
    expertise: Object.freeze([
      'Werk en gezondheid',
      'Preventie',
      'Bedrijfsgezondheidszorg',
    ]),
    matchingTags: Object.freeze([
      'bedrijfsarts',
      'bedrijfsartsregistratie',
    ]),
    capabilityCodes: Object.freeze(['bedrijfsarts']),
  }),
  knowledgeContentIds: Object.freeze([
    'knowledge:occupational-physician',
  ]),
  sourceIds: Object.freeze([
    'arbowet-current',
    'arboportaal-bedrijfsarts',
    'arboportaal-basiscontract',
  ]),
})

const emergencyResponseAdviceRule: ProfessionalAdviceRule = Object.freeze({
  code: 'PROFESSIONAL_ADVICE_EMERGENCY_RESPONSE',
  situationCode: 'EMERGENCY_RESPONSE',
  adviceTitle: 'Beoordeel uw BHV-organisatie opnieuw vanuit de actuele risico’s',
  adviceBody:
    'Een oud EHBO-diploma is waardevolle voorkennis, maar toont niet vanzelf aan dat de huidige BHV-organisatie doeltreffend is. Beoordeel taken, bezetting, locaties, middelen, alarmering en oefeningen in samenhang met de actuele RI&E.',
  adviceReasons: Object.freeze([
    'BHV omvat meer dan eerste hulp en moet aansluiten op de risico’s en noodscenario’s van uw organisatie.',
    'Opleiding, beschikbaarheid, middelen en geoefende samenwerking bepalen samen of de organisatie doeltreffend kan handelen.',
  ]),
  selfActions: Object.freeze([
    'Controleer noodscenario’s, locaties, werktijden en feitelijke bezetting.',
    'Leg vast wie eerste hulp, brandbestrijding, evacuatie en alarmering uitvoert.',
    'Controleer opleidingsactualiteit, middelen en de uitkomsten van recente oefeningen.',
  ]),
  primary: Object.freeze({
    professionalType: 'BHV_ADVISEUR',
    reason:
      'Een BHV-adviseur kan de organisatie risicogebaseerd beoordelen en opleiding, bezetting, middelen en oefeningen in samenhang adviseren.',
    expertise: Object.freeze([
      'Bedrijfshulpverlening',
      'Noodscenario’s',
      'Oefenen en evalueren',
    ]),
    matchingTags: Object.freeze([
      'SAFETY_ADVICE',
      'TRAINING',
      'brandveiligheid',
    ]),
    capabilityCodes: Object.freeze(['SAFETY_ADVICE', 'TRAINING']),
  }),
  knowledgeContentIds: Object.freeze(['knowledge:bhv-capacity']),
  sourceIds: Object.freeze([
    'arbowet-current',
    'rijksoverheid-arbowet',
    'arboportaal-arbobeleid',
  ]),
})

const adviceRules = Object.freeze([
  ...professionalAdviceDisciplineRules,
  rieAdviceRule,
  incidentAdviceRule,
  ...hazardousSubstancesContextRules,
  hazardousSubstancesAdviceRule,
  occupationalHealthPmoAdviceRule,
  occupationalHealthPhysicalAdviceRule,
  occupationalHealthAdviceRule,
  emergencyResponseAdviceRule,
])

type PhysicalWorkloadVariant =
  | 'REPETITIVE_WORK'
  | 'LIFTING_CARRYING'
  | 'PUSHING_PULLING'
  | 'PROLONGED_POSTURE'
  | 'VIBRATION'
  | 'GENERAL'

function resolvePhysicalWorkloadVariant(
  outcome: ProfessionalAdviceInput,
): PhysicalWorkloadVariant {
  const facts = outcome.facts
  if (
    confirmedFactMatches(facts, physicalWorkloadFactKeys.physicalLoad, [
      'Repeterend werk',
    ])
  ) return 'REPETITIVE_WORK'
  if (
    confirmedFactMatches(facts, physicalWorkloadFactKeys.physicalLoad, [
      'Tillen of dragen',
    ])
  ) return 'LIFTING_CARRYING'
  if (
    confirmedFactMatches(facts, physicalWorkloadFactKeys.physicalLoad, [
      'Duwen of trekken',
    ])
  ) return 'PUSHING_PULLING'
  if (
    confirmedFactMatches(facts, physicalWorkloadFactKeys.physicalLoad, [
      'Langdurig zitten of staan',
    ])
  ) return 'PROLONGED_POSTURE'
  if (
    confirmedFactMatches(facts, physicalWorkloadFactKeys.physicalLoad, [
      'Trillingen',
    ]) ||
    confirmedFactMatches(facts, physicalWorkloadFactKeys.vibration, [true])
  ) return 'VIBRATION'

  const text = normalizedText(outcome)
  if (/repeter|herhalende beweging/.test(text)) return 'REPETITIVE_WORK'
  if (/tillen|dragen|tilbelasting/.test(text)) return 'LIFTING_CARRYING'
  if (/duwen|trekken|tillift|rolweerstand/.test(text)) return 'PUSHING_PULLING'
  if (/langdurig (zitten|staan)|statische houding/.test(text)) {
    return 'PROLONGED_POSTURE'
  }
  if (/trilling|schokken|vering/.test(text)) return 'VIBRATION'
  return 'GENERAL'
}

const physicalVariantContent: Readonly<
  Record<
    PhysicalWorkloadVariant,
    Pick<
      ProfessionalAdviceRule,
      'adviceTitle' | 'adviceBody' | 'adviceReasons' | 'selfActions'
    >
  >
> = Object.freeze({
  REPETITIVE_WORK: Object.freeze({
    adviceTitle: 'Onderzoek de belasting door repeterend werk',
    adviceBody:
      'Breng de herhaalde bewegingen, taakduur, werktempo, taakafwisseling en herstelmogelijkheden in de feitelijke werksituatie in kaart. Bepaal daarna welke aanpassingen de belasting doelgericht verminderen.',
    adviceReasons: Object.freeze([
      'De belasting door repeterend werk hangt af van de combinatie van herhaling, duur, houding, kracht en herstel.',
      'Een beoordeling van het feitelijke werk is nodig om passende maatregelen te kiezen.',
    ]),
    selfActions: Object.freeze([
      'Leg vast welke bewegingen vaak worden herhaald en hoe lang en hoe vaak dat gebeurt.',
      'Observeer werktempo, taakafwisseling en herstelmogelijkheden tijdens het feitelijke werk.',
      'Betrek signalen van medewerkers zonder medische gegevens vast te leggen.',
    ]),
  }),
  LIFTING_CARRYING: Object.freeze({
    adviceTitle: 'Onderzoek de belasting door tillen en dragen',
    adviceBody:
      'Breng gewichten, tilfrequentie, reikafstanden, werkhoudingen, loopafstanden en beschikbare hulpmiddelen in kaart. Beoordeel daarna welke bronmaatregelen en werkafspraken de belasting verminderen.',
    adviceReasons: Object.freeze([
      'De belasting bij tillen en dragen wordt bepaald door gewicht, frequentie, afstand, houding en herstel.',
      'De feitelijke taak moet worden beoordeeld voordat een hulpmiddel of werkwijze wordt gekozen.',
    ]),
    selfActions: Object.freeze([
      'Noteer gewichten, frequentie, reik- en loopafstanden.',
      'Leg vast welke hulpmiddelen beschikbaar zijn en hoe die feitelijk worden gebruikt.',
      'Observeer belastende houdingen en momenten waarop herstel mogelijk is.',
    ]),
  }),
  PUSHING_PULLING: Object.freeze({
    adviceTitle: 'Onderzoek de belasting door duwen en trekken',
    adviceBody:
      'Breng benodigde kracht, afstanden, routes, ondergrond, bochten, drempels en gebruikte hulpmiddelen in kaart. Beoordeel daarna welke aanpassingen de duw- en trekbelasting verminderen.',
    adviceReasons: Object.freeze([
      'Duw- en trekkrachten worden mede bepaald door rolweerstand, route, ondergrond en beschikbare ruimte.',
      'Hulpmiddelen zijn alleen doeltreffend wanneer werkplek en werkproces erop aansluiten.',
    ]),
    selfActions: Object.freeze([
      'Leg vast welke lasten en hulpmiddelen worden verplaatst en over welke routes.',
      'Noteer drempels, bochten, vloerwisselingen en plekken met weinig ruimte.',
      'Betrek medewerkers bij het vaststellen van de feitelijke belasting.',
    ]),
  }),
  PROLONGED_POSTURE: Object.freeze({
    adviceTitle: 'Onderzoek de belasting door langdurig zitten of staan',
    adviceBody:
      'Breng duur, werkhouding, houdingswisselingen, werkplekinrichting en herstelmogelijkheden in kaart. Bepaal daarna welke afwisseling en aanpassingen de statische belasting verminderen.',
    adviceReasons: Object.freeze([
      'Langdurig dezelfde houding aannemen kan de fysieke belasting vergroten.',
      'Taakafwisseling, inrichting en herstelmogelijkheden moeten in samenhang worden beoordeeld.',
    ]),
    selfActions: Object.freeze([
      'Leg vast hoe lang medewerkers achtereen zitten of staan.',
      'Observeer houdingswisselingen en mogelijkheden om taken af te wisselen.',
      'Controleer of de werkplekinrichting bij de feitelijke werkzaamheden past.',
    ]),
  }),
  VIBRATION: Object.freeze({
    adviceTitle: 'Onderzoek de belasting door trillingen',
    adviceBody:
      'Breng trillingsbronnen, blootstellingsduur, gebruiksomstandigheden en onderhoud in kaart. Beoordeel daarna welke bronmaatregelen en organisatorische maatregelen de blootstelling verminderen.',
    adviceReasons: Object.freeze([
      'De belasting door trillingen hangt af van bron, intensiteit, duur en gebruiksomstandigheden.',
      'Meten of nader beoordelen kan nodig zijn om maatregelen doelgericht te kiezen.',
    ]),
    selfActions: Object.freeze([
      'Leg vast welke machines, hulpmiddelen of werkzaamheden trillingen veroorzaken.',
      'Noteer blootstellingsduur, gebruiksomstandigheden en onderhoudsstaat.',
      'Controleer welke bronmaatregelen en taakafwisseling al worden toegepast.',
    ]),
  }),
  GENERAL: Object.freeze({
    adviceTitle: 'Onderzoek de fysieke belasting in de werksituatie',
    adviceBody:
      'Breng werkzaamheden, houdingen, benodigde kracht, duur, taakafwisseling en herstelmogelijkheden in kaart. Beoordeel daarna welke aanpassingen de fysieke belasting doelgericht verminderen.',
    adviceReasons: Object.freeze([
      'Fysieke belasting wordt bepaald door meerdere factoren in taak en werkorganisatie.',
      'Een beoordeling van het feitelijke werk is nodig voordat maatregelen worden gekozen.',
    ]),
    selfActions: Object.freeze([
      'Beschrijf de belastende werkzaamheden, duur en frequentie.',
      'Observeer werkhoudingen, benodigde kracht en herstelmogelijkheden.',
      'Betrek signalen van medewerkers zonder medische gegevens vast te leggen.',
    ]),
  }),
})

function resolvePhysicalWorkloadRule(
  rule: ProfessionalAdviceRule,
  outcome: ProfessionalAdviceInput,
  context: ProfessionalAdviceContext,
): ProfessionalAdviceRule {
  if (context.dominantContext !== 'ERGONOMICS') return rule

  const variant = resolvePhysicalWorkloadVariant(outcome)
  const content = physicalVariantContent[variant]
  const physicianTriggered = confirmedFactMatches(
    outcome.facts,
    physicalWorkloadFactKeys.occupationalPhysicianRelevant,
    [true],
  )
  const vehicleTriggered =
    confirmedFactMatches(
      outcome.facts,
      physicalWorkloadFactKeys.vehicle,
      [true, 'Voertuigcontext'],
    ) || /voertuig|chauffeur/.test(normalizedText(outcome))

  return Object.freeze({
    ...rule,
    ...content,
    code: `${rule.code}_${variant}`,
    primary: occupationalHealthPhysicalAdviceRule.primary,
    additional: physicianTriggered
      ? Object.freeze([
          Object.freeze({
            professionalType: 'BEDRIJFSARTS',
            reason:
              'De bevestigde context vraagt aanvullend om een onafhankelijke beoordeling van de relatie tussen werk en gezondheid.',
            expertise: Object.freeze([
              'Werk en gezondheid',
              'Bedrijfsgezondheidszorg',
            ]),
          }),
        ])
      : Object.freeze([]),
    conditionalAdditional: Object.freeze([]),
    possible: Object.freeze([]),
    selfActions: vehicleTriggered
      ? Object.freeze([
          ...content.selfActions,
          'Leg vast welk voertuig wordt gebruikt, hoe lang en onder welke omstandigheden.',
        ])
      : content.selfActions,
    knowledgeContentIds: physicianTriggered
      ? Object.freeze(['knowledge:occupational-physician'])
      : Object.freeze([]),
    sourceIds: physicianTriggered
      ? Object.freeze([
          'arbowet-current',
          'arbeidsinspectie-rie',
          'arboportaal-bedrijfsarts',
        ])
      : Object.freeze(['arbowet-current', 'arbeidsinspectie-rie']),
  })
}

function normalizedText(outcome: ProfessionalAdviceInput): string {
  return outcome.helpRequest.originalInput.toLocaleLowerCase('nl-NL')
}

function matchesRule(
  rule: ProfessionalAdviceRule,
  outcome: ProfessionalAdviceInput,
  context: ProfessionalAdviceContext,
): boolean {
  if (rule.situationCode !== outcome.situation.code) return false
  if (
    rule.dominantContexts &&
    !rule.dominantContexts.includes(context.dominantContext)
  ) {
    return false
  }
  if (!rule.textSignals) return true

  const text = normalizedText(outcome)
  return rule.textSignals.some((signal) => text.includes(signal))
}

function criterion(
  definition: RequirementDefinition,
  outcome: ProfessionalAdviceInput,
): ProfessionalRequirementCriterion {
  const discipline = getProfessionalDiscipline(
    definition.professionalType,
  )

  return Object.freeze({
    code: `CAPABILITY_${definition.professionalType}`,
    kind: 'CAPABILITY',
    priority: 'REQUIRED',
    valueCodes: Object.freeze([...discipline.capabilityCodes]),
    provenance: outcome.professionalSupportNeed.provenance,
  })
}

function requirement(
  definition: RequirementDefinition,
  priority: ProfessionalAdvicePriority,
  outcome: ProfessionalAdviceInput,
  index: number,
): ProfessionalRequirement {
  const discipline = getProfessionalDiscipline(
    definition.professionalType,
  )

  return Object.freeze({
    schemaVersion: PROFESSIONAL_REQUIREMENT_SCHEMA_VERSION,
    id: `professional-requirement:${outcome.id}:${priority.toLocaleLowerCase('en-US')}:${index}`,
    version: 1,
    guidanceOutcomeId: outcome.id,
    professionalSupportNeedId: outcome.professionalSupportNeed.id,
    status: 'DRAFT',
    professionalType: definition.professionalType,
    priority,
    reason: definition.reason,
    expertise: Object.freeze([...definition.expertise]),
    matchingTags: Object.freeze([...discipline.matchingTags]),
    criteria: Object.freeze([criterion(definition, outcome)]),
    createdAt: outcome.createdAt,
    confirmation: Object.freeze({ status: 'UNCONFIRMED' }),
    checksum: null,
  })
}

function factMatches(
  outcome: ProfessionalAdviceInput,
  condition: ConditionalRequirement,
): boolean {
  return outcome.facts.some(
    (fact) =>
      fact.key === condition.factKey &&
      fact.status === 'CONFIRMED' &&
      fact.value === condition.expectedValue,
  )
}

function specificAdvice(
  rule: ProfessionalAdviceRule,
  outcome: ProfessionalAdviceInput,
  context: ProfessionalAdviceContext,
): ProfessionalAdvice {
  const resolvedRule = resolvePhysicalWorkloadRule(rule, outcome, context)
  const primary = requirement(resolvedRule.primary, 'PRIMARY', outcome, 0)
  const seenDisciplines = new Set<ProfessionalDisciplineCode>([
    resolvedRule.primary.professionalType,
  ])
  const uniqueDefinitions = (
    definitions: readonly RequirementDefinition[],
    maximum: number,
  ) =>
    definitions
      .filter((definition) => {
        if (seenDisciplines.has(definition.professionalType)) return false
        seenDisciplines.add(definition.professionalType)
        return true
      })
      .slice(0, maximum)
  const additionalDefinitions = uniqueDefinitions([
    ...(resolvedRule.additional ?? []),
    ...(resolvedRule.conditionalAdditional ?? [])
      .filter((condition) => factMatches(outcome, condition))
      .map((condition) => condition.definition),
  ], 2)
  const additional = additionalDefinitions.map((definition, index) =>
    requirement(definition, 'ADDITIONAL', outcome, index),
  )
  const possible = uniqueDefinitions(resolvedRule.possible ?? [], 2).map(
    (definition, index) =>
      requirement(definition, 'POSSIBLE', outcome, index),
  )

  return Object.freeze({
    schemaVersion: PROFESSIONAL_ADVICE_SCHEMA_VERSION,
    ruleSetVersion: PROFESSIONAL_ADVICE_RULE_SET_VERSION,
    appliedRuleCode: resolvedRule.code,
    situationSummary: outcome.summary,
    adviceTitle: resolvedRule.adviceTitle,
    adviceBody: resolvedRule.adviceBody,
    adviceReasons: Object.freeze([...resolvedRule.adviceReasons]),
    selfActions: Object.freeze([...resolvedRule.selfActions]),
    dominantContext: context.dominantContext,
    relevantRiskDomains: Object.freeze([
      ...context.relevantRiskDomains,
    ]),
    primaryProfessionalRequirement: primary,
    additionalProfessionalRequirements: Object.freeze(additional),
    possibleProfessionalRequirements: Object.freeze(possible),
    knowledgeReferences: Object.freeze(
      resolvedRule.knowledgeContentIds.map((contentId) =>
        Object.freeze({ contentId }),
      ),
    ),
    sourceReferences: Object.freeze(
      resolvedRule.sourceIds.map((sourceId) =>
        Object.freeze({ sourceId }),
      ),
    ),
    disclaimer: PROFESSIONAL_ADVICE_DISCLAIMER,
    outcomeSpecificity: 'SPECIFIC',
  })
}

export function buildProfessionalAdvice(
  outcome: ProfessionalAdviceInput,
): ProfessionalAdvice {
  const context = resolveProfessionalAdviceContext(outcome)
  const rule = adviceRules.find((candidate) =>
    matchesRule(candidate, outcome, context),
  )

  if (rule) return specificAdvice(rule, outcome, context)

  return buildSafeFallbackProfessionalAdvice(outcome, context)
}

export function buildSafeFallbackProfessionalAdvice(
  outcome: ProfessionalAdviceInput,
  context: ProfessionalAdviceContext =
    resolveProfessionalAdviceContext(outcome),
): ProfessionalAdvice {
  return Object.freeze({
    schemaVersion: PROFESSIONAL_ADVICE_SCHEMA_VERSION,
    ruleSetVersion: PROFESSIONAL_ADVICE_RULE_SET_VERSION,
    appliedRuleCode: 'PROFESSIONAL_ADVICE_SAFE_FALLBACK',
    situationSummary: outcome.summary,
    adviceTitle: 'Breng uw situatie eerst verder in kaart',
    adviceBody:
      'Op basis van de beschikbare informatie kunnen wij nog geen specifiek advies geven. Verzamel de belangrijkste feiten en onzekerheden voordat u een vervolgstap kiest.',
    adviceReasons: Object.freeze([
      'De hulpvraag bevat nog onvoldoende bevestigde informatie voor een specifieke richting.',
    ]),
    selfActions: Object.freeze([
      'Noteer wat er gebeurt, wie ermee te maken heeft en wat al bekend is.',
      'Leg vast welke informatie nog ontbreekt of onzeker is.',
    ]),
    dominantContext: context.dominantContext,
    relevantRiskDomains: Object.freeze([
      ...context.relevantRiskDomains,
    ]),
    primaryProfessionalRequirement: null,
    additionalProfessionalRequirements: Object.freeze([]),
    possibleProfessionalRequirements: Object.freeze([]),
    knowledgeReferences: Object.freeze([]),
    sourceReferences: Object.freeze([]),
    disclaimer: PROFESSIONAL_ADVICE_DISCLAIMER,
    outcomeSpecificity: 'SAFE_FALLBACK',
  })
}
