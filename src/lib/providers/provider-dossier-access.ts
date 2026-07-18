import type { Prisma, ProviderDossierSection } from '@/generated/prisma/client'
import { ProviderServiceError } from './provider-errors'

const activeStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFORMATION_REQUIRED'] as const

export async function requireProviderSectionEditable(
  transaction: Prisma.TransactionClient,
  providerProfileId: string,
  section: ProviderDossierSection,
) {
  const submission = await transaction.providerDossierSubmission.findFirst({
    where: { providerProfileId, status: { in: [...activeStatuses] } },
    select: {
      status: true,
      reviewCases: {
        orderBy: { openedAt: 'desc' },
        take: 1,
        select: { findings: { select: { section: true } } },
      },
    },
  })
  if (!submission) return
  if (submission.status !== 'ADDITIONAL_INFORMATION_REQUIRED') {
    throw new ProviderServiceError('DOSSIER_LOCKED')
  }
  const reopened = new Set(submission.reviewCases[0]?.findings.map((finding) => finding.section) ?? [])
  if (!reopened.has(section)) throw new ProviderServiceError('SECTION_NOT_EDITABLE')
}

export async function getProviderEditableSections(
  transaction: Prisma.TransactionClient,
  providerProfileId: string,
): Promise<ProviderDossierSection[]> {
  const submission = await transaction.providerDossierSubmission.findFirst({
    where: { providerProfileId, status: { in: [...activeStatuses] } },
    select: {
      status: true,
      reviewCases: { orderBy: { openedAt: 'desc' }, take: 1, select: { findings: { select: { section: true } } } },
    },
  })
  if (!submission) return ['ORGANIZATION', 'CAPABILITIES', 'SECTOR_EXPERIENCE', 'WORK_AREA', 'PROFESSIONALS', 'QUALIFICATIONS', 'INSURANCE', 'EVIDENCE', 'DECLARATIONS']
  if (submission.status !== 'ADDITIONAL_INFORMATION_REQUIRED') return []
  return [...new Set(submission.reviewCases[0]?.findings.map((finding) => finding.section) ?? [])]
    .filter((section) => section !== 'CAPACITY')
}
