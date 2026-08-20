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
  { id: 'policy', title: 'Algemeen arbobeleid', keys: ['generalPolicy'], relevance: 'De werkgever voert beleid dat veiligheid en gezondheid tijdens het werk beschermt.', ok: 'U geeft aan dat algemeen arbobeleid is georganiseerd.', action: 'Er lijkt nog geen samenhangend arbobeleid te zijn geregeld.', check: 'Het is nog niet duidelijk of het arbobeleid aantoonbaar is georganiseerd.', nextStep: 'Leg verantwoordelijkheden, risico’s, maatregelen en periodieke evaluatie herkenbaar vast.', sourceIds: ['arbowet-current', 'arboportaal-arbobeleid'] },
  { id: 'rie', title: 'RI&E en plan van aanpak', keys: ['rie', 'actionPlan', 'rieUpdated', 'rieTesting'], relevance: 'De RI&E en het plan van aanpak vormen de basis voor het beheersen van arbeidsrisico’s.', ok: 'RI&E, plan van aanpak, actualisatie en eventuele toetsing zijn volgens uw antwoorden geregeld.', action: 'Eén of meer basisonderdelen van de RI&E-cyclus ontbreken.', check: 'Eén of meer onderdelen van de RI&E-cyclus moeten nog worden gecontroleerd.', nextStep: 'Controleer de RI&E, het plan van aanpak, actualisatie en of deskundige toetsing nodig is.', sourceIds: ['arbowet-current', 'arbeidsinspectie-rie'], detailHref: '/wettelijke-verplichtingen/rie' },
  { id: 'prevention', title: 'Preventiemedewerker', keys: ['preventionOfficer', 'preventionConsultation'], relevance: 'Iedere werkgever organiseert interne deskundige bijstand voor preventie en bescherming.', ok: 'De preventiemedewerker en de vereiste betrokkenheid zijn volgens uw antwoorden geregeld.', action: 'De preventiemedewerker of vereiste betrokkenheid is niet aantoonbaar geregeld.', check: 'De inrichting of betrokkenheid rond de preventiemedewerker moet worden gecontroleerd.', nextStep: 'Wijs minimaal één preventiemedewerker aan en leg taken, positie, tijd en betrokkenheid vast.', sourceIds: ['arbowet-current', 'arboportaal-preventiemedewerker'], detailHref: '/wettelijke-verplichtingen/preventiemedewerker' },
  { id: 'bhv', title: 'Bedrijfshulpverlening', keys: ['bhvOrganized', 'bhvAppointed', 'bhvRiskBased', 'bhvPrepared'], relevance: 'BHV moet doeltreffend aansluiten op risico’s, bezetting, locaties en noodscenario’s.', ok: 'Organisatie, aangewezen BHV’ers en voorbereiding sluiten volgens uw antwoorden aan op de risico’s.', action: 'Eén of meer noodzakelijke onderdelen van de BHV-organisatie ontbreken.', check: 'De doeltreffendheid van de BHV-organisatie moet nog worden gecontroleerd.', nextStep: 'Beoordeel vanuit de RI&E de scenario’s, bezetting, vervanging, opleiding, oefeningen en middelen.', sourceIds: ['arbowet-current', 'arboportaal-arbobeleid'], detailHref: '/wettelijke-verplichtingen/bhv' },
  { id: 'contract', title: 'Basiscontract en bedrijfsarts', keys: ['basicContract', 'occupationalPhysicianAccess', 'expertTasksCovered'], relevance: 'Werkgevers moeten passende arbodienstverlening en toegang tot de bedrijfsarts organiseren.', ok: 'Basiscontract, toegang en deskundige taken zijn volgens uw antwoorden geborgd.', action: 'Het basiscontract, de toegang tot de bedrijfsarts of wettelijke deskundige taken ontbreken.', check: 'De inhoud of praktische werking van de arbodienstverlening moet worden gecontroleerd.', nextStep: 'Controleer het contract op wettelijke taken en maak de preventieve toegang tot de bedrijfsarts bekend.', sourceIds: ['arbowet-current', 'arboportaal-basiscontract', 'arboportaal-bedrijfsarts'], detailHref: '/wettelijke-verplichtingen/basiscontract' },
  { id: 'pago', title: 'PAGO', keys: ['pagoOffered'], relevance: 'PAGO richt zich op gezondheidseffecten van arbeidsrisico’s en is niet automatisch hetzelfde als een algemeen PMO.', ok: 'U geeft aan dat een risicogericht PAGO periodiek wordt aangeboden.', action: 'Werknemers krijgen volgens uw antwoord geen passend PAGO aangeboden.', check: 'Controleer of het aangeboden onderzoek werkelijk aansluit op de arbeidsrisico’s.', nextStep: 'Laat de bedrijfsarts inhoud en frequentie afstemmen op de RI&E en bied het onderzoek aan.', sourceIds: ['arbowet-current', 'arboportaal-pago'], detailHref: '/wettelijke-verplichtingen/pago' },
  { id: 'instruction', title: 'Voorlichting, onderricht en toezicht', keys: ['instruction', 'supervision'], relevance: 'Werknemers moeten begrijpelijke instructie krijgen en waar nodig passend toezicht op veilig werken.', ok: 'Voorlichting, instructie en relevant toezicht zijn volgens uw antwoorden geregeld.', action: 'Passende instructie of toezicht ontbreekt.', check: 'De inhoud, herhaling of praktische werking van instructie en toezicht moet worden gecontroleerd.', nextStep: 'Baseer instructies op de RI&E en controleer begrip en veilige toepassing in de praktijk.', sourceIds: ['arbowet-current', 'arboportaal-arbobeleid'], detailHref: '/wettelijke-verplichtingen/voorlichting-en-onderricht' },
  { id: 'consultation', title: 'Raadpleging van werknemers', keys: ['workerConsultation'], relevance: 'Sinds 1 juli 2026 worden werknemersvertegenwoordigers, of anders belanghebbende werknemers, geraadpleegd over relevante arbo-onderwerpen.', ok: 'Werknemers worden volgens uw antwoorden via de passende route geraadpleegd.', action: 'Werknemers worden niet aantoonbaar via OR, PVT of rechtstreekse raadpleging betrokken.', check: 'De vorm en aantoonbaarheid van werknemersraadpleging moet worden gecontroleerd.', nextStep: 'Gebruik de OR of PVT als die aanwezig is; raadpleeg anders de belanghebbende werknemers rechtstreeks.', sourceIds: ['arbowet-current', 'arboportaal-werknemersraadpleging-2026'] },
  { id: 'accidents', title: 'Arbeidsongevallen', keys: ['accidentRegistration', 'accidentReporting'], relevance: 'Ernstige arbeidsongevallen moeten worden herkend en direct gemeld; relevante ongevallen worden geregistreerd.', ok: 'Registratie en herkenning van de meldingsplicht zijn volgens uw antwoorden geregeld.', action: 'Een proces voor registratie of melding van arbeidsongevallen ontbreekt.', check: 'Het ongevallenproces of de wettelijke meldcriteria moeten worden gecontroleerd.', nextStep: 'Leg vast wie beoordeelt en direct meldt bij overlijden, ziekenhuisopname of blijvend letsel.', sourceIds: ['arbowet-current', 'arbeidsinspectie-ongevallen'], detailHref: '/wettelijke-verplichtingen/arbeidsongevallen' },
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
