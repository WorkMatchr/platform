import type { PublicSourceId } from '@/content/public-sources'
import type { ComplianceModuleCode } from './free-intake'
import type { ComplianceAssessmentMode } from './module-aggregation'

export const fullScanAnswerOptions = ['YES', 'PARTIAL', 'NO', 'UNKNOWN'] as const
export type FullScanAnswer = (typeof fullScanAnswerOptions)[number]

export type FullScanQuestion = Readonly<{
  code: string
  prompt: string
  helpText?: string
}>

export type FullScanModuleDefinition = Readonly<{
  code: Exclude<ComplianceModuleCode, 'C01'>
  title: string
  mode: ComplianceAssessmentMode
  questions: readonly FullScanQuestion[]
  sourceIds: readonly PublicSourceId[]
  serviceSuggestionCode?: string
  specialistReason?: string
}>

function q(moduleCode: string, number: number, prompt: string, helpText?: string): FullScanQuestion {
  return { code: moduleCode + '-Q' + String(number).padStart(2, '0'), prompt, helpText }
}

export const fullScanModules: readonly FullScanModuleDefinition[] = [
  {
    code: 'C02', title: 'Plan van Aanpak', mode: 'FULL',
    questions: [
      q('C02', 1, 'Is bij de RI&E een Plan van Aanpak aanwezig met concrete maatregelen?'),
      q('C02', 2, 'Zijn per maatregel verantwoordelijkheden en termijnen vastgelegd?'),
      q('C02', 3, 'Wordt de voortgang van maatregelen periodiek gevolgd en bijgewerkt?'),
    ],
    sourceIds: ['arbowet-current', 'arbeidsinspectie-rie'],
    serviceSuggestionCode: 'RIE_SUPPORT',
  },
  {
    code: 'C03', title: 'Preventiemedewerker', mode: 'FULL',
    questions: [
      q('C03', 1, 'Is minimaal één preventiemedewerker aangewezen?'),
      q('C03', 2, 'Zijn taken, positie, deskundigheid en beschikbare tijd van de preventiemedewerker passend geregeld?'),
      q('C03', 3, 'Is de preventiemedewerker betrokken bij de RI&E en de uitvoering van preventiemaatregelen?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-preventiemedewerker', 'arbeidsinspectie-preventiemedewerker'],
    serviceSuggestionCode: 'PREVENTION_OFFICER',
  },
  {
    code: 'C04', title: 'Basiscontract & arbodienstverlening', mode: 'FULL',
    questions: [
      q('C04', 1, 'Is een basiscontract met een arbodienst of bedrijfsarts aanwezig?'),
      q('C04', 2, 'Zijn de voor uw organisatie relevante deskundige taken in de arbodienstverlening geregeld?'),
      q('C04', 3, 'Kunnen werknemers de bedrijfsarts preventief en zonder onnodige drempels raadplegen?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-basiscontract', 'arboportaal-bedrijfsarts'],
    serviceSuggestionCode: 'OCCUPATIONAL_HEALTH',
  },
  {
    code: 'C05', title: 'BHV & noodorganisatie', mode: 'FULL',
    questions: [
      q('C05', 1, 'Is de BHV-organisatie afgestemd op de aanwezige risico’s, locaties en bezetting?'),
      q('C05', 2, 'Zijn voldoende personen aangewezen en is vervanging/beschikbaarheid geregeld?'),
      q('C05', 3, 'Worden opleiding, oefenen, middelen en procedures aantoonbaar onderhouden?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-bhv', 'arbeidsinspectie-bhv-2025'],
    serviceSuggestionCode: 'BHV_SUPPORT',
  },
  {
    code: 'C06', title: 'PAGO / arbeidsgezondheidskundig onderzoek', mode: 'FULL',
    questions: [
      q('C06', 1, 'Is beoordeeld welke arbeidsrisico’s aanleiding geven tot arbeidsgezondheidskundig onderzoek?'),
      q('C06', 2, 'Wordt werknemers periodiek een passend PAGO aangeboden waar de arbeidsrisico’s daar aanleiding toe geven?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-pago'],
    serviceSuggestionCode: 'PAGO_SUPPORT',
  },
  {
    code: 'C07', title: 'Ziekteverzuimbeleid', mode: 'FULL',
    questions: [
      q('C07', 1, 'Is een duidelijke werkwijze voor ziekmelding, begeleiding en re-integratie vastgelegd?'),
      q('C07', 2, 'Zijn rollen van werkgever, werknemer, bedrijfsarts en eventuele casemanager duidelijk belegd?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-ziekteverzuim-catalog', 'arboportaal-reintegratie-catalog'],
    serviceSuggestionCode: 'ABSENCE_SUPPORT',
  },
  {
    code: 'C08', title: 'Voorlichting, instructie & toezicht', mode: 'FULL',
    questions: [
      q('C08', 1, 'Krijgen werknemers passende voorlichting en instructie over risico’s en maatregelen?'),
      q('C08', 2, 'Wordt gecontroleerd of instructies in de praktijk worden begrepen en toegepast?'),
      q('C08', 3, 'Worden instructies aangepast bij relevante veranderingen, incidenten of nieuwe risico’s?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-arbobeleid'],
    serviceSuggestionCode: 'SAFETY_INSTRUCTION',
  },
  {
    code: 'C09', title: 'Arbeidsongevallen & incidenten', mode: 'FULL',
    questions: [
      q('C09', 1, 'Is vastgelegd welke arbeidsongevallen moeten worden geregistreerd en wanneer melding nodig is?'),
      q('C09', 2, 'Worden oorzaken van relevante ongevallen en incidenten onderzocht en verbetermaatregelen opgevolgd?'),
    ],
    sourceIds: ['arbowet-current', 'arbeidsinspectie-ongevallen', 'arbeidsinspectie-ongevalsonderzoek-batch2'],
    serviceSuggestionCode: 'INCIDENT_INVESTIGATION',
  },
  {
    code: 'C10', title: 'Werknemersparticipatie', mode: 'FULL',
    questions: [
      q('C10', 1, 'Worden werknemers of hun vertegenwoordiging aantoonbaar betrokken bij relevante arbo-onderwerpen?'),
      q('C10', 2, 'Wordt hun inbreng vastgelegd en zichtbaar opgevolgd?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-werknemersraadpleging-2026'],
  },

  {
    code: 'R01', title: 'Arbeidsmiddelen & machines', mode: 'SCREENING',
    questions: [
      q('R01', 1, 'Zijn risico’s van gebruikte arbeidsmiddelen en machines opgenomen in de RI&E?'),
      q('R01', 2, 'Zijn onderhoud, keuring, afscherming en veilig gebruik aantoonbaar georganiseerd?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-arbeidsmiddelen-catalog', 'arboportaal-keuring-arbeidsmiddelen-catalog'],
    serviceSuggestionCode: 'MACHINE_SAFETY',
  },
  {
    code: 'R02', title: 'Persoonlijke beschermingsmiddelen', mode: 'FULL',
    questions: [
      q('R02', 1, 'Is vastgesteld voor welke werkzaamheden persoonlijke beschermingsmiddelen nodig zijn?'),
      q('R02', 2, 'Zijn passende PBM beschikbaar en krijgen werknemers instructie over correct gebruik en onderhoud?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'PPE_SUPPORT',
  },
  {
    code: 'R03', title: 'Gevaarlijke stoffen', mode: 'SCREENING',
    questions: [
      q('R03', 1, 'Zijn gebruikte gevaarlijke stoffen en relevante blootstellingen geïnventariseerd?'),
      q('R03', 2, 'Zijn passende beheersmaatregelen en informatie over veilig gebruik vastgesteld?'),
      q('R03', 3, 'Is beoordeeld of een nadere blootstellingsbeoordeling of meting nodig is?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-gevaarlijke-stoffen-catalog', 'arboportaal-blootstellingsmeting-batch2'],
    serviceSuggestionCode: 'HAZARDOUS_SUBSTANCES',
  },
  {
    code: 'R04', title: 'Fysieke belasting', mode: 'SCREENING',
    questions: [
      q('R04', 1, 'Zijn vormen van tillen, dragen, duwen, trekken of repeterend werk in beeld gebracht?'),
      q('R04', 2, 'Zijn maatregelen getroffen om fysieke belasting waar mogelijk te verminderen?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'ERGONOMICS',
  },
  {
    code: 'R05', title: 'Beeldscherm-, kantoor- & thuiswerk', mode: 'FULL',
    questions: [
      q('R05', 1, 'Zijn beeldscherm-, kantoor- en thuiswerkplekken passend ingericht voor de werkzaamheden?'),
      q('R05', 2, 'Zijn afspraken gemaakt over afwisseling, werkhouding en praktische inrichting?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-beeldschermwerk-catalog'],
    serviceSuggestionCode: 'ERGONOMICS',
  },
  {
    code: 'R06', title: 'Psychosociale arbeidsbelasting', mode: 'FULL',
    questions: [
      q('R06', 1, 'Zijn relevante PSA-risico’s zoals werkdruk en ongewenst gedrag in de RI&E opgenomen?'),
      q('R06', 2, 'Zijn preventieve maatregelen, meldroutes en opvolging passend geregeld?'),
      q('R06', 3, 'Wordt periodiek beoordeeld of de aanpak in de praktijk voldoende werkt?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-psa-batch2', 'arboportaal-vertrouwenspersoon-catalog'],
    serviceSuggestionCode: 'PSA_SUPPORT',
  },
  {
    code: 'R07', title: 'Geluid', mode: 'SCREENING',
    questions: [
      q('R07', 1, 'Is schadelijk geluid als risico beoordeeld?'),
      q('R07', 2, 'Is bepaald of bronmaatregelen, organisatorische maatregelen, gehoorbescherming of meting nodig zijn?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-geluid-catalog'],
    serviceSuggestionCode: 'NOISE_EXPERT',
  },
  {
    code: 'R08', title: 'Trillingen', mode: 'SCREENING',
    questions: [
      q('R08', 1, 'Zijn hand-arm- of lichaamstrillingen als mogelijk arbeidsrisico beoordeeld?'),
      q('R08', 2, 'Zijn maatregelen genomen om blootstelling aan trillingen te beperken waar dat nodig is?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'OCCUPATIONAL_HYGIENE',
  },
  {
    code: 'R09', title: 'Werken op hoogte', mode: 'SCREENING',
    questions: [
      q('R09', 1, 'Zijn valrisico’s en de gekozen werkmethode vooraf beoordeeld?'),
      q('R09', 2, 'Zijn passende voorzieningen, instructies en toezicht voor werken op hoogte geregeld?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'SAFETY_EXPERT',
  },
  {
    code: 'R10', title: 'Jongeren', mode: 'FULL',
    questions: [
      q('R10', 1, 'Zijn werkzaamheden en risico’s voor jongeren afzonderlijk beoordeeld?'),
      q('R10', 2, 'Zijn passende instructie, begeleiding en toezicht voor jongeren geregeld?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'YOUNG_WORKERS',
  },
  {
    code: 'R11', title: 'Zwangerschap & borstvoeding', mode: 'FULL',
    questions: [
      q('R11', 1, 'Zijn arbeidsrisico’s die relevant kunnen zijn bij zwangerschap of borstvoeding beoordeeld?'),
      q('R11', 2, 'Is een werkwijze beschikbaar om passende maatregelen of aanpassingen te treffen wanneer dat nodig is?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'OCCUPATIONAL_HEALTH',
  },
  {
    code: 'R12', title: 'Biologische agentia', mode: 'SCREENING',
    questions: [
      q('R12', 1, 'Zijn mogelijke blootstellingen aan biologische agentia geïnventariseerd?'),
      q('R12', 2, 'Zijn passende hygiëne-, preventie- en beheersmaatregelen vastgesteld?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'OCCUPATIONAL_HYGIENE',
  },
  {
    code: 'R13', title: 'Alleenwerk', mode: 'FULL',
    questions: [
      q('R13', 1, 'Zijn de extra risico’s van alleenwerk beoordeeld?'),
      q('R13', 2, 'Zijn bereikbaarheid, alarmering en noodafspraken passend geregeld?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'SAFETY_EXPERT',
  },
  {
    code: 'R14', title: 'Nacht-, ploeg- & afwijkende werktijden', mode: 'FULL',
    questions: [
      q('R14', 1, 'Zijn risico’s van nacht-, ploeg- of afwijkende werktijden beoordeeld?'),
      q('R14', 2, 'Zijn passende maatregelen rond herstel, roosters en gezondheid georganiseerd?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'OCCUPATIONAL_HEALTH',
  },
  {
    code: 'R15', title: 'Werken op locaties van derden', mode: 'FULL',
    questions: [
      q('R15', 1, 'Zijn verantwoordelijkheden en risico’s bij werkzaamheden op locaties van derden vooraf afgestemd?'),
      q('R15', 2, 'Krijgen medewerkers locatie- en taakspecifieke veiligheidsinformatie voordat zij starten?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'SAFETY_EXPERT',
  },
  {
    code: 'R16', title: 'Verkeer & voertuigen', mode: 'SCREENING',
    questions: [
      q('R16', 1, 'Zijn verkeers- en voertuiggebonden arbeidsrisico’s in beeld gebracht?'),
      q('R16', 2, 'Zijn onderhoud, rijafspraken, instructie en organisatorische maatregelen passend geregeld?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'SAFETY_EXPERT',
  },
  {
    code: 'R17', title: 'Klimaat & fysieke werkomgeving', mode: 'SCREENING',
    questions: [
      q('R17', 1, 'Zijn relevante klimaatfactoren zoals warmte, koude of ventilatie beoordeeld?'),
      q('R17', 2, 'Zijn passende technische of organisatorische maatregelen genomen waar belasting kan optreden?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'OCCUPATIONAL_HYGIENE',
  },
  {
    code: 'R18', title: 'Werkplekinrichting', mode: 'FULL',
    questions: [
      q('R18', 1, 'Is de inrichting van werkplekken afgestemd op werkzaamheden, medewerkers en gebruikte middelen?'),
      q('R18', 2, 'Worden knelpunten in bereikbaarheid, houding, ruimte en inrichting praktisch opgevolgd?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-beeldschermwerk-catalog'],
    serviceSuggestionCode: 'ERGONOMICS',
  },
  {
    code: 'R19', title: 'Brand- & explosierisico', mode: 'SCREENING',
    questions: [
      q('R19', 1, 'Zijn relevante brand- en explosiescenario’s als arbeidsrisico beoordeeld?'),
      q('R19', 2, 'Zijn preventieve maatregelen, vluchtmogelijkheden en noodorganisatie hierop afgestemd?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-brandpreventie-catalog'],
    serviceSuggestionCode: 'FIRE_SAFETY',
  },
  {
    code: 'R20', title: 'Elektrotechnische risico\'s', mode: 'SCREENING',
    questions: [
      q('R20', 1, 'Zijn elektrotechnische gevaren bij werkzaamheden en installaties beoordeeld?'),
      q('R20', 2, 'Zijn bevoegdheden, werkafspraken, onderhoud en veilige werkwijzen passend georganiseerd?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'SAFETY_EXPERT',
  },
  {
    code: 'R21', title: 'Straling', mode: 'SPECIALIST_REQUIRED',
    questions: [
      q('R21', 1, 'Is vastgesteld om welke vorm van straling en welke werkzaamheden het gaat?'),
      q('R21', 2, 'Is passende stralingsdeskundigheid betrokken bij de beoordeling en beheersing?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-ioniserende-straling-catalog', 'arboportaal-stralingsopleiding-catalog'],
    serviceSuggestionCode: 'RADIATION_EXPERT',
    specialistReason: 'Voor een inhoudelijke beoordeling van stralingsrisico’s is toepassingsspecifieke deskundigheid nodig.',
  },
  {
    code: 'R22', title: 'Drukapparatuur, drukvaten & perslucht', mode: 'SCREENING',
    questions: [
      q('R22', 1, 'Zijn risico’s van drukapparatuur, drukvaten of perslucht beoordeeld?'),
      q('R22', 2, 'Zijn onderhoud, inspecties, veilige bediening en afscherming aantoonbaar georganiseerd?'),
    ],
    sourceIds: ['arbowet-current'],
    serviceSuggestionCode: 'SAFETY_EXPERT',
  },
  {
    code: 'R23', title: 'Explosieve atmosferen / ATEX', mode: 'SPECIALIST_REQUIRED',
    questions: [
      q('R23', 1, 'Is beoordeeld of een explosieve atmosfeer kan ontstaan?'),
      q('R23', 2, 'Is passende deskundigheid betrokken bij zonering, maatregelen en documentatie?'),
    ],
    sourceIds: ['arbowet-current', 'arboportaal-atex-catalog'],
    serviceSuggestionCode: 'ATEX_EXPERT',
    specialistReason: 'ATEX-zonering en technische explosieveiligheidsbeoordeling vereisen specialistische deskundigheid.',
  },
] as const

export const fullScanModuleByCode = new Map<string, FullScanModuleDefinition>(
  fullScanModules.map((module) => [module.code, module]),
)

export const fullScanQuestionLabels = new Map<string, string>(
  fullScanModules.flatMap((module) => module.questions.map((question) => [question.code, question.prompt] as const)),
)
