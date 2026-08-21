import { getArboGuideApiAccess } from '@/lib/arbo-guides/arbo-guide-access'
import { COMPLIANCE_GUIDE_VERSION, normalizeComplianceGuideAnswers, type ComplianceGuideAnswers } from '@/lib/compliance-guide/compliance-guide'
import { buildComplianceReportData, COMPLIANCE_REPORT_VERSION } from '@/lib/compliance-guide/compliance-report'
import { ArboGuideRunError, completeArboGuideRun } from '@/lib/arbo-guides/arbo-guide-run-service'

export const runtime = 'nodejs'
const MAX_REQUEST_BYTES = 16_384

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (contentLength > MAX_REQUEST_BYTES) return Response.json({ message: 'Ongeldige aanvraag.' }, { status: 413 })
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return Response.json({ message: 'Ongeldige aanvraag.' }, { status: 415 })
  }

  try {
    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) return Response.json({ message: 'Ongeldige aanvraag.' }, { status: 413 })
    const body = JSON.parse(rawBody) as {
      answers?: Partial<Record<keyof ComplianceGuideAnswers, unknown>>
      idempotencyKey?: unknown
      startedAt?: unknown
      completedAt?: unknown
    }
    const access = await getArboGuideApiAccess()
    if (!access.authorized) return Response.json({ saved: false }, { status: access.status })
    if (typeof body.idempotencyKey !== 'string' || typeof body.startedAt !== 'string' || typeof body.completedAt !== 'string') {
      return Response.json({ message: 'Ongeldige aanvraag.' }, { status: 400 })
    }
    const startedAt = new Date(body.startedAt)
    const completedAt = new Date(body.completedAt)
    const now = Date.now()
    if (
      Number.isNaN(startedAt.getTime()) || Number.isNaN(completedAt.getTime()) ||
      completedAt < startedAt || completedAt.getTime() > now + 60_000 ||
      now - completedAt.getTime() > 5 * 60_000 || completedAt.getTime() - startedAt.getTime() > 24 * 60 * 60_000
    ) return Response.json({ message: 'Ongeldige aanvraag.' }, { status: 400 })
    const answers = normalizeComplianceGuideAnswers(body.answers ?? {})
    const report = buildComplianceReportData({
      answers,
      organizationName: access.organizationName,
      scannedAt: completedAt,
      tier: 'BASIC',
    })
    const result = await completeArboGuideRun({
      guideType: 'COMPLIANCE',
      guideVersion: String(COMPLIANCE_GUIDE_VERSION),
      reportVersion: COMPLIANCE_REPORT_VERSION,
      organizationId: access.organizationId,
      completedByUserId: access.userId,
      idempotencyKey: body.idempotencyKey,
      startedAt,
      completedAt,
      answersSnapshot: answers,
      reportSnapshot: report,
    })
    return Response.json({ saved: true, runId: result.id, reportNumber: result.reportNumber }, { status: result.created ? 201 : 200 })
  } catch (error) {
    if (error instanceof ArboGuideRunError) {
      const status = error.code === 'ACCESS_DENIED' ? 403 : error.code === 'CONFLICT' ? 409 : 400
      return Response.json({ message: 'Het resultaat kon niet veilig worden opgeslagen.' }, { status })
    }
    return Response.json({ message: 'Het resultaat kon niet veilig worden opgeslagen.' }, { status: 400 })
  }
}
