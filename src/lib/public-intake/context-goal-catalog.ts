import type { ContextGoal } from './context-question-engine-types'

const options = (...entries: readonly (readonly [string, string])[]) =>
  Object.freeze(entries.map(([code, label]) => Object.freeze({ code, label })))

const applicability = (input: {
  requiredFactCodes?: readonly string[]
  requiredAnyFactCodes?: readonly string[]
  excludedFactValues?: readonly Readonly<{ code: string; values: readonly (string | number | boolean)[] }>[]
} = {}) => Object.freeze({
  requiredFactCodes: Object.freeze([...(input.requiredFactCodes ?? [])]),
  requiredAnyFactCodes: Object.freeze([...(input.requiredAnyFactCodes ?? [])]),
  excludedFactValues: Object.freeze([...(input.excludedFactValues ?? [])]),
})

export const compatibilityContextGoals = Object.freeze([
  {
    code: 'SECTOR', questionKey: 'context_sector', purpose: 'De beheerde sector vaststellen voor opdrachtcontext en matching.', text: 'In welke sector is uw organisatie actief?', answerType: 'OPTION', options: [], category: 'ORGANIZATION',
    relevantConceptCodes: [], satisfiesFactCodes: ['SECTOR'], equivalentGoalCodes: [], groundingPolicy: 'SHARED_CONTEXT', applicability: applicability(), mandatory: true, universal: true,
    baseRelevance: 1, informationGain: 0.9, matchingValue: 1, userBurden: 0.2,
  },
  {
    code: 'RIE_STATUS', questionKey: 'context_rie_status', purpose: 'Onderscheiden of een RI&E nieuw, te actualiseren of te controleren is.', text: 'Gaat het om een nieuwe RI&E of om een bestaande RI&E?', answerType: 'OPTION',
    options: options(['NEW', 'Een nieuwe RI&E'], ['UPDATE', 'Een bestaande RI&E actualiseren'], ['CHECK', 'Een bestaande RI&E controleren'], ['UNKNOWN', 'Dat weet ik nog niet']), category: 'EXISTING_CONTROL',
    relevantConceptCodes: ['RIE'], satisfiesFactCodes: ['RIE_INTENT'], equivalentGoalCodes: [], groundingPolicy: 'SHARED_CONTEXT', applicability: applicability(), mandatory: true, universal: false,
    baseRelevance: 1, informationGain: 1, matchingValue: 0.8, userBurden: 0.2,
  },
  {
    code: 'ORGANIZATION_SIZE', questionKey: 'context_employee_count', purpose: 'De globale organisatieomvang vastleggen.', text: 'Hoe groot is uw organisatie ongeveer?', answerType: 'OPTION',
    options: options(['ONE_TO_TEN', '1 tot en met 10 medewerkers'], ['ELEVEN_TO_FIFTY', '11 tot en met 50 medewerkers'], ['FIFTY_ONE_TO_TWO_FIFTY', '51 tot en met 250 medewerkers'], ['MORE_THAN_TWO_FIFTY', 'Meer dan 250 medewerkers']), category: 'SCOPE',
    relevantConceptCodes: ['RIE'], satisfiesFactCodes: ['ORGANIZATION_SIZE'], equivalentGoalCodes: ['EMPLOYEE_PRESENCE'], groundingPolicy: 'SHARED_CONTEXT', applicability: applicability(), mandatory: false, universal: true,
    baseRelevance: 0.75, informationGain: 0.65, matchingValue: 0.8, userBurden: 0.2,
  },
  {
    code: 'WORKSITE_COUNT', questionKey: 'context_location_count', purpose: 'De omvang over werklocaties vastleggen.', text: 'Voor hoeveel locaties heeft u ondersteuning nodig?', answerType: 'OPTION',
    options: options(['ONE', 'Eén locatie'], ['TWO_TO_FIVE', 'Twee tot en met vijf locaties'], ['MORE_THAN_FIVE', 'Meer dan vijf locaties']), category: 'SCOPE',
    relevantConceptCodes: ['RIE'], satisfiesFactCodes: ['WORKSITE_COUNT'], equivalentGoalCodes: [], groundingPolicy: 'SHARED_CONTEXT', applicability: applicability(), mandatory: false, universal: true,
    baseRelevance: 0.7, informationGain: 0.7, matchingValue: 0.8, userBurden: 0.2,
  },
  {
    code: 'START_WINDOW', questionKey: 'context_preferred_start', purpose: 'De globale gewenste start voor opdrachtcontext vastleggen.', text: 'Wanneer wilt u bij voorkeur starten?', answerType: 'OPTION',
    options: options(['ASAP', 'Zo snel mogelijk'], ['FOUR_WEEKS', 'Binnen vier weken'], ['THREE_MONTHS', 'Binnen drie maanden'], ['ORIENTING', 'Ik oriënteer mij nog']), category: 'URGENCY',
    relevantConceptCodes: ['RIE', 'EMERGENCY_RESPONSE'], satisfiesFactCodes: ['START_WINDOW'], equivalentGoalCodes: [], groundingPolicy: 'SHARED_CONTEXT', applicability: applicability(), mandatory: false, universal: true,
    baseRelevance: 0.55, informationGain: 0.45, matchingValue: 0.75, userBurden: 0.15,
  },
  {
    code: 'WORK_ACTIVITY', questionKey: 'context_work_activity', purpose: 'Werkzaamheden onderscheiden zonder een oorzaak te veronderstellen.', text: 'Om wat voor werkzaamheden gaat het vooral?', answerType: 'OPTION',
    options: options(['PHYSICAL', 'Vooral lichamelijk werk'], ['SCREEN_OFFICE', 'Vooral beeldscherm- of kantoorwerk'], ['MIXED', 'Een combinatie'], ['OTHER', 'Iets anders']), category: 'WORK',
    relevantConceptCodes: ['HEALTH_COMPLAINT', 'OCCUPATIONAL_HEALTH', 'INCIDENT', 'EXPOSURE'], satisfiesFactCodes: ['WORK_ACTIVITY', 'OCCUPATION'], equivalentGoalCodes: ['OCCUPATION'], groundingPolicy: 'SHARED_CONTEXT', applicability: applicability(), mandatory: false, universal: true,
    baseRelevance: 0.95, informationGain: 0.95, matchingValue: 0.75, userBurden: 0.2,
  },
  {
    code: 'LOCATION_PATTERN', questionKey: 'context_location_pattern', purpose: 'Bepalen of een klacht of risico aan een locatie of werkplekpatroon is verbonden.', text: 'Speelt dit vooral op één werkplek of locatie?', answerType: 'OPTION',
    options: options(['ONE_LOCATION', 'Vooral op één werkplek of locatie'], ['MULTIPLE_LOCATIONS', 'Op meerdere locaties'], ['NO_CLEAR_PATTERN', 'Er is geen duidelijk locatiepatroon'], ['UNKNOWN', 'Dat weet ik niet']), category: 'WORK',
    relevantConceptCodes: ['HEALTH_COMPLAINT', 'EXPOSURE', 'WORK_ENVIRONMENT_CHANGE'], satisfiesFactCodes: ['LOCATION_PATTERN'], equivalentGoalCodes: ['WORK_LOCATION_PATTERN'], groundingPolicy: 'SHARED_CONTEXT', applicability: applicability(), mandatory: false, universal: true,
    baseRelevance: 0.85, informationGain: 0.9, matchingValue: 0.65, userBurden: 0.2,
  },
  {
    code: 'WORK_ENVIRONMENT_CHANGE', questionKey: 'context_environment_change', purpose: 'Vaststellen of de werkomgeving recent is veranderd.', text: 'Is de werkplek of werkomgeving onlangs veranderd?', answerType: 'OPTION',
    options: options(['YES', 'Ja'], ['NO', 'Nee'], ['UNKNOWN', 'Dat weet ik niet']), category: 'WORK',
    relevantConceptCodes: ['HEALTH_COMPLAINT', 'WORK_ENVIRONMENT_CHANGE'], satisfiesFactCodes: ['WORK_ENVIRONMENT_CHANGE'], equivalentGoalCodes: [], groundingPolicy: 'SHARED_CONTEXT', applicability: applicability(), mandatory: false, universal: true,
    baseRelevance: 0.8, informationGain: 0.8, matchingValue: 0.6, userBurden: 0.15,
  },
  {
    code: 'EXPOSURE_SOURCE', questionKey: 'context_exposure_source', purpose: 'Een mogelijke blootstellingsbron feitelijk onderscheiden.', text: 'Welke mogelijke bron of stof is in de werksituatie aanwezig?', answerType: 'OPTION',
    options: options(['DUST', 'Stof of vezels'], ['FUMES_GASES', 'Dampen, gassen of rook'], ['CHEMICAL_PRODUCT', 'Een chemisch product'], ['COMBUSTION_EQUIPMENT', 'Verbrandingsmotoren of aangedreven arbeidsmiddelen'], ['UNKNOWN', 'Dat weet ik niet']), category: 'EXPOSURE',
    relevantConceptCodes: ['EXPOSURE', 'HAZARDOUS_SUBSTANCES'], satisfiesFactCodes: ['EXPOSURE_SOURCE'], equivalentGoalCodes: ['EQUIPMENT_OR_PROCESS'], groundingPolicy: 'DOMAIN_SPECIFIC', applicability: applicability({ requiredAnyFactCodes: ['EXPOSURE_SIGNAL'] }), mandatory: false, universal: false,
    baseRelevance: 0.95, informationGain: 1, matchingValue: 0.8, userBurden: 0.25,
  },
  {
    code: 'PHYSICAL_LOAD', questionKey: 'context_physical_load', purpose: 'Lichamelijke belasting alleen specificeren wanneer die richting al is bevestigd.', text: 'Welke lichamelijke belasting speelt vooral?', answerType: 'OPTION',
    options: options(['LIFT_CARRY', 'Tillen of dragen'], ['PUSH_PULL', 'Duwen of trekken'], ['REPETITIVE', 'Repeterend werk'], ['STATIC', 'Langdurig zitten of staan'], ['OTHER', 'Iets anders']), category: 'EXPOSURE',
    relevantConceptCodes: ['PHYSICAL_LOAD'], satisfiesFactCodes: ['PHYSICAL_LOAD'], equivalentGoalCodes: [], groundingPolicy: 'DOMAIN_SPECIFIC', applicability: applicability({ requiredAnyFactCodes: ['PHYSICAL_LOAD_RELEVANT'] }), mandatory: false, universal: false,
    baseRelevance: 0.9, informationGain: 0.8, matchingValue: 0.75, userBurden: 0.2,
  },
  {
    code: 'AFFECTED_SCOPE', questionKey: 'context_affected_scope', purpose: 'De globale reikwijdte vastleggen zonder persoonsgegevens.', text: 'Bij hoeveel medewerkers speelt dit?', answerType: 'OPTION',
    options: options(['ONE', 'Bij één medewerker'], ['MULTIPLE', 'Bij meerdere medewerkers'], ['UNKNOWN', 'Dat weet ik niet']), category: 'SCOPE',
    relevantConceptCodes: ['HEALTH_COMPLAINT', 'INCIDENT'], satisfiesFactCodes: ['AFFECTED_SCOPE', 'AFFECTED_COUNT'], equivalentGoalCodes: [], groundingPolicy: 'SHARED_CONTEXT', applicability: applicability(), mandatory: false, universal: true,
    baseRelevance: 0.75, informationGain: 0.65, matchingValue: 0.65, userBurden: 0.15,
  },
  {
    code: 'EXISTING_ASSESSMENT', questionKey: 'context_existing_investigation', purpose: 'Vaststellen of de situatie al is beoordeeld of onderzocht.', text: 'Is deze situatie al onderzocht of beoordeeld?', answerType: 'OPTION',
    options: options(['YES', 'Ja'], ['NO', 'Nee'], ['UNKNOWN', 'Dat weet ik niet']), category: 'EXISTING_CONTROL',
    relevantConceptCodes: ['HEALTH_COMPLAINT', 'RIE', 'INCIDENT', 'EXPOSURE'], satisfiesFactCodes: ['EXISTING_ASSESSMENT'], equivalentGoalCodes: [], groundingPolicy: 'SHARED_CONTEXT', applicability: applicability({ excludedFactValues: [{ code: 'RIE_INTENT', values: ['NEW', 'NEW_RIE'] }] }), mandatory: false, universal: true,
    baseRelevance: 0.7, informationGain: 0.75, matchingValue: 0.55, userBurden: 0.15,
  },
  {
    code: 'DURATION_FREQUENCY', questionKey: 'context_duration_frequency', purpose: 'Het patroon in tijd en frequentie verduidelijken.', text: 'Wanneer of hoe vaak doet de situatie zich tijdens het werk voor?', answerType: 'OPTION',
    options: options(['CONTINUOUS', 'Vrijwel voortdurend'], ['REPEATED', 'Regelmatig of herhaald'], ['SPECIFIC_ACTIVITY', 'Tijdens een specifieke activiteit'], ['INCIDENTAL', 'Incidenteel'], ['UNKNOWN', 'Dat weet ik niet']), category: 'EXPOSURE',
    relevantConceptCodes: ['HEALTH_COMPLAINT', 'EXPOSURE', 'INCIDENT'], satisfiesFactCodes: ['DURATION_FREQUENCY'], equivalentGoalCodes: [], groundingPolicy: 'SHARED_CONTEXT', applicability: applicability(), mandatory: false, universal: true,
    baseRelevance: 0.75, informationGain: 0.8, matchingValue: 0.55, userBurden: 0.2,
  },
  {
    code: 'URGENCY', questionKey: 'context_urgency', purpose: 'Acute onveiligheid onderscheiden zonder noodrespons te suggereren.', text: 'Is er nu sprake van een acute onveilige situatie?', answerType: 'OPTION',
    options: options(['YES', 'Ja'], ['NO', 'Nee'], ['UNKNOWN', 'Dat weet ik niet']), category: 'URGENCY',
    relevantConceptCodes: ['INCIDENT', 'HAZARDOUS_SUBSTANCES', 'EMERGENCY_RESPONSE'], satisfiesFactCodes: ['URGENCY'], equivalentGoalCodes: [], groundingPolicy: 'SHARED_CONTEXT', applicability: applicability(), mandatory: true, universal: true,
    baseRelevance: 1, informationGain: 1, matchingValue: 0.4, userBurden: 0.1,
  },
] as const satisfies readonly ContextGoal[])

const byQuestionKey = new Map<string, ContextGoal>(
  compatibilityContextGoals.map((goal) => [goal.questionKey, goal]),
)

export function getCompatibilityContextGoal(questionKey: string): ContextGoal | null {
  return byQuestionKey.get(questionKey) ?? null
}
