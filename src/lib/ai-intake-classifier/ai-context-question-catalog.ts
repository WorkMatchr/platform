import type { AIIntakeSubjectCode } from './ai-classifier-contract'

export const AI_CONTEXT_QUESTION_CATALOG_VERSION = 'ai-context-questions/1.2.0' as const

export type AIContextQuestion = Readonly<{
  questionKey: string
  subjectCodes: readonly AIIntakeSubjectCode[]
  text: string
  answerType: 'OPTION'
  options: readonly string[]
  category: 'ORGANIZATION' | 'WORK' | 'EXPOSURE' | 'SCOPE' | 'EXISTING_CONTROL' | 'URGENCY'
  unknownText?: string
}>

export const aiContextQuestionCatalog = Object.freeze([
  {
    questionKey: 'context_sector', subjectCodes: ['HAZARDOUS_SUBSTANCES', 'INCIDENT', 'RIE', 'OCCUPATIONAL_HEALTH', 'EMERGENCY_RESPONSE'],
    text: 'In welke sector is uw organisatie actief?', answerType: 'OPTION',
    options: [], category: 'ORGANIZATION',
  },
  {
    questionKey: 'context_rie_status', subjectCodes: ['RIE'],
    text: 'Gaat het om een nieuwe RI&E of om een bestaande RI&E?', answerType: 'OPTION',
    options: ['Een nieuwe RI&E', 'Een bestaande RI&E actualiseren', 'Een bestaande RI&E controleren', 'Dat weet ik nog niet'], category: 'EXISTING_CONTROL',
  },
  {
    questionKey: 'context_employee_count', subjectCodes: ['RIE'],
    text: 'Hoe groot is uw organisatie ongeveer?', answerType: 'OPTION',
    options: ['1 tot en met 10 medewerkers', '11 tot en met 50 medewerkers', '51 tot en met 250 medewerkers', 'Meer dan 250 medewerkers'], category: 'SCOPE',
  },
  {
    questionKey: 'context_location_count', subjectCodes: ['RIE'],
    text: 'Voor hoeveel locaties heeft u ondersteuning nodig?', answerType: 'OPTION',
    options: ['Eén locatie', 'Twee tot en met vijf locaties', 'Meer dan vijf locaties'], category: 'SCOPE',
  },
  {
    questionKey: 'context_preferred_start', subjectCodes: ['RIE'],
    text: 'Wanneer wilt u bij voorkeur starten?', answerType: 'OPTION',
    options: ['Zo snel mogelijk', 'Binnen vier weken', 'Binnen drie maanden', 'Ik oriënteer mij nog'], category: 'URGENCY',
  },
  {
    questionKey: 'context_work_activity', subjectCodes: ['OCCUPATIONAL_HEALTH'],
    text: 'Om wat voor werkzaamheden gaat het vooral?', answerType: 'OPTION',
    options: ['Vooral lichamelijk werk', 'Vooral beeldscherm- of kantoorwerk', 'Een combinatie', 'Iets anders'], category: 'WORK',
  },
  {
    questionKey: 'context_physical_load', subjectCodes: ['OCCUPATIONAL_HEALTH'],
    text: 'Welke lichamelijke belasting speelt vooral?', answerType: 'OPTION',
    options: ['Tillen of dragen', 'Duwen of trekken', 'Repeterend werk', 'Langdurig zitten of staan', 'Iets anders'], category: 'EXPOSURE',
  },
  {
    questionKey: 'context_affected_scope', subjectCodes: ['OCCUPATIONAL_HEALTH', 'INCIDENT', 'RIE'],
    text: 'Bij hoeveel medewerkers speelt dit?', answerType: 'OPTION',
    options: ['Bij één medewerker', 'Bij meerdere medewerkers', 'Dat weet ik niet'], category: 'SCOPE',
  },
  {
    questionKey: 'context_existing_investigation', subjectCodes: ['OCCUPATIONAL_HEALTH', 'RIE', 'INCIDENT'],
    text: 'Is deze situatie al onderzocht of opgenomen in een RI&E?', answerType: 'OPTION',
    options: ['Ja', 'Nee', 'Dat weet ik niet'], category: 'EXISTING_CONTROL',
    unknownText: 'Het is niet bekend of deze situatie al is onderzocht of in de RI&E is opgenomen.',
  },
  {
    questionKey: 'context_urgency', subjectCodes: ['INCIDENT', 'HAZARDOUS_SUBSTANCES', 'EMERGENCY_RESPONSE'],
    text: 'Is er nu sprake van een acute onveilige situatie?', answerType: 'OPTION',
    options: ['Ja', 'Nee', 'Dat weet ik niet'], category: 'URGENCY',
  },
] as const satisfies readonly AIContextQuestion[])

const byKey = new Map<string, AIContextQuestion>(
  aiContextQuestionCatalog.map((question): [string, AIContextQuestion] => [question.questionKey, question]),
)
export function getAIContextQuestion(questionKey: string): AIContextQuestion | null { return byKey.get(questionKey) ?? null }
