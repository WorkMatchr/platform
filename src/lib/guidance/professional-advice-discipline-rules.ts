import type { ProfessionalAdviceRule } from './professional-advice-rules'

const commonSources = Object.freeze([
  'arbowet-current',
  'arboportaal-arbobeleid',
  'arbeidsinspectie-rie',
])

function ergonomicsRule(situationCode: string): ProfessionalAdviceRule {
  return Object.freeze({
    code: `PROFESSIONAL_ADVICE_${situationCode}_ERGONOMICS`,
    situationCode,
    dominantContexts: Object.freeze(['ERGONOMICS'] as const),
    adviceTitle: 'Beoordeel fysieke belasting en werkplekinrichting in samenhang',
    adviceBody:
      'Breng de feitelijke bewegingen, benodigde kracht, ondergrond, looproutes, hulpmiddelen en beschikbare ruimte in kaart. Beoordeel daarna welke aanpassingen de fysieke belasting verminderen en veilig werken ondersteunen.',
    adviceReasons: Object.freeze([
      'Duw- en trekkrachten worden mede bepaald door rolweerstand, drempels, bochten, hellingen en beschikbare ruimte.',
      'Een tillift of ander hulpmiddel werkt alleen doeltreffend wanneer vloer, route, werkplek en werkproces daarop aansluiten.',
    ]),
    selfActions: Object.freeze([
      'Leg vast welke hulpmiddelen worden gebruikt en op welke routes.',
      'Noteer drempels, bochten, vloerwisselingen en plekken met weinig ruimte.',
      'Betrek medewerkers bij het vaststellen van feitelijke belasting en knelpunten.',
    ]),
    primary: Object.freeze({
      professionalType: 'ERGONOOM',
      reason:
        'Een ergonoom kan beoordelen hoeveel kracht medewerkers nodig hebben om een tillift of ander hulpmiddel te verplaatsen en hoe rolweerstand, begaanbaarheid, drempels, looproutes en werkplekinrichting de fysieke belasting en veilige uitvoering beïnvloeden.',
      expertise: Object.freeze([
        'Fysieke belasting',
        'Duw- en trekkrachten',
        'Rolweerstand en begaanbaarheid',
        'Hulpmiddelen en werkplekinrichting',
      ]),
    }),
    additional: Object.freeze([
      Object.freeze({
        professionalType: 'ARBEIDSDESKUNDIGE',
        reason:
          'Een arbeidsdeskundige kan aanvullend beoordelen hoe hulpmiddelenkeuze, taakbelasting en het werkproces aansluiten op duurzame inzetbaarheid.',
        expertise: Object.freeze([
          'Taakbelasting',
          'Werkproces',
          'Duurzame inzetbaarheid',
        ]),
      }),
    ]),
    possible: Object.freeze([
      Object.freeze({
        professionalType: 'HOGER_VEILIGHEIDSKUNDIGE',
        reason:
          'Een hoger veiligheidskundige kan mogelijk nodig zijn wanneer ook val- of botsgevaar, vluchtroutes of een complexe veiligheidsinrichting spelen.',
        expertise: Object.freeze([
          'Werkplekveiligheid',
          'Loop- en vluchtroutes',
          'Complexe veiligheidsinrichting',
        ]),
      }),
    ]),
    knowledgeContentIds: Object.freeze([]),
    sourceIds: commonSources,
  })
}

function ruleForSituation(
  code: string,
  situationCode: string,
  dominantContext: NonNullable<
    ProfessionalAdviceRule['dominantContexts']
  >[number],
  primary: ProfessionalAdviceRule['primary'],
  additional: ProfessionalAdviceRule['additional'] = [],
  possible: ProfessionalAdviceRule['possible'] = [],
): ProfessionalAdviceRule {
  return Object.freeze({
    code,
    situationCode,
    dominantContexts: Object.freeze([dominantContext]),
    adviceTitle: 'Kies deskundigheid die bij het concrete vraagstuk past',
    adviceBody:
      'De aard en complexiteit van het vraagstuk bepalen welke vakdiscipline passend is. De aanbevolen deskundigheid is gebaseerd op de bevestigde context en vervangt geen eigen beoordeling door de professional.',
    adviceReasons: Object.freeze([
      'Een concrete vakdiscipline maakt duidelijk welke aantoonbare kennis voor deze situatie relevant is.',
    ]),
    selfActions: Object.freeze([
      'Leg de feitelijke situatie, betrokken werkzaamheden en bestaande maatregelen vast.',
    ]),
    primary,
    additional: Object.freeze([...additional]),
    possible: Object.freeze([...possible]),
    knowledgeContentIds: Object.freeze([]),
    sourceIds: commonSources,
  })
}

const higherSafety = Object.freeze({
  professionalType: 'HOGER_VEILIGHEIDSKUNDIGE' as const,
  reason:
    'Een hoger veiligheidskundige kan complexe technische, organisatorische en wettelijke veiligheidsaspecten in samenhang beoordelen.',
  expertise: Object.freeze([
    'Complexe veiligheidsrisico’s',
    'Technische en organisatorische maatregelen',
    'Multidisciplinaire beoordeling',
  ]),
})

const occupationalPhysician = Object.freeze({
  professionalType: 'BEDRIJFSARTS' as const,
  reason:
    'Een bedrijfsarts kan mogelijk aanvullend adviseren over de relatie tussen werk en gezondheid, met behoud van medisch beroepsgeheim.',
  expertise: Object.freeze(['Werk en gezondheid', 'Medische beoordeling']),
})

export const professionalAdviceDisciplineRules = Object.freeze([
  ergonomicsRule('OCCUPATIONAL_HEALTH'),
  ergonomicsRule('RIE'),
  ruleForSituation(
    'PROFESSIONAL_ADVICE_RIE_MACHINE_SAFETY',
    'RIE',
    'MACHINE_SAFETY',
    Object.freeze({
      professionalType: 'MACHINEVEILIGHEIDSDESKUNDIGE',
      reason:
        'Een machineveiligheidsdeskundige kan beveiligingen, technische documentatie, CE-verplichtingen en veilig gebruik van het arbeidsmiddel beoordelen.',
      expertise: Object.freeze([
        'Machineveiligheid',
        'CE-documentatie',
        'Risicobeoordeling arbeidsmiddelen',
      ]),
    }),
    Object.freeze([higherSafety]),
  ),
  ruleForSituation(
    'PROFESSIONAL_ADVICE_OCCUPATIONAL_HEALTH_PSA',
    'OCCUPATIONAL_HEALTH',
    'PSYCHOSOCIAL_WORKLOAD',
    Object.freeze({
      professionalType: 'ARBEIDS_EN_ORGANISATIEDESKUNDIGE',
      reason:
        'Een arbeids- en organisatiedeskundige kan oorzaken van werkdruk en ongewenst gedrag in werkorganisatie, leiderschap en sociale veiligheid onderzoeken.',
      expertise: Object.freeze([
        'Psychosociale arbeidsbelasting',
        'Werkdruk',
        'Sociale veiligheid',
      ]),
    }),
    [],
    Object.freeze([occupationalPhysician]),
  ),
  ruleForSituation(
    'PROFESSIONAL_ADVICE_OCCUPATIONAL_HEALTH_WORK_ABILITY',
    'OCCUPATIONAL_HEALTH',
    'WORK_ABILITY',
    Object.freeze({
      professionalType: 'ARBEIDSDESKUNDIGE',
      reason:
        'Een arbeidsdeskundige kan belasting, belastbaarheid en passende werkzaamheden vertalen naar een uitvoerbaar re-integratie- of inzetbaarheidsadvies.',
      expertise: Object.freeze([
        'Belasting en belastbaarheid',
        'Passende werkzaamheden',
        'Re-integratie',
      ]),
    }),
    Object.freeze([occupationalPhysician]),
  ),
  ruleForSituation(
    'PROFESSIONAL_ADVICE_RIE_ASBEST',
    'RIE',
    'ASBEST',
    Object.freeze({
      professionalType: 'ASBESTDESKUNDIGE',
      reason:
        'Een asbestdeskundige kan asbestverdachte toepassingen en de noodzakelijke inventarisatie- en beheersstappen beoordelen.',
      expertise: Object.freeze([
        'Asbestinventarisatie',
        'Materiaalbeoordeling',
        'Beheersmaatregelen',
      ]),
    }),
    [],
    Object.freeze([
      Object.freeze({
        professionalType: 'ARBEIDSHYGIENIST',
        reason:
          'Een arbeidshygiënist kan mogelijk aanvullend de blootstelling en beheersing voor medewerkers beoordelen.',
        expertise: Object.freeze([
          'Blootstelling',
          'Arbeidshygiënische beheersing',
        ]),
      }),
    ]),
  ),
  ruleForSituation(
    'PROFESSIONAL_ADVICE_EMERGENCY_RESPONSE_FIRE',
    'EMERGENCY_RESPONSE',
    'FIRE_SAFETY',
    Object.freeze({
      professionalType: 'BRANDVEILIGHEIDSDESKUNDIGE',
      reason:
        'Een brandveiligheidsdeskundige kan brandscenario’s, vluchtmogelijkheden en bouwkundige, installatietechnische en organisatorische maatregelen in samenhang beoordelen.',
      expertise: Object.freeze([
        'Brandveiligheid',
        'Vluchtroutes',
        'Brandscenario’s',
      ]),
    }),
    [],
    Object.freeze([higherSafety]),
  ),
  ruleForSituation(
    'PROFESSIONAL_ADVICE_RIE_OPERATIONAL_SAFETY',
    'RIE',
    'OPERATIONAL_SAFETY',
    Object.freeze({
      professionalType: 'MIDDELBAAR_VEILIGHEIDSKUNDIGE',
      reason:
        'Een middelbaar veiligheidskundige kan een afgebakende praktische veiligheidsinspectie uitvoeren en operationele maatregelen helpen verbeteren.',
      expertise: Object.freeze([
        'Werkplekinspectie',
        'Operationele veiligheid',
        'Praktische beheersmaatregelen',
      ]),
    }),
  ),
  ruleForSituation(
    'PROFESSIONAL_ADVICE_RIE_COMPLEX_OPERATIONAL_SAFETY',
    'RIE',
    'COMPLEX_OPERATIONAL_SAFETY',
    higherSafety,
  ),
] as const)
