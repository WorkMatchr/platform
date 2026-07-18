import type { ProviderTaxonomyKind } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderViewer } from './provider-authorization'

const optionKinds: ProviderTaxonomyKind[] = [
  'SERVICE', 'SPECIALISM', 'SECTOR', 'REGION',
  'QUALIFICATION', 'CERTIFICATION', 'INSURANCE_TYPE',
]

export async function getProviderOnboardingOptions(userId: string, providerProfileId: string) {
  return getPrisma().$transaction(async (transaction) => {
    const access = await requireProviderViewer(transaction, userId, providerProfileId)
    const terms = await transaction.providerTaxonomyTerm.findMany({
      where: {
        isActive: true,
        version: { status: 'PUBLISHED', taxonomy: { kind: { in: optionKinds } } },
      },
      select: { id: true, code: true, label: true, version: { select: { taxonomy: { select: { kind: true } } } } },
      orderBy: [{ label: 'asc' }],
    })
    const evidence = access.membershipRole === 'MEMBER'
      ? []
      : await transaction.providerEvidenceRevision.findMany({
          where: {
            evidenceDocument: { providerProfileId, status: 'AVAILABLE' },
            scanDecision: { scanStatus: 'CLEAN' },
          },
          select: { id: true, version: true, originalFileName: true },
          orderBy: { createdAt: 'desc' },
        })

    const byKind = (kind: ProviderTaxonomyKind) => terms
      .filter((term) => term.version.taxonomy.kind === kind)
      .map(({ id, code, label }) => ({ id, code, label }))

    return {
      services: byKind('SERVICE'),
      specialisms: byKind('SPECIALISM'),
      sectors: byKind('SECTOR'),
      regions: byKind('REGION'),
      qualifications: [...byKind('QUALIFICATION'), ...byKind('CERTIFICATION')],
      insuranceTypes: byKind('INSURANCE_TYPE'),
      evidence: evidence.map((item) => ({
        id: item.id,
        label: `${item.originalFileName} — revisie ${item.version}`,
      })),
    }
  })
}
