'use server'

import { redirect } from 'next/navigation'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { getPrisma } from '@/lib/prisma'
import { completeArboGuideRun } from '@/lib/arbo-guides/arbo-guide-run-service'
import { buildFullComplianceReportSnapshot } from '@/lib/compliance/full-scan-assessment'

function flattenAnswers(input: Readonly<Record<string, unknown>>) {
  const output: Record<string, string | number | boolean | null> = {}
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) output[key] = value.map(String).join(',')
    else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) output[key] = value
  }
  return output
}

export async function completeFullComplianceScan(payload: {
  intakeAnswers: Record<string, unknown>
  scanAnswers: Record<string, unknown>
  idempotencyKey: string
  startedAt: string
}) {
  const { user, activeMembership } = await requireOrganizationMembership(undefined, '/dashboard/compliance/scan/nieuw')
  const framework = await getPrisma().complianceFrameworkVersion.findUnique({
    where: { frameworkCode_version: { frameworkCode: 'NL_ARBO', version: '2026-10' } },
    select: { id: true },
  })
  if (!framework) throw new Error('Complianceframework ontbreekt.')

  const completedAt = new Date()
  const reportSnapshot = buildFullComplianceReportSnapshot({
    intakeAnswers: payload.intakeAnswers,
    scanAnswers: payload.scanAnswers,
    organizationName: activeMembership.organization.name,
    scannedAt: completedAt,
  })

  const answerSnapshot = {
    ...flattenAnswers(payload.intakeAnswers),
    ...flattenAnswers(payload.scanAnswers),
  }

  const run = await completeArboGuideRun({
    guideType: 'COMPLIANCE',
    guideVersion: '2026-10',
    reportVersion: '2.0',
    complianceFrameworkVersionId: framework.id,
    organizationId: activeMembership.organization.id,
    completedByUserId: user.id,
    idempotencyKey: payload.idempotencyKey,
    startedAt: new Date(payload.startedAt),
    completedAt,
    answersSnapshot: answerSnapshot,
    reportSnapshot,
  })

  redirect('/dashboard/compliance?run=' + run.id)
}
