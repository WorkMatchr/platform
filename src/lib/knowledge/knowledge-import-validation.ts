import { createHash } from 'node:crypto'
import { knowledgeImportPackageSchema, type KnowledgeImportPackage } from './knowledge-import-schema'

export type KnowledgeImportIssue = { code: string; path: string; message: string }
export type KnowledgeImportValidation = {
  valid: boolean
  package: KnowledgeImportPackage | null
  issues: KnowledgeImportIssue[]
  counts: Record<string, number>
  conflicts: number
}

const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor'])
const expressionKeys = new Set(['all', 'any', 'not', 'eq', 'gt', 'gte', 'lt', 'lte', 'in', 'field', 'value'])

function inspectJson(value: unknown, path: string, expression: boolean, issues: KnowledgeImportIssue[]) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectJson(entry, `${path}.${index}`, expression, issues))
    return
  }
  if (!value || typeof value !== 'object') return
  for (const [key, entry] of Object.entries(value)) {
    if (forbiddenKeys.has(key) || (expression && !expressionKeys.has(key))) {
      issues.push({ code: 'UNSAFE_JSON_KEY', path: `${path}.${key}`, message: `Niet-toegestane sleutel: ${key}.` })
    }
    inspectJson(entry, `${path}.${key}`, expression, issues)
  }
}

function unique(values: string[], path: string, issues: KnowledgeImportIssue[]) {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) issues.push({ code: 'DUPLICATE_KEY', path, message: `Dubbele sleutel: ${value}.` })
    seen.add(value)
  }
  return seen
}

export function validateKnowledgeImport(input: unknown): KnowledgeImportValidation {
  const parsed = knowledgeImportPackageSchema.safeParse(input)
  if (!parsed.success) {
    return {
      valid: false,
      package: null,
      issues: parsed.error.issues.map((issue) => ({ code: 'SCHEMA_INVALID', path: issue.path.join('.'), message: issue.message })),
      counts: {},
      conflicts: 0,
    }
  }

  const value = parsed.data
  const issues: KnowledgeImportIssue[] = []
  if (value.source.metadataStatus === 'COMPLETE') {
    const requiredMetadata = [
      ['source.publisher', value.source.publisher],
      ['source.edition', value.source.edition],
      ['source.applicabilityScope', value.source.applicabilityScope],
    ] as const
    for (const [path, metadataValue] of requiredMetadata) {
      if (!metadataValue) issues.push({ code: 'METADATA_INCOMPLETE', path, message: 'Deze metadata ontbreekt terwijl de bron als compleet is gemarkeerd.' })
    }
    if (!value.source.publicationDate && !value.source.sourceModifiedDate) {
      issues.push({ code: 'METADATA_INCOMPLETE', path: 'source.publicationDate', message: 'Een complete bron vereist een publicatie- of wijzigingsdatum.' })
    }
  }
  if (value.source.metadataStatus !== 'COMPLETE' && value.importMetadata.uncertainties.length === 0) {
    issues.push({ code: 'METADATA_UNCERTAINTY_UNEXPLAINED', path: 'importMetadata.uncertainties', message: 'Leg vast welke bronmetadata ontbreekt of onzeker is.' })
  }
  if ((value.source.metadataStatus !== 'COMPLETE' || value.source.temporalStatus !== 'CURRENT') && value.sourceVersion.reviewStatus !== 'REVIEW_REQUIRED') {
    issues.push({ code: 'EXCEPTION_CONTROL_REQUIRED', path: 'sourceVersion.reviewStatus', message: 'Een onzekere, historische of verouderde bron moet voor uitzonderingcontrole gemarkeerd blijven.' })
  }
  const topicKeys = unique(value.topics.map((entry) => entry.externalKey), 'topics', issues)
  const fragmentKeys = unique(value.fragments.map((entry) => entry.externalKey), 'fragments', issues)
  const claimKeys = unique(value.claims.map((entry) => entry.externalKey), 'claims', issues)
  unique(value.relations.map((entry) => entry.externalKey), 'relations', issues)
  const roleCodes = unique(value.roles.map((entry) => entry.code), 'roles', issues)
  const ruleCodes = unique(value.rules.map((entry) => entry.code), 'rules', issues)

  const statements = new Set<string>()
  for (const claim of value.claims) {
    const normalized = (claim.normalizedStatement ?? claim.statement).trim().toLocaleLowerCase('nl-NL')
    if (statements.has(normalized)) issues.push({ code: 'DUPLICATE_CLAIM', path: claim.externalKey, message: 'Inhoudelijk dubbele claim.' })
    statements.add(normalized)
    if (!topicKeys.has(claim.topicKey)) issues.push({ code: 'UNKNOWN_TOPIC', path: claim.externalKey, message: `Onbekend topic: ${claim.topicKey}.` })
    if (value.source.temporalStatus !== 'CURRENT' && claim.temporalStatus === 'CURRENT') issues.push({ code: 'HISTORICAL_AS_CURRENT', path: claim.externalKey, message: 'Een historische bron mag geen actuele claim opleveren.' })
    if (value.source.metadataStatus !== 'COMPLETE' && claim.confidenceLevel === 'HIGH') issues.push({ code: 'UNCERTAIN_SOURCE_HIGH_CONFIDENCE', path: claim.externalKey, message: 'Onzekere bronmetadata mag geen claim met hoge zekerheid opleveren.' })
  }

  const versionKey = value.sourceVersion.externalKey
  for (const fragment of value.fragments) {
    if (fragment.sourceVersionKey !== versionKey) issues.push({ code: 'UNKNOWN_SOURCE_VERSION', path: fragment.externalKey, message: 'Fragment verwijst niet naar de pakketbronversie.' })
    if (fragment.internalExcerpt && !fragment.excerptHash) {
      issues.push({ code: 'EXCERPT_HASH_REQUIRED', path: fragment.externalKey, message: 'Een bronfragment vereist een SHA-256-fingerprint.' })
    }
    if (!fragment.internalExcerpt && fragment.excerptHash) {
      issues.push({ code: 'EXCERPT_REQUIRED', path: fragment.externalKey, message: 'Een fragmentfingerprint vereist het bijbehorende bronfragment.' })
    }
    if (fragment.internalExcerpt && fragment.excerptHash) {
      const expectedHash = createHash('sha256').update(fragment.internalExcerpt).digest('hex')
      if (fragment.excerptHash !== expectedHash) {
        issues.push({ code: 'EXCERPT_HASH_MISMATCH', path: fragment.externalKey, message: 'De fragmentfingerprint komt niet overeen met het bronfragment.' })
      }
    }
    const evidenceKeys = (fragment.sourceBlockEvidence ?? []).map((evidence) => `${evidence.sourceVersionId}:${evidence.sourceBlockId}`)
    unique(evidenceKeys, `${fragment.externalKey}.sourceBlockEvidence`, issues)
  }
  for (const citation of value.citations) {
    if (!claimKeys.has(citation.claimKey)) issues.push({ code: 'UNKNOWN_CLAIM', path: 'citations', message: `Onbekende claim: ${citation.claimKey}.` })
    if (citation.sourceVersionKey !== versionKey) issues.push({ code: 'UNKNOWN_SOURCE_VERSION', path: 'citations', message: 'Citatie verwijst niet naar de pakketbronversie.' })
    if (!citation.fragmentKey || !fragmentKeys.has(citation.fragmentKey)) issues.push({ code: 'UNKNOWN_FRAGMENT', path: 'citations', message: 'Iedere PoC-citatie vereist een bestaand fragment.' })
  }
  for (const claim of value.claims) {
    if (!value.citations.some((citation) => citation.claimKey === claim.externalKey && citation.fragmentKey)) {
      issues.push({ code: 'CLAIM_SOURCE_REQUIRED', path: claim.externalKey, message: 'Iedere claim vereist minimaal één concrete fragmentcitatie.' })
    }
  }
  for (const relation of value.relations) {
    const valid = (endpoint: typeof relation.from) => endpoint.kind === 'TOPIC' ? topicKeys.has(endpoint.key) : claimKeys.has(endpoint.key)
    if (!valid(relation.from) || !valid(relation.to)) issues.push({ code: 'UNKNOWN_RELATION_ENDPOINT', path: relation.externalKey, message: 'Relatie bevat een onbekende bron- of doelreferentie.' })
  }
  for (const topic of value.topics) {
    if (topic.parentTopicKey && !topicKeys.has(topic.parentTopicKey)) issues.push({ code: 'UNKNOWN_PARENT_TOPIC', path: topic.externalKey, message: 'Onbekend bovenliggend topic.' })
  }
  for (const checklist of value.checklists) {
    if (!topicKeys.has(checklist.topicKey)) issues.push({ code: 'UNKNOWN_TOPIC', path: checklist.code, message: 'Checklist heeft een onbekend topic.' })
    unique(checklist.items.map((entry) => String(entry.order)), `${checklist.code}.items`, issues)
    checklist.items.forEach((item) => {
      if (item.explanationClaimKey && !claimKeys.has(item.explanationClaimKey)) issues.push({ code: 'UNKNOWN_CLAIM', path: checklist.code, message: 'Checklist verwijst naar een onbekende uitlegclaim.' })
      inspectJson(item.answerOptions, `${checklist.code}.answerOptions`, false, issues)
      inspectJson(item.scoreRules, `${checklist.code}.scoreRules`, false, issues)
    })
  }
  for (const procedure of value.procedures) {
    if (!topicKeys.has(procedure.topicKey)) issues.push({ code: 'UNKNOWN_TOPIC', path: procedure.code, message: 'Procedure heeft een onbekend topic.' })
    unique(procedure.steps.map((entry) => String(entry.order)), `${procedure.code}.steps`, issues)
    procedure.steps.forEach((step) => {
      if (step.conditionRuleCode && !ruleCodes.has(step.conditionRuleCode)) issues.push({ code: 'UNKNOWN_RULE', path: procedure.code, message: 'Procedure verwijst naar een onbekende regel.' })
      if (step.responsibleRoleCode && !roleCodes.has(step.responsibleRoleCode)) issues.push({ code: 'UNKNOWN_ROLE', path: procedure.code, message: 'Procedure verwijst naar een onbekende rol.' })
      if (step.warningClaimKey && !claimKeys.has(step.warningClaimKey)) issues.push({ code: 'UNKNOWN_CLAIM', path: procedure.code, message: 'Procedure verwijst naar een onbekende waarschuwing.' })
    })
    inspectJson(procedure.prerequisites, `${procedure.code}.prerequisites`, false, issues)
  }
  value.rules.forEach((rule) => {
    inspectJson(rule.inputSchema, `${rule.code}.inputSchema`, false, issues)
    inspectJson(rule.expression, `${rule.code}.expression`, true, issues)
    inspectJson(rule.outputSchema, `${rule.code}.outputSchema`, false, issues)
  })
  value.calculations.forEach((calculation) => {
    inspectJson(calculation.inputSchema, `${calculation.code}.inputSchema`, false, issues)
    inspectJson(calculation.formulaRepresentation, `${calculation.code}.formulaRepresentation`, true, issues)
    inspectJson(calculation.outputSchema, `${calculation.code}.outputSchema`, false, issues)
    inspectJson(calculation.unitDefinitions, `${calculation.code}.unitDefinitions`, false, issues)
  })
  value.formTemplates.forEach((template) => {
    if (!topicKeys.has(template.topicKey)) issues.push({ code: 'UNKNOWN_TOPIC', path: template.code, message: 'Formulier heeft een onbekend topic.' })
    inspectJson(template.formSchema, `${template.code}.formSchema`, false, issues)
  })

  const listKeys = ['topics', 'fragments', 'claims', 'citations', 'relations', 'rules', 'calculations', 'checklists', 'procedures', 'roles', 'formTemplates'] as const
  const counts = Object.fromEntries(listKeys.map((key) => [key, value[key].length]))
  return { valid: issues.length === 0, package: value, issues, counts, conflicts: value.relations.filter((entry) => entry.relationType === 'CONFLICTS_WITH').length }
}
