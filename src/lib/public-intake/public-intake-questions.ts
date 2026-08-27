import type {
  PublicIntakeAnswerType,
  PublicIntakeQuestionPurpose,
} from '@/generated/prisma/client'

export type PublicIntakeQuestionDefinition = {
  questionKey: string
  version: number
  purpose: PublicIntakeQuestionPurpose
  answerType: PublicIntakeAnswerType
  requiredForSubmission: boolean
  canSkip: boolean
  decisionPurpose: string
  validation: {
    minLength?: number
    maxLength?: number
    minNumber?: number
    maxNumber?: number
    options?: readonly string[]
  }
  decision: {
    enabled: boolean
    required: boolean
    optional: boolean
    dependsOn: readonly string[]
    visibleWhen: readonly PublicIntakeQuestionCondition[]
    repeatIfUnknown: boolean
    category: PublicIntakeDecisionCategory
    order: number
  }
}

export type PublicIntakeDecisionCategory =
  | 'SITUATION'
  | 'ORGANIZATION'
  | 'PLANNING'

export type PublicIntakeQuestionCondition = {
  questionKey: string
  values?: readonly (string | number | boolean)[]
  dispositions?: readonly ('ANSWERED' | 'UNKNOWN' | 'SKIPPED')[]
}

export const publicIntakeQuestions = [
  {
    questionKey: 'guidance_topic',
    version: 1,
    purpose: 'CLARIFICATION',
    answerType: 'OPTION',
    requiredForSubmission: false,
    canSkip: false,
    decisionPurpose:
      'Het onderwerp van een nog niet geclassificeerde hulpvraag expliciet laten kiezen.',
    validation: {
      options: [
        'HAZARDOUS_SUBSTANCES',
        'INCIDENT',
        'RIE',
        'HEALTH_WORKLOAD',
        'OCCUPATIONAL_HEALTH',
        'EMERGENCY_RESPONSE',
        'OTHER',
      ],
    },
    decision: {
      enabled: false,
      required: true,
      optional: false,
      dependsOn: [],
      visibleWhen: [],
      repeatIfUnknown: true,
      category: 'SITUATION',
      order: 1,
    },
  },
  ...([
    ['context_rie_status', ['Een nieuwe RI&E', 'Een bestaande RI&E actualiseren', 'Een bestaande RI&E controleren', 'Dat weet ik nog niet']],
    ['context_employee_count', ['1 tot en met 10 medewerkers', '11 tot en met 50 medewerkers', '51 tot en met 250 medewerkers', 'Meer dan 250 medewerkers']],
    ['context_location_count', ['Eén locatie', 'Twee tot en met vijf locaties', 'Meer dan vijf locaties']],
    ['context_preferred_start', ['Zo snel mogelijk', 'Binnen vier weken', 'Binnen drie maanden', 'Ik oriënteer mij nog']],
    ['context_work_activity', ['Vooral lichamelijk werk', 'Vooral beeldscherm- of kantoorwerk', 'Een combinatie', 'Iets anders']],
    ['context_physical_load', ['Tillen of dragen', 'Duwen of trekken', 'Repeterend werk', 'Langdurig zitten of staan', 'Iets anders']],
    ['context_affected_scope', ['Bij één medewerker', 'Bij meerdere medewerkers', 'Dat weet ik niet']],
    ['context_existing_investigation', ['Ja', 'Nee', 'Dat weet ik niet']],
    ['context_urgency', ['Ja', 'Nee', 'Dat weet ik niet']],
  ] as readonly (readonly [string, readonly string[]])[]).map(([questionKey, options], index): PublicIntakeQuestionDefinition => ({
    questionKey,
    version: 1,
    purpose: 'CLARIFICATION' as const,
    answerType: 'OPTION' as const,
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose: 'Alleen aanvullende feitelijke context voor de bestaande adviesregels vastleggen.',
    validation: { options },
    decision: { enabled: false, required: false, optional: true, dependsOn: [], visibleWhen: [], repeatIfUnknown: false, category: 'SITUATION' as const, order: 2 + index },
  })),
  {
    questionKey: 'rie_has_employees',
    version: 1,
    purpose: 'CLARIFICATION',
    answerType: 'BOOLEAN',
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose:
      'Expliciet vastleggen of de organisatie personeel heeft.',
    validation: {},
    decision: {
      enabled: false,
      required: true,
      optional: false,
      dependsOn: [],
      visibleWhen: [],
      repeatIfUnknown: true,
      category: 'SITUATION',
      order: 5,
    },
  },
  {
    questionKey: 'incident_injury_occurred',
    version: 1,
    purpose: 'CLARIFICATION',
    answerType: 'BOOLEAN',
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose:
      'Expliciet vastleggen of bij het incident letsel is ontstaan.',
    validation: {},
    decision: {
      enabled: false,
      required: true,
      optional: false,
      dependsOn: [],
      visibleWhen: [],
      repeatIfUnknown: true,
      category: 'SITUATION',
      order: 2,
    },
  },
  {
    questionKey: 'hazardous_substances_storage',
    version: 1,
    purpose: 'CLARIFICATION',
    answerType: 'BOOLEAN',
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose:
      'Expliciet vastleggen of de situatie opslag van gevaarlijke stoffen betreft.',
    validation: {},
    decision: {
      enabled: false,
      required: true,
      optional: false,
      dependsOn: [],
      visibleWhen: [],
      repeatIfUnknown: true,
      category: 'SITUATION',
      order: 2,
    },
  },
  {
    questionKey: 'hazardous_substances_transport',
    version: 1,
    purpose: 'CLARIFICATION',
    answerType: 'BOOLEAN',
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose:
      'Expliciet vastleggen of de situatie vervoer van gevaarlijke stoffen betreft.',
    validation: {},
    decision: {
      enabled: false,
      required: true,
      optional: false,
      dependsOn: [],
      visibleWhen: [],
      repeatIfUnknown: true,
      category: 'SITUATION',
      order: 3,
    },
  },
  {
    questionKey: 'hazardous_substances_loading_unloading',
    version: 1,
    purpose: 'CLARIFICATION',
    answerType: 'BOOLEAN',
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose:
      'Expliciet vastleggen of de situatie laden of lossen van gevaarlijke stoffen betreft.',
    validation: {},
    decision: {
      enabled: false,
      required: true,
      optional: false,
      dependsOn: [],
      visibleWhen: [],
      repeatIfUnknown: true,
      category: 'SITUATION',
      order: 4,
    },
  },
  {
    questionKey: 'rie_existing_status',
    version: 1,
    purpose: 'CLARIFICATION',
    answerType: 'OPTION',
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose: 'Bepalen of ondersteuning gaat over opstellen, actualiseren of controleren.',
    validation: { options: ['NONE', 'NEEDS_UPDATE', 'COMPLIANCE_UNCERTAIN'] },
    decision: {
      enabled: true,
      required: true,
      optional: false,
      dependsOn: [],
      visibleWhen: [],
      repeatIfUnknown: true,
      category: 'SITUATION',
      order: 10,
    },
  },
  {
    questionKey: 'employee_count_range',
    version: 1,
    purpose: 'MATCHING',
    answerType: 'OPTION',
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose: 'De globale organisatieomvang vastleggen voor context en toekomstige matching.',
    validation: {
      options: [
        'ONE_TO_TEN',
        'ELEVEN_TO_FIFTY',
        'FIFTY_ONE_TO_TWO_FIFTY',
        'MORE_THAN_TWO_FIFTY',
      ],
    },
    decision: {
      enabled: true,
      required: false,
      optional: true,
      dependsOn: ['rie_existing_status'],
      visibleWhen: [
        {
          questionKey: 'rie_existing_status',
          values: ['NONE'],
          dispositions: ['ANSWERED', 'UNKNOWN'],
        },
      ],
      repeatIfUnknown: false,
      category: 'ORGANIZATION',
      order: 20,
    },
  },
  {
    questionKey: 'rie_current_age',
    version: 1,
    purpose: 'CLARIFICATION',
    answerType: 'OPTION',
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose: 'De ouderdom van de bestaande RI&E als actualisatiecontext vastleggen.',
    validation: {
      options: ['LESS_THAN_ONE_YEAR', 'ONE_TO_THREE_YEARS', 'MORE_THAN_THREE_YEARS'],
    },
    decision: {
      enabled: true,
      required: false,
      optional: true,
      dependsOn: ['rie_existing_status'],
      visibleWhen: [
        {
          questionKey: 'rie_existing_status',
          values: ['NEEDS_UPDATE', 'COMPLIANCE_UNCERTAIN'],
          dispositions: ['ANSWERED'],
        },
      ],
      repeatIfUnknown: false,
      category: 'SITUATION',
      order: 20,
    },
  },
  {
    questionKey: 'rie_update_reason',
    version: 1,
    purpose: 'CLARIFICATION',
    answerType: 'OPTION',
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose: 'De aanleiding voor actualisatie of controle verduidelijken.',
    validation: {
      options: ['ORGANIZATION_CHANGED', 'WORK_CHANGED', 'INCIDENT_OR_SIGNAL', 'PERIODIC_REVIEW'],
    },
    decision: {
      enabled: true,
      required: false,
      optional: true,
      dependsOn: ['rie_existing_status'],
      visibleWhen: [
        {
          questionKey: 'rie_existing_status',
          values: ['NEEDS_UPDATE', 'COMPLIANCE_UNCERTAIN'],
          dispositions: ['ANSWERED'],
        },
      ],
      repeatIfUnknown: false,
      category: 'SITUATION',
      order: 30,
    },
  },
  {
    questionKey: 'sector',
    version: 1,
    purpose: 'MATCHING',
    answerType: 'TEXT',
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose: 'Sectorcontext vastleggen zonder vooruit te lopen op de definitieve taxonomie.',
    validation: { minLength: 2, maxLength: 120 },
    decision: {
      enabled: true,
      required: false,
      optional: true,
      dependsOn: ['rie_existing_status'],
      visibleWhen: [],
      repeatIfUnknown: false,
      category: 'ORGANIZATION',
      order: 40,
    },
  },
  {
    questionKey: 'location_count',
    version: 1,
    purpose: 'MATCHING',
    answerType: 'NUMBER',
    requiredForSubmission: true,
    canSkip: true,
    decisionPurpose: 'De omvang van de uitvoering over locaties vastleggen.',
    validation: { minNumber: 1, maxNumber: 1000 },
    decision: {
      enabled: true,
      required: true,
      optional: false,
      dependsOn: ['rie_existing_status'],
      visibleWhen: [
        {
          questionKey: 'rie_existing_status',
          values: ['NONE'],
          dispositions: ['ANSWERED', 'UNKNOWN'],
        },
      ],
      repeatIfUnknown: true,
      category: 'ORGANIZATION',
      order: 50,
    },
  },
  {
    questionKey: 'preferred_start_period',
    version: 1,
    purpose: 'MATCHING',
    answerType: 'PERIOD',
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose: 'De gewenste start globaal vastleggen voor planning en toekomstige matching.',
    validation: { options: ['ORIENTING', 'SOON', 'SPECIFIC_DATE'] },
    decision: {
      enabled: true,
      required: false,
      optional: true,
      dependsOn: ['rie_existing_status'],
      visibleWhen: [],
      repeatIfUnknown: false,
      category: 'PLANNING',
      order: 60,
    },
  },
  {
    questionKey: 'preferred_start_date',
    version: 1,
    purpose: 'MATCHING',
    answerType: 'DATE',
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose: 'Een gekozen specifieke startperiode nauwkeurig vastleggen.',
    validation: {},
    decision: {
      enabled: false,
      required: false,
      optional: true,
      dependsOn: ['preferred_start_period'],
      visibleWhen: [
        {
          questionKey: 'preferred_start_period',
          values: ['SPECIFIC_DATE'],
          dispositions: ['ANSWERED'],
        },
      ],
      repeatIfUnknown: false,
      category: 'PLANNING',
      order: 70,
    },
  },
  {
    questionKey: 'remote_allowed',
    version: 1,
    purpose: 'MATCHING',
    answerType: 'BOOLEAN',
    requiredForSubmission: false,
    canSkip: true,
    decisionPurpose: 'Vastleggen of uitvoering op afstand passend kan zijn.',
    validation: {},
    decision: {
      enabled: false,
      required: false,
      optional: true,
      dependsOn: [],
      visibleWhen: [],
      repeatIfUnknown: false,
      category: 'ORGANIZATION',
      order: 80,
    },
  },
] as const satisfies readonly PublicIntakeQuestionDefinition[]

const questionsByKey = new Map<string, PublicIntakeQuestionDefinition>(
  publicIntakeQuestions.map((question) => [question.questionKey, question]),
)

export function getPublicIntakeQuestion(
  questionKey: string,
): PublicIntakeQuestionDefinition | null {
  return questionsByKey.get(questionKey) ?? null
}
