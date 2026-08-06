import type { ProviderTaxonomyKind } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderViewer } from './provider-authorization'

const optionKinds: ProviderTaxonomyKind[] = [
  'SERVICE', 'SPECIALISM', 'SECTOR', 'REGION',
  'QUALIFICATION', 'CERTIFICATION', 'MEMBERSHIP', 'REGISTRATION', 'WORK_MODE', 'INSURANCE_TYPE',
]

export async function getProviderOnboardingOptions(userId: string, providerProfileId: string) {
  const prisma = getPrisma()
  const access = await requireProviderViewer(prisma, userId, providerProfileId)
  const terms = await prisma.providerTaxonomyTerm.findMany({
      where: {
        isActive: true,
        version: { status: 'PUBLISHED', taxonomy: { kind: { in: optionKinds } } },
      },
      select: { id: true, code: true, label: true, version: { select: { taxonomy: { select: { kind: true } } } } },
      orderBy: [{ label: 'asc' }],
    })
  const evidence = access.membershipRole === 'MEMBER'
    ? []
    : await prisma.providerEvidenceRevision.findMany({
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
    memberships: byKind('MEMBERSHIP'),
    registrations: byKind('REGISTRATION'),
    workModes: byKind('WORK_MODE'),
    insuranceTypes: byKind('INSURANCE_TYPE'),
    evidence: evidence.map((item) => ({
      id: item.id,
      label: `${item.originalFileName} — revisie ${item.version}`,
    })),
  }
}
