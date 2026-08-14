import type { AIIntakeSubjectCode } from './ai-classifier-contract'

export const AI_CONTEXT_QUESTION_CATALOG_VERSION = 'ai-context-questions/1.0.0' as const

export type AIContextQuestion = Readonly<{
  questionKey: string
  subjectCodes: readonly AIIntakeSubjectCode[]
  text: string
  answerType: 'OPTION'
  options: readonly string[]
  category: 'WORK' | 'EXPOSURE' | 'SCOPE' | 'EXISTING_CONTROL' | 'URGENCY'
  unknownText?: string
}>

export const aiContextQuestionCatalog = Object.freeze([
  {
    questionKey: 'context_work_activity', subjectCodes: ['OCCUPATIONAL_HEALTH', 'RIE'],
    text: 'Om wat voor werkzaamheden gaat het vooral?', answerType: 'OPTION',
    options: ['Vooral lichamelijk werk', 'Vooral beeldscherm- of kantoorwerk', 'Een combinatie', 'Iets anders'], category: 'WORK',
  },
  {
    questionKey: 'context_physical_load', subjectCodes: ['OCCUPATIONAL_HEALTH'],
    text: 'Welke lichamelijke belasting speelt vooral?', answerType: 'OPTION',
    options: ['Tillen of dragen', 'Duwen of trekken', 'Repeterend werk', 'Langdurig zitten of staan', 'Iets anders'], category: 'EXPOSURE',
  },
  {
    questionKey: 'context_affected_scope', subjectCodes: ['OCCUPATIONAL_HEALTH', 'INCIDENT'],
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
