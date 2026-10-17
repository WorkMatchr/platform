import 'server-only'
import type { Prisma } from '@/generated/prisma/client'
import { complianceChecksum, complianceV2DefinitionSchema } from './compliance-v2'

// Read only the explicitly selected version; never newest/latest or a DRAFT fallback.
export async function loadComplianceV2Framework(tx: Prisma.TransactionClient, id: string) {
  const f = await tx.complianceFrameworkVersion.findUnique({ where: { id }, include: {
    modules: { orderBy: [{ position: 'asc' }, { code: 'asc' }], include: {
      questions: { orderBy: { position: 'asc' }, include: { options: { orderBy: { position: 'asc' } } } },
      rules: { orderBy: [{ position: 'asc' }, { code: 'asc' }], include: {
        knowledgeReferences: { orderBy: { position: 'asc' }, include: { knowledgeClaim: { include: {
          citations: { orderBy: { id: 'asc' }, include: { sourceVersion: { include: { source: true } } } },
        } } } },
      } },
    } },
  } })
  if (!f || f.status !== 'PUBLISHED' || f.modules.some(m => !m.isActive)) throw new Error('V2-framework is niet beschikbaar.')
  const definition = complianceV2DefinitionSchema.parse({ id: f.id, frameworkCode: f.frameworkCode, version: f.version, title: f.title, disclaimer: f.disclaimer,
    modules: f.modules.map(m => ({ code: m.code, title: m.title,
      questions: m.questions.map(q => ({ id: q.id, code: q.code, prompt: q.prompt, required: q.isRequired, inputType: q.inputType,
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
              claimChecksum: complianceChecksum({ id: c.id, type: c.claimType, statement: c.statement, applicability: c.applicability, reviewedAt, supportType: ref.supportType }),
              sourceVersionId: v.id, sourceChecksum: v.contentFingerprint ?? v.checksum,
              title: s.title, publisher: s.publisher, url: s.sourceUrl, reviewedAt: reviewedAt.slice(0, 10),
              category: s.sourceType === 'LEGISLATION' || s.sourceType === 'REGULATION' ? 'LEGISLATION' : 'GUIDANCE',
            }
          })
        }),
      })),
    })),
  })
  if (complianceChecksum(definition) !== f.checksum) throw new Error('V2-frameworkchecksum wijkt af.')
  return definition
}
