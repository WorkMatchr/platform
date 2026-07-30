import { z } from 'zod'
import {
  contextFactValueTypes,
  dominantContexts,
  GUIDANCE_OUTCOME_SCHEMA_VERSION,
  guidanceOutcomeSpecificities,
  guidanceOutcomeStatuses,
  guidanceSourceKinds,
  professionalAdvicePriorities,
  professionalAdviceRiskDomains,
  PROFESSIONAL_ADVICE_SCHEMA_VERSION,
  professionalRequirementKinds,
  professionalRequirementPriorities,
  PROFESSIONAL_REQUIREMENT_SCHEMA_VERSION,
  professionalRequirementStatuses,
  professionalSupportNeedStates,
  uncertaintyReasons,
  type GuidanceOutcome,
  type HelpRequest,
} from './guidance-domain'
import {
  GUIDANCE_CONTRACT_SCHEMA_VERSION,
  type GuidanceContract,
} from './guidance-contract'

const requiredStringSchema = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0, 'Waarde mag niet leeg zijn.')
const positiveVersionSchema = z.int().positive()
const timestampSchema = z.iso.datetime({ offset: true })
const checksumSchema = z
  .string()
  .regex(/^[0-9a-f]{64}$/)
  .nullable()

const sourceReferenceSchema = z
  .object({
    kind: z.enum(guidanceSourceKinds),
    referenceId: requiredStringSchema,
    version: requiredStringSchema,
  })
  .strict()

const ruleReferenceSchema = z
  .object({
    code: requiredStringSchema,
    version: requiredStringSchema,
  })
  .strict()

const provenanceSchema = z
  .object({
    sources: z.array(sourceReferenceSchema),
    rules: z.array(ruleReferenceSchema),
  })
  .strict()

const executionProvenanceSchema = z
  .object({
    contract: z
      .object({
        schemaVersion: requiredStringSchema,
        id: requiredStringSchema,
        version: positiveVersionSchema,
      })
      .strict(),
    ruleSetVersion: requiredStringSchema,
    engineVersion: requiredStringSchema,
  })
  .strict()

const confirmationSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('UNCONFIRMED') }).strict(),
  z
    .object({
      status: z.enum(['CONFIRMED', 'CORRECTED']),
      actorType: z.enum(['VISITOR_SESSION', 'USER']),
      actorReference: requiredStringSchema.nullable(),
      confirmedAt: timestampSchema,
    })
    .strict(),
])

const situationSchema = z
  .object({
    code: requiredStringSchema,
    description: requiredStringSchema,
    provenance: provenanceSchema,
  })
  .strict()

export const helpRequestContractSchema = z
  .object({
    originalInput: requiredStringSchema,
    confirmedDescription: requiredStringSchema.nullable(),
    confirmation: confirmationSchema,
  })
  .strict()

const contextFactValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.array(z.string()),
])

const contextFactSchema = z
  .object({
    key: requiredStringSchema,
    valueType: z.enum(contextFactValueTypes),
    value: contextFactValueSchema,
    status: z.enum(['CONFIRMED', 'UNCONFIRMED']),
    provenance: provenanceSchema,
  })
  .strict()
  .superRefine((fact, context) => {
    const valid =
      ((fact.valueType === 'TEXT' ||
        fact.valueType === 'DATE' ||
        fact.valueType === 'CODE') &&
        typeof fact.value === 'string') ||
      (fact.valueType === 'NUMBER' && typeof fact.value === 'number') ||
      (fact.valueType === 'BOOLEAN' && typeof fact.value === 'boolean') ||
      (fact.valueType === 'CODE_LIST' && Array.isArray(fact.value))

    if (!valid) {
      context.addIssue({
        code: 'custom',
        path: ['value'],
        message: 'Waarde en valueType zijn niet structureel consistent.',
      })
    }
  })

const uncertaintySchema = z
  .object({
    key: requiredStringSchema,
    reason: z.enum(uncertaintyReasons),
    description: requiredStringSchema,
    sourceQuestionKey: requiredStringSchema.nullable(),
    provenance: provenanceSchema,
  })
  .strict()

const knowledgeNeedSchema = z
  .object({
    code: requiredStringSchema,
    topicCodes: z.array(requiredStringSchema),
    reasonFactKeys: z.array(requiredStringSchema),
    provenance: provenanceSchema,
  })
  .strict()

const solutionDirectionSchema = z
  .object({
    code: requiredStringSchema,
    description: requiredStringSchema,
    reasonFactKeys: z.array(requiredStringSchema),
    provenance: provenanceSchema,
  })
  .strict()

const professionalSupportNeedSchema = z
  .object({
    id: requiredStringSchema,
    state: z.enum(professionalSupportNeedStates),
    reasonFactKeys: z.array(requiredStringSchema),
    reasonUncertaintyKeys: z.array(requiredStringSchema),
    confirmation: confirmationSchema,
    provenance: provenanceSchema,
  })
  .strict()

const professionalRequirementCriterionSchema = z
  .object({
    code: requiredStringSchema,
    kind: z.enum(professionalRequirementKinds),
    priority: z.enum(professionalRequirementPriorities),
    valueCodes: z.array(requiredStringSchema),
    provenance: provenanceSchema,
  })
  .strict()

const professionalRequirementSchema = z
  .object({
    schemaVersion: z.literal(PROFESSIONAL_REQUIREMENT_SCHEMA_VERSION),
    id: requiredStringSchema,
    version: positiveVersionSchema,
    guidanceOutcomeId: requiredStringSchema,
    professionalSupportNeedId: requiredStringSchema,
    status: z.enum(professionalRequirementStatuses),
    professionalType: requiredStringSchema,
    priority: z.enum(professionalAdvicePriorities),
    reason: requiredStringSchema,
    expertise: z.array(requiredStringSchema),
    matchingTags: z.array(requiredStringSchema),
    criteria: z.array(professionalRequirementCriterionSchema),
    createdAt: timestampSchema,
    confirmation: confirmationSchema,
    checksum: checksumSchema,
  })
  .strict()

const professionalAdviceSchema = z
  .object({
    schemaVersion: z.literal(PROFESSIONAL_ADVICE_SCHEMA_VERSION),
    ruleSetVersion: requiredStringSchema,
    appliedRuleCode: requiredStringSchema,
    situationSummary: requiredStringSchema,
    adviceTitle: requiredStringSchema,
    adviceBody: requiredStringSchema,
    adviceReasons: z.array(requiredStringSchema).min(1),
    selfActions: z.array(requiredStringSchema).min(1),
    dominantContext: z.enum(dominantContexts),
    relevantRiskDomains: z.array(
      z.enum(professionalAdviceRiskDomains),
    ),
    primaryProfessionalRequirement:
      professionalRequirementSchema.nullable(),
    additionalProfessionalRequirements: z.array(
      professionalRequirementSchema,
    ),
    possibleProfessionalRequirements: z.array(
      professionalRequirementSchema,
    ),
    knowledgeReferences: z.array(
      z.object({ contentId: requiredStringSchema }).strict(),
    ),
    sourceReferences: z.array(
      z.object({ sourceId: requiredStringSchema }).strict(),
    ),
    disclaimer: requiredStringSchema,
    outcomeSpecificity: z.enum(guidanceOutcomeSpecificities),
  })
  .strict()

function addDuplicateIssues(
  values: readonly string[],
  path: string,
  context: z.RefinementCtx,
) {
  const seen = new Set<string>()
  values.forEach((value, index) => {
    if (seen.has(value)) {
      context.addIssue({
        code: 'custom',
        path: [path, index],
        message: 'Waarde moet binnen het contract uniek zijn.',
      })
    }
    seen.add(value)
  })
}

export const guidanceContractSchema = z
  .object({
    schemaVersion: z.literal(GUIDANCE_CONTRACT_SCHEMA_VERSION),
    id: requiredStringSchema,
    version: positiveVersionSchema,
    source: sourceReferenceSchema,
    questionSetVersion: requiredStringSchema,
    situation: situationSchema,
    helpRequest: helpRequestContractSchema,
    facts: z.array(contextFactSchema),
    uncertainties: z.array(uncertaintySchema),
    createdAt: timestampSchema,
  })
  .strict()
  .superRefine((contract, context) => {
    addDuplicateIssues(
      contract.facts.map((fact) => fact.key),
      'facts',
      context,
    )
    addDuplicateIssues(
      contract.uncertainties.map((uncertainty) => uncertainty.key),
      'uncertainties',
      context,
    )
  })

export const guidanceOutcomeContractSchema = z
  .object({
    schemaVersion: z.literal(GUIDANCE_OUTCOME_SCHEMA_VERSION),
    id: requiredStringSchema,
    version: positiveVersionSchema,
    source: sourceReferenceSchema,
    questionSetVersion: requiredStringSchema,
    ruleSetVersion: requiredStringSchema,
    executionProvenance: executionProvenanceSchema,
    status: z.enum(guidanceOutcomeStatuses),
    summary: requiredStringSchema,
    situation: situationSchema,
    helpRequest: helpRequestContractSchema,
    facts: z.array(contextFactSchema),
    uncertainties: z.array(uncertaintySchema),
    relevantTopicCodes: z.array(requiredStringSchema),
    knowledgeNeeds: z.array(knowledgeNeedSchema),
    solutionDirections: z.array(solutionDirectionSchema),
    professionalSupportNeed: professionalSupportNeedSchema,
    professionalRequirements: z.array(professionalRequirementSchema),
    professionalAdvice: professionalAdviceSchema,
    confirmation: confirmationSchema,
    createdAt: timestampSchema,
    checksum: checksumSchema,
  })
  .strict()
  .superRefine((outcome, context) => {
    if (
      outcome.executionProvenance.ruleSetVersion !== outcome.ruleSetVersion
    ) {
      context.addIssue({
        code: 'custom',
        path: ['executionProvenance', 'ruleSetVersion'],
        message:
          'Uitvoeringsprovenance en GuidanceOutcome gebruiken niet dezelfde regelsetversie.',
      })
    }

    addDuplicateIssues(
      outcome.facts.map((fact) => fact.key),
      'facts',
      context,
    )
    addDuplicateIssues(
      outcome.uncertainties.map((uncertainty) => uncertainty.key),
      'uncertainties',
      context,
    )
    addDuplicateIssues(
      outcome.relevantTopicCodes,
      'relevantTopicCodes',
      context,
    )
    addDuplicateIssues(
      outcome.professionalRequirements.map((requirement) => requirement.id),
      'professionalRequirements',
      context,
    )

    outcome.professionalRequirements.forEach((requirement, index) => {
      addDuplicateIssues(
        requirement.expertise,
        `professionalRequirements.${index}.expertise`,
        context,
      )
      addDuplicateIssues(
        requirement.matchingTags,
        `professionalRequirements.${index}.matchingTags`,
        context,
      )
      if (requirement.guidanceOutcomeId !== outcome.id) {
        context.addIssue({
          code: 'custom',
          path: [
            'professionalRequirements',
            index,
            'guidanceOutcomeId',
          ],
          message: 'Vereiste verwijst niet naar deze GuidanceOutcome.',
        })
      }
      if (
        requirement.professionalSupportNeedId !==
        outcome.professionalSupportNeed.id
      ) {
        context.addIssue({
          code: 'custom',
          path: [
            'professionalRequirements',
            index,
            'professionalSupportNeedId',
          ],
          message:
            'Vereiste verwijst niet naar de ondersteuningsbehoefte van deze GuidanceOutcome.',
        })
      }
    })

    const advisedRequirements = [
      ...(outcome.professionalAdvice.primaryProfessionalRequirement
        ? [outcome.professionalAdvice.primaryProfessionalRequirement]
        : []),
      ...outcome.professionalAdvice.additionalProfessionalRequirements,
      ...outcome.professionalAdvice.possibleProfessionalRequirements,
    ]
    const primaryCount = advisedRequirements.filter(
      (requirement) => requirement.priority === 'PRIMARY',
    ).length
    if (primaryCount > 1) {
      context.addIssue({
        code: 'custom',
        path: ['professionalAdvice'],
        message: 'Professioneel advies bevat meer dan één primaire deskundigheid.',
      })
    }
    if (
      advisedRequirements.length !==
        outcome.professionalRequirements.length ||
      advisedRequirements.some(
        (requirement, index) =>
          requirement.id !== outcome.professionalRequirements[index]?.id,
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['professionalAdvice'],
        message:
          'Professioneel advies en professionele vereisten zijn niet consistent.',
      })
    }
  })

export type GuidanceContractValidationIssue = Readonly<{
  code: string
  path: readonly PropertyKey[]
  message: string
}>

export type GuidanceContractValidationResult<T> =
  | Readonly<{ success: true; data: T }>
  | Readonly<{
      success: false
      issues: readonly GuidanceContractValidationIssue[]
    }>

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value
  }

  for (const nested of Object.values(value)) {
    deepFreeze(nested)
  }

  return Object.freeze(value)
}

function validateContract<T>(
  schema: z.ZodType,
  value: unknown,
): GuidanceContractValidationResult<T> {
  const result = schema.safeParse(value)

  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path,
        message: issue.message,
      })),
    }
  }

  return {
    success: true,
    data: deepFreeze(result.data) as T,
  }
}

export function validateHelpRequest(
  value: unknown,
): GuidanceContractValidationResult<HelpRequest> {
  return validateContract(helpRequestContractSchema, value)
}

export function validateGuidanceContract(
  value: unknown,
): GuidanceContractValidationResult<GuidanceContract> {
  return validateContract(guidanceContractSchema, value)
}

export function validateGuidanceOutcome(
  value: unknown,
): GuidanceContractValidationResult<GuidanceOutcome> {
  return validateContract(guidanceOutcomeContractSchema, value)
}
