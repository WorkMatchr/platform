import type { PublicSourceId } from '@/content/public-sources'
import type { ComplianceResultStatus } from '@/lib/compliance-guide/compliance-guide'

export const BHV_GUIDE_VERSION = 1
export const bhvAnswerValues = ['YES', 'NO', 'UNKNOWN'] as const
export type BhvAnswer = (typeof bhvAnswerValues)[number]

export const bhvBooleanKeys = [
  'hasEmployees', 'visitors', 'multipleLocations', 'outsideHours', 'shiftWork', 'loneWork', 'remoteWork',
  'multipleBuildings', 'multipleFloors', 'complexEscapeRoutes', 'sleepingPersons', 'unfamiliarVisitors',
  'childrenPresent', 'elderlyPresent', 'physicalLimitations', 'cognitiveLimitations', 'emergencyAccessIssues',
  'hazardousSubstances', 'machines', 'electricity', 'workAtHeight', 'confinedSpaces', 'asphyxiationRisk',
  'fireExplosionRisk', 'aggressionRisk', 'outdoorRemoteWork', 'waterRisk',
  'coverageNormal', 'coverageOutsideHours', 'coverageSpread', 'replacement', 'breakCoverage', 'simultaneousTasks',
  'alarmOrganized', 'taskDivision', 'coordination', 'emergencyReception',
  'firstAidResources', 'alarmMeans', 'recognizability', 'communicationMeans', 'accessMeans', 'evacuationInfo',
  'emergencyLighting', 'equipmentMaintenance', 'scenarioSpecificMeansAssessed',
  'trained', 'skillsMaintained', 'exercisesHeld', 'scenariosExercised', 'exerciseEvaluated', 'actionsFollowedUp',
  'workersInformed', 'responsibilitiesAssigned', 'changeReview', 'rieAligned', 'periodicReview',
] as const
export type BhvBooleanKey = (typeof bhvBooleanKeys)[number]
export type BhvGuideAnswers = Record<BhvBooleanKey, BhvAnswer> & {
  employeeCount: number | null
  maximumPresent: number | null
  trainedBhvCount: number | null
  minimumBhvPresent: number | null
}

export const initialBhvGuideAnswers: BhvGuideAnswers = Object.assign(
  Object.fromEntries(bhvBooleanKeys.map((key) => [key, 'UNKNOWN'])) as Record<BhvBooleanKey, BhvAnswer>,
  { employeeCount: null, maximumPresent: null, trainedBhvCount: null, minimumBhvPresent: null },
)

function numberOrNull(value: unknown) {
  if (value === '' || value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 100_000 ? parsed : null
}

export function normalizeBhvGuideAnswers(input: Partial<Record<keyof BhvGuideAnswers, unknown>>): BhvGuideAnswers {
  const answers = { ...initialBhvGuideAnswers }
  for (const key of bhvBooleanKeys) if (bhvAnswerValues.includes(input[key] as BhvAnswer)) answers[key] = input[key] as BhvAnswer
  answers.employeeCount = numberOrNull(input.employeeCount)
  answers.maximumPresent = numberOrNull(input.maximumPresent)
  answers.trainedBhvCount = numberOrNull(input.trainedBhvCount)
  answers.minimumBhvPresent = numberOrNull(input.minimumBhvPresent)
  return answers
}

export type BhvScenario = Readonly<{ id: string; label: string }>
const baseScenarios: readonly BhvScenario[] = [
  { id: 'MEDICAL_EMERGENCY', label: 'Onwelwording of medisch incident' },
  { id: 'INJURY', label: 'Letsel tijdens het werk' },
  { id: 'FIRE', label: 'Brand en rookontwikkeling' },
  { id: 'EVACUATION', label: 'Ontruiming van aanwezigen' },
]
const conditionalScenarios: readonly [BhvBooleanKey, BhvScenario][] = [
  ['hazardousSubstances', { id: 'HAZARDOUS_RELEASE', label: 'Vrijkomen van gevaarlijke stoffen' }],
  ['confinedSpaces', { id: 'CONFINED_SPACE', label: 'Incident in een besloten ruimte' }],
  ['asphyxiationRisk', { id: 'ASPHYXIATION', label: 'Verstikking of zuurstoftekort' }],
  ['fireExplosionRisk', { id: 'EXPLOSION', label: 'Explosie of snelle brandontwikkeling' }],
  ['aggressionRisk', { id: 'AGGRESSION', label: 'Agressie of geweld' }],
  ['outdoorRemoteWork', { id: 'REMOTE_INCIDENT', label: 'Incident op een afgelegen werkplek' }],
  ['waterRisk', { id: 'WATER_INCIDENT', label: 'Incident bij of op het water' }],
  ['electricity', { id: 'ELECTRICAL_INCIDENT', label: 'Elektrisch incident' }],
  ['workAtHeight', { id: 'HEIGHT_INCIDENT', label: 'Val of redding op hoogte' }],
]
export function selectBhvScenarios(answers: BhvGuideAnswers): readonly BhvScenario[] {
  return [...baseScenarios, ...conditionalScenarios.filter(([key]) => answers[key] === 'YES').map(([, scenario]) => scenario)]
}

export const bhvResultCodes = [
  'BHV_ORGANISATION', 'AVAILABILITY_COVERAGE', 'ALARM_COMMUNICATION', 'FIRST_AID', 'FIRE_EVACUATION',
  'SELF_RELIANCE', 'EQUIPMENT_PROVISIONS', 'TRAINING_EXERCISES', 'EMERGENCY_SERVICES_COORDINATION', 'RIE_CHANGE_MANAGEMENT',
] as const
export type BhvResultCode = (typeof bhvResultCodes)[number]
export type BhvGuideResult = Readonly<{
  id: BhvResultCode; title: string; status: ComplianceResultStatus; explanation: string; relevance: string; nextStep: string
  sourceIds: readonly PublicSourceId[]; answerKeys: readonly (keyof BhvGuideAnswers)[]
}>
const sourceIds: readonly PublicSourceId[] = ['arbowet-current', 'arbeidsinspectie-bhv-2025', 'arboportaal-bhv', 'ai-10-bhv-2001']

function aggregate(answers: BhvGuideAnswers, keys: readonly BhvBooleanKey[]): ComplianceResultStatus {
  const values = keys.map((key) => answers[key])
  if (values.includes('NO')) return 'ACTION'
  if (values.every((value) => value === 'YES')) return 'ORDER'
  return 'CHECK'
}
function result(id: BhvResultCode, title: string, status: ComplianceResultStatus, explanation: string, nextStep: string, answerKeys: readonly (keyof BhvGuideAnswers)[]): BhvGuideResult {
  return { id, title, status, explanation, nextStep, answerKeys, sourceIds, relevance: 'Een doeltreffende BHV-organisatie moet aansluiten op de aanwezige risico’s, mensen, locaties en omstandigheden. Vaste verhoudingsgetallen vervangen die beoordeling niet.' }
}

export function evaluateBhvGuide(raw: BhvGuideAnswers): readonly BhvGuideResult[] {
  const a = normalizeBhvGuideAnswers(raw)
  if (a.hasEmployees === 'NO') return bhvResultCodes.map((id) => result(id, titles[id], 'NOT_APPLICABLE', 'Dit onderdeel is niet beoordeeld omdat u heeft aangegeven geen werknemers te hebben.', 'Controleer bij twijfel of er toch werkgeversverplichtingen of afspraken voor aanwezige derden gelden.', ['hasEmployees']))
  const specialist = conditionalScenarios.some(([key]) => a[key] === 'YES')
  const availability = aggregate(a, ['coverageNormal', 'replacement', 'breakCoverage', 'simultaneousTasks', ...(a.outsideHours === 'YES' ? ['coverageOutsideHours' as const] : []), ...(a.multipleLocations === 'YES' || a.multipleBuildings === 'YES' ? ['coverageSpread' as const] : [])])
  const countCheck = a.trainedBhvCount === null || a.minimumBhvPresent === null ? 'CHECK' : a.trainedBhvCount === 0 || a.minimumBhvPresent === 0 ? 'ACTION' : availability
  return [
    result('BHV_ORGANISATION', titles.BHV_ORGANISATION, aggregate(a, ['taskDivision', 'coordination', 'alarmOrganized']), 'De organisatie moet herkenbare taken, alarmering en coördinatie hebben die passen bij de voorziene incidenten.', 'Leg taken, alarmering, onderlinge afstemming en vervanging vast in werkbare BHV-afspraken.', ['taskDivision', 'coordination', 'alarmOrganized']),
    result('AVAILABILITY_COVERAGE', titles.AVAILABILITY_COVERAGE, countCheck, 'Niet alleen het aantal opgeleide BHV’ers telt: tijdens alle relevante werktijden en op alle locaties moet voldoende inzet feitelijk beschikbaar zijn.', 'Toets roosters, pauzes, verlof, ziekte, spreiding en gelijktijdige taken aan de maatgevende scenario’s.', ['trainedBhvCount', 'minimumBhvPresent', 'coverageNormal', 'coverageOutsideHours', 'coverageSpread', 'replacement', 'breakCoverage', 'simultaneousTasks']),
    result('ALARM_COMMUNICATION', titles.ALARM_COMMUNICATION, aggregate(a, ['alarmOrganized', 'alarmMeans', 'communicationMeans']), 'Snelle alarmering en betrouwbare communicatie bepalen of BHV-taken tijdig kunnen starten en worden gecoördineerd.', 'Beproef alarmering en communicatiemiddelen in normale én afwijkende bezettingssituaties.', ['alarmOrganized', 'alarmMeans', 'communicationMeans']),
    result('FIRST_AID', titles.FIRST_AID, aggregate(a, ['firstAidResources', 'trained', 'coverageNormal']), 'Eerste hulp vraagt bereikbare middelen én aanwezige mensen die de benodigde handelingen kunnen uitvoeren.', 'Controleer bereikbaarheid, inhoud en onderhoud van middelen en koppel opleiding aan de letselscenario’s uit de RI&E.', ['firstAidResources', 'trained', 'coverageNormal']),
    result('FIRE_EVACUATION', titles.FIRE_EVACUATION, aggregate(a, ['evacuationInfo', 'emergencyLighting', 'alarmMeans', 'scenariosExercised']), 'Brandbestrijding in de beginfase en veilige ontruiming vragen passende routes, alarmering, instructie en oefening.', 'Beproef de relevante brand- en ontruimingsscenario’s met de werkelijke bezetting en gebouwsituatie.', ['evacuationInfo', 'emergencyLighting', 'alarmMeans', 'scenariosExercised']),
    result('SELF_RELIANCE', titles.SELF_RELIANCE, aggregate(a, ['scenarioSpecificMeansAssessed', 'workersInformed']), 'Niet-zelfredzame of onbekende aanwezigen kunnen extra begeleiding, tijd, middelen en taakverdeling nodig maken.', 'Werk per aanwezige groep uit wie helpt, welke route bruikbaar is en welke voorzieningen nodig zijn.', ['childrenPresent', 'elderlyPresent', 'physicalLimitations', 'cognitiveLimitations', 'unfamiliarVisitors', 'scenarioSpecificMeansAssessed', 'workersInformed']),
    result('EQUIPMENT_PROVISIONS', titles.EQUIPMENT_PROVISIONS, specialist ? aggregate(a, ['firstAidResources', 'alarmMeans', 'communicationMeans', 'accessMeans', 'equipmentMaintenance', 'scenarioSpecificMeansAssessed']) : aggregate(a, ['firstAidResources', 'alarmMeans', 'communicationMeans', 'equipmentMaintenance']), specialist ? 'De aanwezige bijzondere risico’s vragen om een expliciete beoordeling van aanvullende deskundigheid en middelen; de wijzer schrijft die middelen niet zelfstandig voor.' : 'BHV-middelen moeten bereikbaar, bruikbaar en onderhouden zijn voor de scenario’s die in uw situatie geloofwaardig zijn.', 'Leg per scenario vast welke middelen nodig zijn, waar die zich bevinden, wie ze gebruikt en hoe onderhoud wordt gecontroleerd.', ['firstAidResources', 'alarmMeans', 'communicationMeans', 'accessMeans', 'equipmentMaintenance', 'scenarioSpecificMeansAssessed']),
    result('TRAINING_EXERCISES', titles.TRAINING_EXERCISES, aggregate(a, ['trained', 'skillsMaintained', 'exercisesHeld', 'scenariosExercised', 'exerciseEvaluated', 'actionsFollowedUp']), 'Opleiding en oefeningen moeten aansluiten op de eigen scenario’s en aantoonbaar leiden tot leren en bijstellen.', 'Plan scenario-gerichte oefeningen, evalueer uitvoering en doorlooptijden en volg verbeteracties aantoonbaar op.', ['trained', 'skillsMaintained', 'exercisesHeld', 'scenariosExercised', 'exerciseEvaluated', 'actionsFollowedUp']),
    result('EMERGENCY_SERVICES_COORDINATION', titles.EMERGENCY_SERVICES_COORDINATION, aggregate(a, ['emergencyReception', 'accessMeans', 'communicationMeans']), 'Een effectieve aansluiting op externe hulpdiensten vraagt bereikbaarheid, opvang en snelle overdracht van relevante informatie.', 'Controleer toegang, opvanglocatie, contactwijze en overdrachtsinformatie samen met de eigen incidentorganisatie.', ['emergencyReception', 'accessMeans', 'communicationMeans']),
    result('RIE_CHANGE_MANAGEMENT', titles.RIE_CHANGE_MANAGEMENT, aggregate(a, ['rieAligned', 'changeReview', 'periodicReview', 'responsibilitiesAssigned']), 'BHV blijft alleen passend wanneer wijzigingen in werk, mensen, locaties en risico’s terugvloeien naar RI&E, scenario’s en maatregelen.', 'Leg eigenaar, controlemomenten en wijzigingstriggers vast en actualiseer scenario’s, taken, middelen en oefeningen waar nodig.', ['rieAligned', 'changeReview', 'periodicReview', 'responsibilitiesAssigned']),
  ]
}

export const titles: Record<BhvResultCode, string> = {
  BHV_ORGANISATION: 'BHV-organisatie', AVAILABILITY_COVERAGE: 'Beschikbaarheid en dekking', ALARM_COMMUNICATION: 'Alarmering en communicatie',
  FIRST_AID: 'Eerste hulp', FIRE_EVACUATION: 'Brand en ontruiming', SELF_RELIANCE: 'Zelfredzaamheid en aanwezige groepen',
  EQUIPMENT_PROVISIONS: 'Middelen en voorzieningen', TRAINING_EXERCISES: 'Opleiding en oefenen',
  EMERGENCY_SERVICES_COORDINATION: 'Aansluiting op externe hulpdiensten', RIE_CHANGE_MANAGEMENT: 'RI&E en wijzigingsbeheer',
}

export function summarizeBhvResults(results: readonly BhvGuideResult[]) {
  return { order: results.filter((r) => r.status === 'ORDER').length, action: results.filter((r) => r.status === 'ACTION').length, check: results.filter((r) => r.status === 'CHECK').length, notApplicable: results.filter((r) => r.status === 'NOT_APPLICABLE').length }
}
