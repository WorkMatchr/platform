import type { PublicSourceId } from '@/content/public-sources'

export const COMPLIANCE_GUIDE_VERSION = 1 as const
export const COMPLIANCE_GUIDE_REVIEWED_AT = '2026-08-20' as const

export const complianceAnswerValues = ['YES', 'NO', 'UNKNOWN'] as const
export type ComplianceAnswer = (typeof complianceAnswerValues)[number]
export const employeeCountValues = ['ONE_TO_25', 'MORE_THAN_25'] as const
export type EmployeeCount = (typeof employeeCountValues)[number]
export const representationValues = ['OR', 'PVT', 'DIRECT', 'NONE', 'UNKNOWN'] as const
export type EmployeeRepresentation = (typeof representationValues)[number]
export const complianceResultStatuses = ['ORDER', 'ACTION', 'CHECK', 'NOT_APPLICABLE'] as const
export type ComplianceResultStatus = (typeof complianceResultStatuses)[number]

export function complianceStepScrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? 'auto' : 'smooth'
}

export type ComplianceGuideAnswers = Readonly<{
  hasEmployees: ComplianceAnswer
  employeeCount: EmployeeCount | null
  generalPolicy: ComplianceAnswer
  rie: ComplianceAnswer
  actionPlan: ComplianceAnswer
  rieUpdated: ComplianceAnswer
  rieTesting: ComplianceAnswer
  preventionOfficer: ComplianceAnswer
  preventionConsultation: ComplianceAnswer
  bhvOrganized: ComplianceAnswer
  bhvAppointed: ComplianceAnswer
  bhvRiskBased: ComplianceAnswer
  bhvPrepared: ComplianceAnswer
  basicContract: ComplianceAnswer
  occupationalPhysicianAccess: ComplianceAnswer
  expertTasksCovered: ComplianceAnswer
  pagoOffered: ComplianceAnswer
  instruction: ComplianceAnswer
  supervision: ComplianceAnswer
  representation: EmployeeRepresentation | null
  workerConsultation: ComplianceAnswer
  accidentRegistration: ComplianceAnswer
  accidentReporting: ComplianceAnswer
}>

export const initialComplianceGuideAnswers: ComplianceGuideAnswers = {
  hasEmployees: 'UNKNOWN', employeeCount: null, generalPolicy: 'UNKNOWN', rie: 'UNKNOWN', actionPlan: 'UNKNOWN',
  rieUpdated: 'UNKNOWN', rieTesting: 'UNKNOWN', preventionOfficer: 'UNKNOWN', preventionConsultation: 'UNKNOWN',
  bhvOrganized: 'UNKNOWN', bhvAppointed: 'UNKNOWN', bhvRiskBased: 'UNKNOWN', bhvPrepared: 'UNKNOWN',
  basicContract: 'UNKNOWN', occupationalPhysicianAccess: 'UNKNOWN', expertTasksCovered: 'UNKNOWN', pagoOffered: 'UNKNOWN',
  instruction: 'UNKNOWN', supervision: 'UNKNOWN', representation: null, workerConsultation: 'UNKNOWN',
  accidentRegistration: 'UNKNOWN', accidentReporting: 'UNKNOWN',
}

export type ComplianceResult = Readonly<{
  id: string
  title: string
  status: ComplianceResultStatus
  explanation: string
  relevance: string
  nextStep: string
  sourceIds: readonly PublicSourceId[]
  detailHref?: `/${string}`
}>

type RuleDefinition = Readonly<{
  id: string
  title: string
  keys: readonly (keyof ComplianceGuideAnswers)[]
  relevance: string
  ok: string
  action: string
  check: string
  nextStep: string
  sourceIds: readonly PublicSourceId[]
  detailHref?: `/${string}`
}>

const rules: readonly RuleDefinition[] = [
  { id: 'policy', title: 'Algemeen arbobeleid', keys: ['generalPolicy'], relevance: 'Samenhangend arbobeleid verbindt arbeidsrisico’s, verantwoordelijkheden en maatregelen. Door het beleid regelmatig te beoordelen, blijven afspraken aansluiten op veranderingen in werk, mensen en organisatie.', ok: 'U geeft aan dat algemeen arbobeleid is georganiseerd.', action: 'Er lijkt nog geen samenhangend arbobeleid te zijn geregeld.', check: 'Het is nog niet duidelijk of het arbobeleid aantoonbaar is georganiseerd.', nextStep: 'Leg vast wie verantwoordelijk is, welke risico’s prioriteit hebben en welke maatregelen worden uitgevoerd. Plan daarnaast periodiek een controle of het beleid in de praktijk werkt en nog actueel is.', sourceIds: ['arbowet-current', 'arboportaal-arbobeleid'] },
  { id: 'rie', title: 'RI&E en plan van aanpak', keys: ['rie', 'actionPlan', 'rieUpdated', 'rieTesting'], relevance: 'De RI&E brengt arbeidsrisico’s systematisch in beeld; het plan van aanpak vertaalt deze naar concrete verbeteringen. Actualisatie en eventuele deskundige toetsing helpen voorkomen dat nieuwe of veranderde risico’s buiten beeld blijven.', ok: 'RI&E, plan van aanpak, actualisatie en eventuele toetsing zijn volgens uw antwoorden geregeld.', action: 'Eén of meer basisonderdelen van de RI&E-cyclus ontbreken.', check: 'Eén of meer onderdelen van de RI&E-cyclus moeten nog worden gecontroleerd.', nextStep: 'Controleer of alle werkzaamheden, locaties en groepen medewerkers in de RI&E staan. Werk ontbrekende maatregelen, verantwoordelijken en termijnen bij en bepaal of deskundige toetsing voor uw organisatie nodig is.', sourceIds: ['arbowet-current', 'arbeidsinspectie-rie'], detailHref: '/wettelijke-verplichtingen/rie' },
  { id: 'prevention', title: 'Preventiemedewerker', keys: ['preventionOfficer', 'preventionConsultation'], relevance: 'De preventiemedewerker ondersteunt de werkgever van binnenuit bij het voorkomen en beperken van arbeidsrisico’s. Voldoende tijd, deskundigheid en betrokkenheid van werknemers helpen om deze rol praktisch uitvoerbaar te maken.', ok: 'De preventiemedewerker en de vereiste betrokkenheid zijn volgens uw antwoorden geregeld.', action: 'De preventiemedewerker of vereiste betrokkenheid is niet aantoonbaar geregeld.', check: 'De inrichting of betrokkenheid rond de preventiemedewerker moet worden gecontroleerd.', nextStep: 'Controleer wie de preventietaken uitvoert en of taken, positie, deskundigheid en beschikbare tijd zijn vastgelegd. Betrek de werknemersvertegenwoordiging waar dat vereist is en evalueer periodiek of de ondersteuning voldoende werkt.', sourceIds: ['arbowet-current', 'arboportaal-preventiemedewerker'], detailHref: '/wettelijke-verplichtingen/preventiemedewerker' },
  { id: 'bhv', title: 'Bedrijfshulpverlening', keys: ['bhvOrganized', 'bhvAppointed', 'bhvRiskBased', 'bhvPrepared'], relevance: 'BHV is bedoeld om bij brand, ongeval of andere noodsituaties snel passende eerste maatregelen te nemen. De inrichting moet daarom aansluiten op de RI&E, aanwezige personen, locaties, werktijden en geloofwaardige noodscenario’s.', ok: 'Organisatie, aangewezen BHV’ers en voorbereiding sluiten volgens uw antwoorden aan op de risico’s.', action: 'Eén of meer noodzakelijke onderdelen van de BHV-organisatie ontbreken.', check: 'De doeltreffendheid van de BHV-organisatie moet nog worden gecontroleerd.', nextStep: 'Werk vanuit de RI&E uit welke scenario’s kunnen optreden en welke taken dan gelijktijdig nodig zijn. Controleer bezetting en vervanging, leg procedures vast en onderhoud opleiding, oefeningen, evaluatie en benodigde middelen.', sourceIds: ['arbowet-current', 'arboportaal-arbobeleid'], detailHref: '/wettelijke-verplichtingen/bhv' },
  { id: 'contract', title: 'Basiscontract en bedrijfsarts', keys: ['basicContract', 'occupationalPhysicianAccess', 'expertTasksCovered'], relevance: 'Passende arbodienstverlening geeft de organisatie toegang tot deskundige ondersteuning bij preventie, verzuim en arbeidsgezondheidskundige vraagstukken. Werknemers moeten de bedrijfsarts ook preventief kunnen raadplegen zonder onnodige drempels.', ok: 'Basiscontract, toegang en deskundige taken zijn volgens uw antwoorden geborgd.', action: 'Het basiscontract, de toegang tot de bedrijfsarts of wettelijke deskundige taken ontbreken.', check: 'De inhoud of praktische werking van de arbodienstverlening moet worden gecontroleerd.', nextStep: 'Leg het basiscontract naast de werkzaamheden die de arbodienst of bedrijfsarts daadwerkelijk uitvoert. Controleer of de vereiste deskundige taken zijn geregeld en maak de preventieve toegang duidelijk bekend bij werknemers.', sourceIds: ['arbowet-current', 'arboportaal-basiscontract', 'arboportaal-bedrijfsarts'], detailHref: '/wettelijke-verplichtingen/basiscontract' },
  { id: 'pago', title: 'PAGO', keys: ['pagoOffered'], relevance: 'Een PAGO is gericht op het vroeg herkennen of voorkomen van gezondheidseffecten door risico’s in het werk. De inhoud volgt daarom uit de RI&E en is niet automatisch hetzelfde als een algemeen preventief medisch onderzoek.', ok: 'U geeft aan dat een risicogericht PAGO periodiek wordt aangeboden.', action: 'Werknemers krijgen volgens uw antwoord geen passend PAGO aangeboden.', check: 'Controleer of het aangeboden onderzoek werkelijk aansluit op de arbeidsrisico’s.', nextStep: 'Bespreek met de bedrijfsarts welke arbeidsrisico’s aanleiding geven tot onderzoek en welke inhoud en frequentie daarbij passen. Leg vast hoe werknemers het aanbod ontvangen en evalueer of het onderzoek blijft aansluiten op de RI&E.', sourceIds: ['arbowet-current', 'arboportaal-pago'], detailHref: '/wettelijke-verplichtingen/pago' },
  { id: 'instruction', title: 'Voorlichting, onderricht en toezicht', keys: ['instruction', 'supervision'], relevance: 'Werknemers kunnen alleen veilig werken wanneer zij risico’s, maatregelen en het juiste gebruik van arbeidsmiddelen begrijpen. Passend toezicht helpt om te controleren of instructies in de praktijk worden toegepast en waar bijsturing nodig is.', ok: 'Voorlichting, instructie en relevant toezicht zijn volgens uw antwoorden geregeld.', action: 'Passende instructie of toezicht ontbreekt.', check: 'De inhoud, herhaling of praktische werking van instructie en toezicht moet worden gecontroleerd.', nextStep: 'Baseer voorlichting en instructies op de actuele RI&E en maak ze passend voor werkzaamheden en doelgroep. Controleer begrip en toepassing op de werkplek en herhaal of verbeter de instructie bij veranderingen en afwijkingen.', sourceIds: ['arbowet-current', 'arboportaal-arbobeleid'], detailHref: '/wettelijke-verplichtingen/voorlichting-en-onderricht' },
  { id: 'consultation', title: 'Raadpleging van werknemers', keys: ['workerConsultation'], relevance: 'Werknemers kennen de dagelijkse praktijk en kunnen risico’s of knelpunten signaleren die in beleid minder zichtbaar zijn. Raadpleging helpt om arbomaatregelen beter uitvoerbaar te maken en werknemers tijdig bij relevante besluiten te betrekken.', ok: 'Werknemers worden volgens uw antwoorden via de passende route geraadpleegd.', action: 'Werknemers worden niet aantoonbaar via OR, PVT of rechtstreekse raadpleging betrokken.', check: 'De vorm en aantoonbaarheid van werknemersraadpleging moet worden gecontroleerd.', nextStep: 'Bepaal welke raadplegingsroute bij uw organisatie past: via OR of PVT, of anders rechtstreeks met de belanghebbende werknemers. Leg onderwerpen, inbreng en opvolging herkenbaar vast en controleer of de gekozen werkwijze actueel is.', sourceIds: ['arbowet-current', 'arboportaal-werknemersraadpleging-2026'] },
  { id: 'accidents', title: 'Arbeidsongevallen', keys: ['accidentRegistration', 'accidentReporting'], relevance: 'Een duidelijk ongevallenproces zorgt dat ernstige gebeurtenissen tijdig worden gemeld en relevante ongevallen worden vastgelegd. Onderzoek van oorzaken en omstandigheden helpt herhaling te voorkomen en maatregelen gericht te verbeteren.', ok: 'Registratie en herkenning van de meldingsplicht zijn volgens uw antwoorden geregeld.', action: 'Een proces voor registratie of melding van arbeidsongevallen ontbreekt.', check: 'Het ongevallenproces of de wettelijke meldcriteria moeten worden gecontroleerd.', nextStep: 'Leg vast wie direct beoordeelt of sprake is van overlijden, ziekenhuisopname of blijvend letsel en wie dan contact opneemt met de Nederlandse Arbeidsinspectie. Regel daarnaast registratie, intern onderzoek en opvolging van verbetermaatregelen.', sourceIds: ['arbowet-current', 'arbeidsinspectie-ongevallen'], detailHref: '/wettelijke-verplichtingen/arbeidsongevallen' },
]

function isAnswer(value: unknown): value is ComplianceAnswer {
  return typeof value === 'string' && complianceAnswerValues.includes(value as ComplianceAnswer)
}

export function normalizeComplianceGuideAnswers(value: Partial<Record<keyof ComplianceGuideAnswers, unknown>>): ComplianceGuideAnswers {
  const normalized = { ...initialComplianceGuideAnswers }
  for (const key of Object.keys(normalized) as (keyof ComplianceGuideAnswers)[]) {
    const candidate = value[key]
    if (key === 'employeeCount') normalized.employeeCount = typeof candidate === 'string' && employeeCountValues.includes(candidate as EmployeeCount) ? candidate as EmployeeCount : null
    else if (key === 'representation') normalized.representation = typeof candidate === 'string' && representationValues.includes(candidate as EmployeeRepresentation) ? candidate as EmployeeRepresentation : null
    else if (isAnswer(candidate)) (normalized as Record<string, unknown>)[key] = candidate
  }
  return normalized
}

function ruleStatus(rule: RuleDefinition, answers: ComplianceGuideAnswers): ComplianceResultStatus {
  const values = rule.keys.map((key) => answers[key])
  if (values.some((value) => value === 'NO')) return 'ACTION'
  if (values.every((value) => value === 'YES')) return 'ORDER'
  return 'CHECK'
}

export function evaluateComplianceGuide(rawAnswers: Partial<Record<keyof ComplianceGuideAnswers, unknown>>): readonly ComplianceResult[] {
  const answers = normalizeComplianceGuideAnswers(rawAnswers)
  if (answers.hasEmployees === 'NO') {
    return rules.map((rule) => ({ ...rule, status: 'NOT_APPLICABLE', explanation: 'Dit algemene werkgeversonderdeel is op basis van uw antwoord niet van toepassing. Controleer afzonderlijk welke regels voor uw situatie als zelfstandige of opdrachtgever gelden.' }))
  }
  if (answers.hasEmployees !== 'YES' || !answers.employeeCount) {
    return rules.map((rule) => ({ ...rule, status: 'CHECK', explanation: 'Of dit onderdeel van toepassing is kan pas worden bepaald nadat werkgeverschap en werknemerscategorie zijn gecontroleerd.' }))
  }

  return rules.map((rule) => {
    let status = ruleStatus(rule, answers)
    if (rule.id === 'consultation' && (answers.representation === 'NONE' || answers.representation === 'UNKNOWN' || answers.representation === null)) status = answers.workerConsultation === 'NO' ? 'ACTION' : 'CHECK'
    const explanation = status === 'ORDER' ? rule.ok : status === 'ACTION' ? rule.action : rule.check
    const preventionSuffix = rule.id === 'prevention' && answers.employeeCount === 'ONE_TO_25'
      ? ' Bij maximaal 25 werknemers mag de werkgever de preventietaken onder voorwaarden zelf uitvoeren.'
      : ''
    return { ...rule, status, explanation: `${explanation}${preventionSuffix}` }
  })
}

export function summarizeComplianceResults(results: readonly ComplianceResult[]) {
  return {
    order: results.filter((result) => result.status === 'ORDER').length,
    action: results.filter((result) => result.status === 'ACTION').length,
    check: results.filter((result) => result.status === 'CHECK').length,
    notApplicable: results.filter((result) => result.status === 'NOT_APPLICABLE').length,
  }
}

export const complianceResultLabels: Record<ComplianceResultStatus, string> = {
  ORDER: 'Op orde', ACTION: 'Actie nodig', CHECK: 'Controleren', NOT_APPLICABLE: 'Niet van toepassing',
}
