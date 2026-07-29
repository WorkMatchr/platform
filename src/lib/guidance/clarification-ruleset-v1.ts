import type { GuidanceTopicCode } from './guidance-ruleset-v1'

export const CLARIFICATION_RULE_SET_VERSION =
  'clarification-rules/1.0.0' as const

export type ClarificationRule = Readonly<{
  code: string
  version: string
  situationCode: GuidanceTopicCode | 'UNCLASSIFIED'
  requiredFactKey: string
  relatedUncertaintyKeys: readonly string[]
  question: Readonly<{
    key: string
    text: string
    answerType: 'BOOLEAN' | 'OPTION'
  }>
  order: number
}>

export const clarificationRulesV1 = Object.freeze([
  {
    code: 'CLARIFY_UNCLASSIFIED_TOPIC',
    version: '1.0.0',
    situationCode: 'UNCLASSIFIED',
    requiredFactKey: 'GUIDANCE_TOPIC',
    relatedUncertaintyKeys: [],
    question: {
      key: 'guidance_topic',
      text: 'Waar gaat uw vraag vooral over?',
      answerType: 'OPTION',
    },
    order: 10,
  },
  {
    code: 'CLARIFY_RIE_EMPLOYEES',
    version: '1.0.0',
    situationCode: 'RIE',
    requiredFactKey: 'HAS_EMPLOYEES',
    relatedUncertaintyKeys: ['HAS_EMPLOYEES_UNKNOWN'],
    question: {
      key: 'rie_has_employees',
      text: 'Heeft u personeel?',
      answerType: 'BOOLEAN',
    },
    order: 10,
  },
  {
    code: 'CLARIFY_INCIDENT_INJURY',
    version: '1.0.0',
    situationCode: 'INCIDENT',
    requiredFactKey: 'INCIDENT_INJURY_OCCURRED',
    relatedUncertaintyKeys: ['INCIDENT_INJURY_UNKNOWN'],
    question: {
      key: 'incident_injury_occurred',
      text: 'Is er letsel?',
      answerType: 'BOOLEAN',
    },
    order: 10,
  },
  {
    code: 'CLARIFY_HAZARDOUS_SUBSTANCES_STORAGE',
    version: '1.0.0',
    situationCode: 'HAZARDOUS_SUBSTANCES',
    requiredFactKey: 'HAZARDOUS_SUBSTANCES_STORAGE',
    relatedUncertaintyKeys: ['HAZARDOUS_SUBSTANCES_STORAGE_UNKNOWN'],
    question: {
      key: 'hazardous_substances_storage',
      text: 'Gaat het om opslag?',
      answerType: 'BOOLEAN',
    },
    order: 10,
  },
  {
    code: 'CLARIFY_HAZARDOUS_SUBSTANCES_TRANSPORT',
    version: '1.0.0',
    situationCode: 'HAZARDOUS_SUBSTANCES',
    requiredFactKey: 'HAZARDOUS_SUBSTANCES_TRANSPORT',
    relatedUncertaintyKeys: ['HAZARDOUS_SUBSTANCES_TRANSPORT_UNKNOWN'],
    question: {
      key: 'hazardous_substances_transport',
      text: 'Gaat het om vervoer?',
      answerType: 'BOOLEAN',
    },
    order: 20,
  },
  {
    code: 'CLARIFY_HAZARDOUS_SUBSTANCES_LOADING_UNLOADING',
    version: '1.0.0',
    situationCode: 'HAZARDOUS_SUBSTANCES',
    requiredFactKey: 'HAZARDOUS_SUBSTANCES_LOADING_UNLOADING',
    relatedUncertaintyKeys: [
      'HAZARDOUS_SUBSTANCES_LOADING_UNLOADING_UNKNOWN',
    ],
    question: {
      key: 'hazardous_substances_loading_unloading',
      text: 'Gaat het om laden of lossen?',
      answerType: 'BOOLEAN',
    },
    order: 30,
  },
] as const satisfies readonly ClarificationRule[])

export function selectClarificationRules(
  situationCode: string,
): readonly ClarificationRule[] {
  return clarificationRulesV1
    .filter((rule) => rule.situationCode === situationCode)
    .sort((left, right) => left.order - right.order)
}
