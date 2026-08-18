import { z } from 'zod'

const key = z.string().regex(/^[a-z0-9][a-z0-9:_-]{2,159}$/)
const date = z.iso.date()
const shortText = z.string().trim().min(1).max(500)
const statement = z.string().trim().min(1).max(1500)
const jsonRecord = z.record(z.string(), z.unknown())
const sourceCode = z.string().regex(/^[A-Z0-9][A-Z0-9._:-]{1,79}$/)

const temporalStatuses = [
  'UNKNOWN',
  'CURRENT',
  'HISTORICAL',
  'SUPERSEDED',
  'WITHDRAWN',
  'UNDER_REVIEW',
] as const

const domains = [
  'POLICY_AND_MANAGEMENT',
  'ERGONOMICS',
  'HAZARDOUS_SUBSTANCES',
  'NOISE',
  'CONFINED_SPACES',
  'EMERGENCY_RESPONSE',
  'PPE',
  'OCCUPATIONAL_HEALTH',
  'MACHINERY',
  'MEASUREMENT',
  'LEGAL',
  'OTHER',
] as const

const validationStatuses = [
  'UNVALIDATED',
  'PARTIALLY_VALIDATED',
  'VALIDATED',
  'CONFLICTING',
  'REJECTED',
  'EXPIRED',
  'REVIEW_REQUIRED',
] as const

const accessTiers = [
  'PUBLIC_BASIC',
  'REGISTERED_BASIC',
  'PROFESSIONAL_PRO',
  'ORGANIZATION_BUSINESS',
  'INTERNAL_REVIEWER',
  'PLATFORM_ADMIN',
] as const

const sourceSchema = z
  .object({
    code: sourceCode,
    title: z.string().trim().min(1).max(300),
    publisher: z.string().trim().min(1).max(200).optional(),
    publicationDate: date.optional(),
    sourceModifiedDate: date.optional(),
    edition: z.string().trim().min(1).max(120).optional(),
    applicabilityScope: z.string().trim().min(1).max(500).optional(),
    metadataStatus: z.enum(['COMPLETE', 'INCOMPLETE', 'UNCERTAIN']).default('UNCERTAIN'),
    language: z.string().trim().min(2).max(12).default('nl'),
    jurisdiction: z.string().trim().min(2).max(40).default('NL'),
    sourceType: z.enum([
      'AI_SHEET',
      'LEGISLATION',
      'REGULATION',
      'INSPECTORATE_GUIDANCE',
      'ARBOCATALOGUE',
      'STANDARD',
      'RESEARCH',
      'PROFESSIONAL_GUIDANCE',
      'INTERNAL_EXPERTISE',
      'CASE_LAW',
      'OTHER',
    ]),
    sourceFormat: z.enum(['PDF', 'LEGACY_DOC']),
    copyrightClassification: z.enum([
      'PUBLIC_DOMAIN',
      'OPEN_LICENSE',
      'RESTRICTED_REFERENCE_ONLY',
      'INTERNAL',
      'UNKNOWN',
    ]),
    authorityLevel: z.enum([
      'PRIMARY_LEGAL',
      'OFFICIAL_GUIDANCE',
      'CONSENSUS_STANDARD',
      'PROFESSIONAL_GUIDANCE',
      'RESEARCH',
      'INTERNAL',
      'UNKNOWN',
    ]),
    temporalStatus: z.enum(temporalStatuses),
    sourceFamily: z.string().trim().min(1).max(120),
    independenceGroup: z.string().trim().min(1).max(120),
    isPrimarySource: z.boolean(),
    notes: z.string().trim().max(1000).optional(),
  })
  .strict()

const sourceVersionSchema = z
  .object({
    externalKey: key,
    versionLabel: z.string().trim().min(1).max(120),
    publicationDate: date.optional(),
    validFrom: date.optional(),
    validUntil: date.optional(),
    checksum: z.string().regex(/^[0-9a-f]{64}$/),
    extractionStatus: z.enum([
      'NOT_STARTED',
      'READY',
      'EXTRACTED',
      'UNSUPPORTED_FOR_EXTRACTION',
      'FAILED',
    ]),
    reviewStatus: z.enum([
      'NOT_REVIEWED',
      'REVIEW_REQUIRED',
      'IN_REVIEW',
      'REVIEWED',
      'REJECTED',
    ]),
  })
  .strict()

const topicSchema = z
  .object({
    externalKey: key,
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().min(1).max(1000),
    domain: z.enum(domains),
    parentTopicKey: key.optional(),
  })
  .strict()

const fragmentSchema = z
  .object({
    externalKey: key,
    sourceVersionKey: key,
    pageFrom: z.number().int().positive().optional(),
    pageTo: z.number().int().positive().optional(),
    sectionPath: z.string().trim().min(1).max(500).optional(),
    fragmentType: z.string().trim().min(1).max(80),
    internalExcerpt: z.string().trim().min(1).max(500).optional(),
    excerptHash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
    extractionMethod: z.string().trim().min(1).max(80),
    requiresReview: z.boolean().default(true),
    sourceBlockEvidence: z.array(z.object({
      sourceVersionId: z.uuid(),
      sourceBlockId: z.uuid(),
      evidenceRole: z.enum(['DIRECT_SUPPORT', 'CONTEXT']),
      blockTextHash: z.string().regex(/^[0-9a-f]{64}$/),
    }).strict()).min(1).max(50).optional(),
  })
  .strict()
  .refine((value) => value.pageFrom !== undefined || value.sectionPath, {
    message: 'Een fragment vereist een pagina of sectiepad.',
  })
  .refine(
    (value) =>
      value.pageFrom === undefined ||
      value.pageTo === undefined ||
      value.pageTo >= value.pageFrom,
    { message: 'De laatste pagina ligt voor de eerste pagina.' },
  )

const claimTypes = [
  'DEFINITION',
  'HAZARD',
  'RISK',
  'HEALTH_EFFECT',
  'LEGAL_REQUIREMENT',
  'PROHIBITION',
  'THRESHOLD',
  'RECOMMENDATION',
  'CONTROL_MEASURE',
  'RESPONSIBILITY',
  'ROLE',
  'EXCEPTION',
  'CONDITION',
  'PROCEDURAL_STEP',
  'INSPECTION_POINT',
  'MEASUREMENT_REQUIREMENT',
  'RECORD_RETENTION',
  'TRAINING_REQUIREMENT',
  'PPE_REQUIREMENT',
  'EMERGENCY_REQUIREMENT',
  'OTHER',
] as const

const controlRisks = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

const claimSchema = z
  .object({
    externalKey: key,
    topicKey: key,
    claimType: z.enum(claimTypes),
    statement,
    normalizedStatement: statement.optional(),
    applicability: z.string().trim().min(1).max(1000),
    jurisdiction: z.string().trim().min(2).max(40).default('NL'),
    validFrom: date.optional(),
    validUntil: date.optional(),
    temporalStatus: z.enum(temporalStatuses),
    validationStatus: z.enum(validationStatuses).default('UNVALIDATED'),
    publicationStatus: z.literal('DRAFT'),
    confidenceLevel: z.enum(['UNKNOWN', 'LOW', 'MEDIUM', 'HIGH']),
    accessTier: z.enum(accessTiers).default('INTERNAL_REVIEWER'),
    controlRisk: z.enum(controlRisks).optional(),
  })
  .strict()

const citationSchema = z
  .object({
    claimKey: key,
    sourceVersionKey: key,
    fragmentKey: key.optional(),
    supportType: z.enum([
      'DIRECT_SUPPORT',
      'PARTIAL_SUPPORT',
      'CONTEXT',
      'CONTRADICTS',
      'SUPERSEDES',
      'HISTORICAL_ORIGIN',
    ]),
    citationNote: z.string().trim().max(500).optional(),
  })
  .strict()

const endpointSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('TOPIC'), key }).strict(),
  z.object({ kind: z.literal('CLAIM'), key }).strict(),
])

const relationSchema = z
  .object({
    externalKey: key,
    from: endpointSchema,
    to: endpointSchema,
    relationType: z.enum([
      'IS_A',
      'PART_OF',
      'CAUSES',
      'MAY_CAUSE',
      'PREVENTS',
      'MITIGATES',
      'REQUIRES',
      'PROHIBITS',
      'APPLIES_TO',
      'MEASURED_BY',
      'CONTROLLED_BY',
      'RELEVANT_TO',
      'SUPERSEDES',
      'CONFLICTS_WITH',
      'IMPLEMENTED_BY',
      'PERFORMED_BY',
      'TRIGGERS',
      'INPUT_FOR',
      'OUTPUT_OF',
    ]),
    rationale: z.string().trim().max(1000).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.from.kind !== value.to.kind || value.from.key !== value.to.key,
    { message: 'Een relatie mag niet naar zichzelf verwijzen.' },
  )

const ruleSchema = z
  .object({
    code: z.string().regex(/^[A-Z0-9_:-]{3,120}$/),
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().min(1).max(1000),
    ruleType: z.enum([
      'DECISION_RULE',
      'ELIGIBILITY_RULE',
      'CLASSIFICATION_RULE',
      'COMPLIANCE_RULE',
      'WARNING_RULE',
      'ROUTING_RULE',
    ]),
    ruleVersion: z.number().int().positive(),
    inputSchema: jsonRecord,
    expression: jsonRecord,
    outputSchema: jsonRecord,
    validationStatus: z.enum(validationStatuses).default('UNVALIDATED'),
    publicationStatus: z.literal('DRAFT'),
    accessTier: z.enum(accessTiers).default('INTERNAL_REVIEWER'),
  })
  .strict()

const calculationSchema = z
  .object({
    code: z.string().regex(/^[A-Z0-9_:-]{3,120}$/),
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().min(1).max(1000),
    calculationType: z.string().trim().min(1).max(80),
    calculationVersion: z.number().int().positive(),
    inputSchema: jsonRecord,
    formulaRepresentation: jsonRecord,
    outputSchema: jsonRecord,
    unitDefinitions: jsonRecord,
    limitations: z.string().trim().min(1).max(1500),
    validationStatus: z.enum(validationStatuses).default('UNVALIDATED'),
    publicationStatus: z.literal('DRAFT'),
    accessTier: z.enum(accessTiers).default('INTERNAL_REVIEWER'),
  })
  .strict()

const checklistItemSchema = z
  .object({
    order: z.number().int().positive(),
    question: z.string().trim().min(1).max(1000),
    answerType: z.enum([
      'YES_NO',
      'SINGLE_CHOICE',
      'MULTIPLE_CHOICE',
      'NUMBER',
      'TEXT',
      'NOT_APPLICABLE',
    ]),
    answerOptions: jsonRecord.optional(),
    scoreRules: jsonRecord.optional(),
    explanationClaimKey: key.optional(),
    required: z.boolean(),
  })
  .strict()

const checklistSchema = z
  .object({
    code: z.string().regex(/^[A-Z0-9_:-]{3,120}$/),
    version: z.number().int().positive(),
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().min(1).max(1000),
    topicKey: key,
    audience: z.enum(accessTiers),
    scoringMethod: z.string().trim().min(1).max(80),
    validationStatus: z.enum(validationStatuses).default('UNVALIDATED'),
    publicationStatus: z.literal('DRAFT'),
    items: z.array(checklistItemSchema).min(1).max(100),
  })
  .strict()

const procedureStepSchema = z
  .object({
    order: z.number().int().positive(),
    title: z.string().trim().min(1).max(240),
    instruction: z.string().trim().min(1).max(1500),
    conditionRuleCode: z.string().max(120).optional(),
    responsibleRoleCode: z.string().max(120).optional(),
    evidenceRequired: z.string().trim().max(500).optional(),
    warningClaimKey: key.optional(),
  })
  .strict()

const procedureSchema = z
  .object({
    code: z.string().regex(/^[A-Z0-9_:-]{3,120}$/),
    version: z.number().int().positive(),
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().min(1).max(1000),
    topicKey: key,
    audience: z.enum(accessTiers),
    prerequisites: jsonRecord,
    validationStatus: z.enum(validationStatuses).default('UNVALIDATED'),
    publicationStatus: z.literal('DRAFT'),
    steps: z.array(procedureStepSchema).min(1).max(100),
  })
  .strict()

const roleSchema = z
  .object({
    code: z.string().regex(/^[a-z0-9][a-z0-9_-]{2,119}$/),
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().min(1).max(1000),
  })
  .strict()

const formTemplateSchema = z
  .object({
    code: z.string().regex(/^[A-Z0-9_:-]{3,120}$/),
    title: z.string().trim().min(1).max(240),
    description: z.string().trim().min(1).max(1000),
    topicKey: key,
    schemaVersion: z.number().int().positive(),
    formSchema: jsonRecord,
    validationStatus: z.enum(validationStatuses).default('UNVALIDATED'),
    publicationStatus: z.literal('DRAFT'),
    accessTier: z.enum(accessTiers).default('INTERNAL_REVIEWER'),
  })
  .strict()

export const knowledgeImportPackageSchema = z
  .object({
    schemaVersion: z.enum(['1.0', '1.1']),
    source: sourceSchema,
    sourceVersion: sourceVersionSchema,
    topics: z.array(topicSchema).max(100),
    fragments: z.array(fragmentSchema).max(500),
    claims: z.array(claimSchema).max(500),
    citations: z.array(citationSchema).max(1000),
    relations: z.array(relationSchema).max(1000),
    rules: z.array(ruleSchema).max(100),
    calculations: z.array(calculationSchema).max(50),
    checklists: z.array(checklistSchema).max(50),
    procedures: z.array(procedureSchema).max(50),
    roles: z.array(roleSchema).max(100),
    formTemplates: z.array(formTemplateSchema).max(50),
    importMetadata: z
      .object({
        createdAt: z.iso.datetime(),
        createdBy: z.string().trim().min(1).max(80),
        notes: z.string().trim().max(1000).optional(),
        uncertainties: z.array(shortText).max(100),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.schemaVersion !== '1.1') return
    value.claims.forEach((claim, index) => {
      if (claim.controlRisk !== undefined) return
      context.addIssue({
        code: 'custom',
        path: ['claims', index, 'controlRisk'],
        message: 'controlRisk is verplicht vanaf Knowledge-importcontract 1.1.',
      })
    })
  })
  .transform((value) => ({
    ...value,
    claims: value.claims.map((claim) => ({
      ...claim,
      // Legacy 1.0-pakketten blijven leesbaar, maar worden conservatief behandeld.
      // Een expliciete 1.1-classificatie is vereist om een lager risico vast te leggen.
      controlRisk: claim.controlRisk ?? 'CRITICAL' as const,
    })),
  }))

export type KnowledgeImportPackage = z.infer<
  typeof knowledgeImportPackageSchema
>

export const reviewedKnowledgeAttachmentPackageSchema = knowledgeImportPackageSchema.superRefine((value, context) => {
  if (value.schemaVersion !== '1.1') {
    context.addIssue({ code: 'custom', path: ['schemaVersion'], message: 'Reviewed attachment vereist contract 1.1.' })
  }
  value.fragments.forEach((fragment, index) => {
    if (fragment.sourceBlockEvidence?.length) return
    context.addIssue({ code: 'custom', path: ['fragments', index, 'sourceBlockEvidence'], message: 'Reviewed attachment vereist expliciete bronblokevidence.' })
  })
  if (value.rules.length || value.calculations.length || value.checklists.length || value.procedures.length || value.roles.length || value.formTemplates.length || value.relations.length) {
    context.addIssue({ code: 'custom', path: [], message: 'Reviewed attachment ondersteunt uitsluitend topics, claims, fragmenten en citaties.' })
  }
})

export type ReviewedKnowledgeAttachmentPackage = z.infer<typeof reviewedKnowledgeAttachmentPackageSchema>

export const KNOWLEDGE_IMPORT_MAX_BYTES = 5 * 1024 * 1024
