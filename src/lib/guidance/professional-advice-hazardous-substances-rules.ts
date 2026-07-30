import type {
  ProfessionalAdviceRule,
  RequirementDefinition,
} from './professional-advice-rules'

const occupationalHygienistRequirement: RequirementDefinition =
  Object.freeze({
    professionalType: 'ARBEIDSHYGIENIST',
    reason:
      'Een arbeidshygiënist kan de blootstelling beoordelen en onderbouwen welke bron- en beheersmaatregelen passend zijn.',
    expertise: Object.freeze([
      'Gevaarlijke stoffen',
      'Blootstellingsbeoordeling',
      'Ventilatie',
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
  })

const higherSafetyExpertRequirement: RequirementDefinition = Object.freeze({
  professionalType: 'HOGER_VEILIGHEIDSKUNDIGE',
  reason:
    'Een hogere veiligheidskundige kan de opslagveiligheid, brandscenario’s, PGS-toepasselijkheid en organisatorische beheersmaatregelen in samenhang beoordelen.',
  expertise: Object.freeze([
    'Opslag gevaarlijke stoffen',
    'PGS',
    'Brand- en explosieveiligheid',
    'Noodscenario’s',
  ]),
  matchingTags: Object.freeze([
    'hogere-veiligheidskundige',
    'SAFETY_ADVICE',
    'SAFETY_ADVISORY',
  ]),
  capabilityCodes: Object.freeze(['SAFETY_ADVICE', 'SAFETY_ADVISORY']),
})

const environmentalSpecialistRequirement: RequirementDefinition =
  Object.freeze({
    professionalType: 'MILIEUDESKUNDIGE',
    reason:
      'Afhankelijk van brandstofsoort, opslagvorm en locatie kunnen meldings-, vergunning- en milieueisen en maatregelen voor bodembescherming relevant zijn.',
    expertise: Object.freeze([
      'Omgevingswet',
      'Vergunningen en meldingen',
      'Milieu- en bodembescherming',
    ]),
    matchingTags: Object.freeze([
      'ENVIRONMENTAL_COMPLIANCE',
      'PERMITS',
      'SOIL_PROTECTION',
    ]),
    capabilityCodes: Object.freeze(['SAFETY_ADVICE']),
  })

const fireSafetySpecialistRequirement: RequirementDefinition =
  Object.freeze({
    professionalType: 'BRANDVEILIGHEIDSDESKUNDIGE',
    reason:
      'De opslagvorm en hoeveelheid kunnen aanleiding geven om brand- en explosiescenario’s, compartimentering en bestrijdbaarheid specialistisch te beoordelen.',
    expertise: Object.freeze([
      'Brandveiligheid',
      'Explosieveiligheid',
      'Incident- en noodscenario’s',
    ]),
    matchingTags: Object.freeze([
      'brandveiligheid',
      'FIRE_SAFETY',
      'EMERGENCY_RESPONSE',
    ]),
    capabilityCodes: Object.freeze(['SAFETY_ADVICE']),
  })

const largeStorageRule: ProfessionalAdviceRule = Object.freeze({
  code: 'PROFESSIONAL_ADVICE_HAZARDOUS_SUBSTANCES_LARGE_STORAGE',
  situationCode: 'HAZARDOUS_SUBSTANCES',
  dominantContexts: Object.freeze(['LARGE_SCALE_STORAGE'] as const),
  adviceTitle:
    'Beoordeel de uitbreiding als opslag-, brand- en milieuvraagstuk',
  adviceBody:
    'Een uitbreiding van de brandstofopslag vraagt om een samenhangende beoordeling van opslagvorm, brandstofsoort, brand- en explosierisico’s, lek- en opvangvoorzieningen, milieu- en bodembescherming, noodscenario’s en handelingen zoals laden, lossen en overpompen. Welke PGS-richtlijn en vergunningseisen van toepassing zijn, hangt onder meer af van de brandstofsoort, opslagvorm, locatie en wijze van gebruik.',
  adviceReasons: Object.freeze([
    'De grote volumetoename maakt dit meer dan alleen een vraag over blootstelling van medewerkers.',
    'Opslagveiligheid, brandveiligheid, mogelijke meldings- of vergunningseisen en beheersing van lekkages moeten in samenhang worden beoordeeld.',
    'Blootstelling aan dampen of huidcontact blijft aanvullend relevant bij vullen, overpompen, onderhoud en incidenten.',
  ]),
  selfActions: Object.freeze([
    'Leg brandstofsoort, maximale hoeveelheid, opslagvorm en locatie vast.',
    'Beschrijf vullen, laden, lossen, overpompen, onderhoud en mogelijke lekkages.',
    'Verzamel bestaande voorzieningen voor opvang, bodembescherming, brandveiligheid en noodsituaties.',
  ]),
  primary: higherSafetyExpertRequirement,
  additional: Object.freeze([
    fireSafetySpecialistRequirement,
    environmentalSpecialistRequirement,
  ]),
  possible: Object.freeze([occupationalHygienistRequirement]),
  knowledgeContentIds: Object.freeze([
    'knowledge:occupational-hygienist',
  ]),
  sourceIds: Object.freeze([
    'arbowet-current',
    'arboportaal-arbobeleid',
    'arbeidsinspectie-rie',
  ]),
})

const exposureRule: ProfessionalAdviceRule = Object.freeze({
  code: 'PROFESSIONAL_ADVICE_HAZARDOUS_SUBSTANCES_EXPOSURE',
  situationCode: 'HAZARDOUS_SUBSTANCES',
  dominantContexts: Object.freeze(['EXPOSURE'] as const),
  adviceTitle: 'Beoordeel de feitelijke blootstelling bij de bron',
  adviceBody:
    'Breng stoffen, taken, duur, frequentie en bestaande maatregelen bijeen. Bepaal daarna welke blootstellingsbeoordeling of meting nodig is en geef maatregelen aan de bron voorrang boven persoonlijke bescherming.',
  adviceReasons: Object.freeze([
    'Dagelijkse dampen, huidcontact of onvoldoende ventilatie kunnen gezondheidsrisico’s veroorzaken.',
    'Veiligheidsinformatie alleen beschrijft nog niet de werkelijke blootstelling tijdens de werkzaamheden.',
  ]),
  selfActions: Object.freeze([
    'Verzamel veiligheidsinformatiebladen en een actuele stoffenlijst.',
    'Beschrijf duur, frequentie, ventilatie en momenten waarop medewerkers dampen ruiken of huidcontact hebben.',
    'Controleer bestaande bronmaatregelen, werkafspraken en beschermingsmiddelen.',
  ]),
  primary: occupationalHygienistRequirement,
  possible: Object.freeze([
    higherSafetyExpertRequirement,
    Object.freeze({
      professionalType: 'BEDRIJFSARTS',
      reason:
        'Bij aanhoudende gezondheidssignalen kan een bedrijfsarts onafhankelijk adviseren over de relatie tussen werk en gezondheid.',
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
  ]),
  knowledgeContentIds: Object.freeze([
    'knowledge:occupational-hygienist',
  ]),
  sourceIds: Object.freeze([
    'arbowet-current',
    'arboportaal-arbobeleid',
    'arbeidsinspectie-rie',
  ]),
})

const proportionalStorageRule: ProfessionalAdviceRule = Object.freeze({
  code: 'PROFESSIONAL_ADVICE_HAZARDOUS_SUBSTANCES_STORAGE',
  situationCode: 'HAZARDOUS_SUBSTANCES',
  dominantContexts: Object.freeze(['FIRE_SAFETY'] as const),
  adviceTitle: 'Beoordeel opslag en handelingen proportioneel',
  adviceBody:
    'Breng brandstofsoort, hoeveelheid, opslagvorm en gebruiksmomenten in kaart. Controleer vervolgens proportioneel welke maatregelen nodig zijn voor brandveiligheid, lekkages, laden of lossen en mogelijke blootstelling.',
  adviceReasons: Object.freeze([
    'Een beperkte voorraad vraagt een andere aanpak dan grootschalige tankopslag.',
    'Opslag en handelingen kunnen zowel veiligheids- als blootstellingsrisico’s geven.',
  ]),
  selfActions: Object.freeze([
    'Noteer de maximale hoeveelheid en de gebruikte verpakking of tank.',
    'Controleer opslagplaats, opvang en afstand tot ontstekingsbronnen.',
    'Beschrijf hoe de brandstof wordt gevuld, gebruikt en afgevoerd.',
  ]),
  primary: fireSafetySpecialistRequirement,
  additional: Object.freeze([higherSafetyExpertRequirement]),
  possible: Object.freeze([occupationalHygienistRequirement]),
  knowledgeContentIds: Object.freeze([
    'knowledge:occupational-hygienist',
  ]),
  sourceIds: Object.freeze([
    'arbowet-current',
    'arboportaal-arbobeleid',
    'arbeidsinspectie-rie',
  ]),
})

export const hazardousSubstancesContextRules = Object.freeze([
  largeStorageRule,
  exposureRule,
  proportionalStorageRule,
] as const)
