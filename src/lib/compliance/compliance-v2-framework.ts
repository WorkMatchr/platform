import 'server-only'
import type { Prisma } from '@/generated/prisma/client'
import { complianceChecksum, complianceV2DefinitionSchema } from './compliance-v2'
import { complianceClaimInclude, evaluateComplianceClaim } from './compliance-knowledge-publication'
import { buildF4Definition } from './compliance-f4-definition'

// Read only the explicitly selected version; never newest/latest or a DRAFT fallback.
export async function loadComplianceV2Framework(tx: Prisma.TransactionClient, id: string) {
  const result = await inspectComplianceFramework(tx, id)
  if (result.status !== 'PUBLISHED' || result.decision !== 'GO' || !result.definition) throw new Error('Framework of brononderbouwing is niet beschikbaar voor nieuwe beoordelingen.')
  return result.definition
}

async function readFrameworkRecord(tx: Prisma.TransactionClient, id: string) {
  return tx.complianceFrameworkVersion.findUnique({ where: { id }, include: {
    modules: { orderBy: [{ position: 'asc' }, { code: 'asc' }], include: {
      questions: { orderBy: { position: 'asc' }, include: { options: { orderBy: { position: 'asc' } } } },
      rules: { orderBy: [{ position: 'asc' }, { code: 'asc' }], include: {
        knowledgeReferences: { orderBy: { position: 'asc' }, include: { knowledgeClaim: { include: complianceClaimInclude } } },
      } },
    } },
  } })
}

/** Same policy as the runtime loader, but permits inspection of a DRAFT. No writes. */
export async function inspectComplianceFramework(tx: Prisma.TransactionClient, id: string, now = new Date()) {
  const f = await readFrameworkRecord(tx, id)
  const errors: string[] = []
  const rules: Array<{ code: string; errors: string[]; expectedChecksum: string | null; claims: Array<{ id: string; reasons: string[] }> }> = []
  let definition: ReturnType<typeof complianceV2DefinitionSchema.parse> | undefined
  if (!f) return { decision: 'NO_GO' as const, status: null, errors: ['FRAMEWORK_NOT_REGISTERED'], rules, expectedChecksum: null, calculatedChecksum: null, definition }
  if (!['DRAFT', 'PUBLISHED'].includes(f.status) || f.modules.some(m => !m.isActive)) errors.push('FRAMEWORK_NOT_AVAILABLE')
  const ordinaryClaimIds = new Set(f.modules.flatMap(m => m.rules.filter(r => !r.code.endsWith('-SCOPE-UNCERTAIN')).flatMap(r => r.knowledgeReferences.map(ref => ref.knowledgeClaimId))))
  for (const rule of f.modules.flatMap(m => m.rules)) {
    const issues: string[] = []
    if (!rule.knowledgeReferences.length) issues.push('CLAIM_BINDING_MISSING')
    if (rule.basis === 'LEGAL_REQUIREMENT' && !rule.knowledgeReferences.some(ref => ref.knowledgeClaim.citations.some(c =>
      c.supportType === 'DIRECT_SUPPORT' && c.sourceVersion.source.authorityLevel === 'PRIMARY_LEGAL' && ['LEGISLATION', 'REGULATION'].includes(c.sourceVersion.source.sourceType)))) issues.push('PRIMARY_LEGAL_SUPPORT_REQUIRED')
    const claims = rule.knowledgeReferences.map(ref => {
      const claim = ref.knowledgeClaim, result = evaluateComplianceClaim(claim, now)
      if (ref.supportType !== 'DIRECT_SUPPORT') issues.push('DIRECT_RULE_SUPPORT_REQUIRED')
      if (rule.code.endsWith('-SCOPE-UNCERTAIN') && (claim.claimType !== 'CONDITION' || ordinaryClaimIds.has(claim.id))) issues.push('DEDICATED_EMPLOYER_SCOPE_CLAIM_REQUIRED')
      return { id: claim.id, reasons: result.reasons }
    })
    rules.push({ code: rule.code, errors: [...new Set(issues)], expectedChecksum: null, claims })
  }
  try {
    definition = assembleDefinition(f)
    for (const rule of definition.modules.flatMap(m => m.rules)) rules.find(row => row.code === rule.code)!.expectedChecksum = complianceChecksum(rule)
    if (complianceChecksum(definition) !== f.checksum) errors.push('FRAMEWORK_CHECKSUM_MISMATCH')
    if (f.frameworkCode === 'NL_ARBO_GUIDE' && f.version === '2.1') {
      const bindings = Object.fromEntries(definition.modules.flatMap(m => m.rules.map(r => [r.code, r.sources])))
      if (complianceChecksum(buildF4Definition(bindings)) !== complianceChecksum(definition)) errors.push('F4_RULE_OR_QUESTION_CONTRACT_MISMATCH')
    }
  } catch { errors.push('DEFINITION_OR_DIRECT_SOURCE_BINDING_INVALID') }
  if (rules.some(r => r.errors.length || r.claims.some(c => c.reasons.length))) errors.push('KNOWLEDGE_PUBLICATION_BLOCKED')
  return { decision: errors.length ? 'NO_GO' as const : 'GO' as const, status: f.status, errors, rules,
    expectedChecksum: f.checksum, calculatedChecksum: definition ? complianceChecksum(definition) : null, definition }
}

// Preserve v2 hashes; the unpublished 2.1 contract additionally binds exact citations.
function assembleDefinition(f: NonNullable<Awaited<ReturnType<typeof readFrameworkRecord>>>) {
  const definition = complianceV2DefinitionSchema.parse({ id: f.id, frameworkCode: f.frameworkCode, version: f.version, title: f.title, disclaimer: f.disclaimer,
    modules: f.modules.map(m => ({ code: m.code, title: m.title,
      questions: m.questions.map(q => ({
        ...(f.version === '2.1' ? { ...(q.helpText ? { helpText: q.helpText } : {}), ...(q.visibilityCondition ? { visibleWhen: q.visibilityCondition } : {}) } : {}),
        id: q.id, code: q.code, prompt: q.prompt, required: q.isRequired, inputType: q.inputType,
        options: q.options.map(o => ({ value: o.value, label: o.label, exclusive: o.isExclusive })),
      })),
      rules: m.rules.map(r => ({ id: r.id, code: r.code, condition: r.conditionSchema, applicability: r.applicability, status: r.assessmentStatus,
        mode: r.assessmentMode, basis: r.basis, explanation: r.findingBody, nextStep: r.recommendedAction,
        sources: r.knowledgeReferences.flatMap(ref => {
          const c = ref.knowledgeClaim
          if (c.publicationStatus !== 'PUBLISHED' || !c.reviewedAt) throw new Error('Bronclaim is niet gepubliceerd/beoordeeld.')
          const reviewedAt = c.reviewedAt.toISOString()
          if (ref.supportType !== 'DIRECT_SUPPORT' || c.citations.length === 0) throw new Error('Onvoldoende directe brononderbouwing.')
          const legal = ['LEGAL_REQUIREMENT', 'PROHIBITION', 'EXCEPTION', 'CONDITION', 'MEASUREMENT_REQUIREMENT', 'RECORD_RETENTION', 'TRAINING_REQUIREMENT', 'PPE_REQUIREMENT', 'EMERGENCY_REQUIREMENT']
          if (r.basis === 'LEGAL_REQUIREMENT' && !legal.includes(c.claimType)) throw new Error('Geen wettelijke bronclaim.')
          if (r.basis === 'PRACTICAL_RECOMMENDATION' && c.claimType !== 'RECOMMENDATION' && c.claimType !== 'CONTROL_MEASURE') throw new Error('Geen aanbevelingsclaim.')
          return c.citations.map(citation => {
            if (citation.supportType !== 'DIRECT_SUPPORT') throw new Error('Onvoldoende directe citatie.')
            const v = citation.sourceVersion, s = v.source
            return { id: citation.id, claimId: c.id,
              claimChecksum: complianceChecksum({ id: c.id, type: c.claimType, statement: c.statement, applicability: c.applicability, reviewedAt, supportType: ref.supportType,
                ...(f.version === '2.1' ? { citationBinding: { citationId: citation.id, fragmentId: citation.fragmentId, fragmentHash: citation.fragment?.excerptHash, sourceVersionId: v.id } } : {}),
              }),
              sourceVersionId: v.id, sourceChecksum: v.contentFingerprint ?? v.checksum,
              title: s.title, publisher: s.publisher, url: s.sourceUrl, reviewedAt: reviewedAt.slice(0, 10),
              category: s.sourceType === 'LEGISLATION' || s.sourceType === 'REGULATION' ? 'LEGISLATION' : 'GUIDANCE',
            }
          })
        }),
      })),
    })),
  })
  return definition
}
