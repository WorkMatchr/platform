import type {
  GuidanceRuleReference,
  ProfessionalSupportNeedState,
} from './guidance-domain'

export const GUIDANCE_RULE_SET_VERSION = 'guidance-rules/1.1.0' as const

export const guidanceTopicCodes = {
  rie: 'RIE',
  incident: 'INCIDENT',
  hazardousSubstances: 'HAZARDOUS_SUBSTANCES',
  occupationalHealth: 'OCCUPATIONAL_HEALTH',
  emergencyResponse: 'EMERGENCY_RESPONSE',
} as const

export type GuidanceTopicCode =
  (typeof guidanceTopicCodes)[keyof typeof guidanceTopicCodes]

export type GuidanceRule = Readonly<{
  code: string
  version: string
  when: Readonly<{
    situationCode: GuidanceTopicCode
  }>
  then: Readonly<{
    topicCode: GuidanceTopicCode
    knowledgeNeedCode: string
    solutionDirectionCode: string
    solutionDirectionDescription: string
    professionalSupportState: ProfessionalSupportNeedState
  }>
}>

export const guidanceRulesV1 = Object.freeze([
  {
    code: 'GUIDANCE_RIE',
    version: '1.0.0',
    when: {
      situationCode: guidanceTopicCodes.rie,
    },
    then: {
      topicCode: guidanceTopicCodes.rie,
      knowledgeNeedCode: 'KNOWLEDGE_RIE_FOUNDATION',
      solutionDirectionCode: 'UNDERSTAND_RIE_CONTEXT',
      solutionDirectionDescription:
        'Breng eerst de RI&E-situatie, bekende risico’s en openstaande vragen in kaart.',
      professionalSupportState: 'POSSIBLE',
    },
  },
  {
    code: 'GUIDANCE_INCIDENT',
    version: '1.0.0',
    when: {
      situationCode: guidanceTopicCodes.incident,
    },
    then: {
      topicCode: guidanceTopicCodes.incident,
      knowledgeNeedCode: 'KNOWLEDGE_INCIDENT_RESPONSE',
      solutionDirectionCode: 'UNDERSTAND_INCIDENT_CONTEXT',
      solutionDirectionDescription:
        'Breng eerst de feiten, directe veiligheid en mogelijke vervolgstappen rond het incident in kaart.',
      professionalSupportState: 'POSSIBLE',
    },
  },
  {
    code: 'GUIDANCE_HAZARDOUS_SUBSTANCES',
    version: '1.0.0',
    when: {
      situationCode: guidanceTopicCodes.hazardousSubstances,
    },
    then: {
      topicCode: guidanceTopicCodes.hazardousSubstances,
      knowledgeNeedCode: 'KNOWLEDGE_HAZARDOUS_SUBSTANCES_FOUNDATION',
      solutionDirectionCode: 'UNDERSTAND_HAZARDOUS_SUBSTANCES_CONTEXT',
      solutionDirectionDescription:
        'Breng eerst de gebruikte stoffen, werkzaamheden, blootstelling en bestaande maatregelen in kaart.',
      professionalSupportState: 'POSSIBLE',
    },
  },
  {
    code: 'GUIDANCE_OCCUPATIONAL_HEALTH',
    version: '1.0.0',
    when: {
      situationCode: guidanceTopicCodes.occupationalHealth,
    },
    then: {
      topicCode: guidanceTopicCodes.occupationalHealth,
      knowledgeNeedCode: 'KNOWLEDGE_OCCUPATIONAL_HEALTH_FOUNDATION',
      solutionDirectionCode: 'UNDERSTAND_OCCUPATIONAL_HEALTH_CONTEXT',
      solutionDirectionDescription:
        'Breng de relatie tussen het werk, de belasting en de gezondheidssignalen zorgvuldig in kaart.',
      professionalSupportState: 'POSSIBLE',
    },
  },
  {
    code: 'GUIDANCE_EMERGENCY_RESPONSE',
    version: '1.0.0',
    when: {
      situationCode: guidanceTopicCodes.emergencyResponse,
    },
    then: {
      topicCode: guidanceTopicCodes.emergencyResponse,
      knowledgeNeedCode: 'KNOWLEDGE_EMERGENCY_RESPONSE_FOUNDATION',
      solutionDirectionCode: 'UNDERSTAND_EMERGENCY_RESPONSE_CONTEXT',
      solutionDirectionDescription:
        'Beoordeel de bedrijfshulpverlening vanuit de actuele risico’s, bezetting, locaties en noodscenario’s.',
      professionalSupportState: 'POSSIBLE',
    },
  },
] as const satisfies readonly GuidanceRule[])

export function selectGuidanceRules(
  situationCode: string,
): readonly GuidanceRule[] {
  return guidanceRulesV1.filter(
    (rule) => rule.when.situationCode === situationCode,
  )
}

export function toGuidanceRuleReference(
  rule: GuidanceRule,
): GuidanceRuleReference {
  return Object.freeze({
    code: rule.code,
    version: rule.version,
  })
}
