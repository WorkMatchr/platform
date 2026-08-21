import { getArboGuideApiAccess } from '@/lib/arbo-guides/arbo-guide-access'
import { completeArboGuideRun, ArboGuideRunError } from '@/lib/arbo-guides/arbo-guide-run-service'
import { BHV_GUIDE_VERSION, normalizeBhvGuideAnswers, type BhvGuideAnswers } from '@/lib/bhv-guide/bhv-guide'
import { BHV_REPORT_VERSION, buildBhvReportData } from '@/lib/bhv-guide/bhv-report'

export const runtime = 'nodejs'
export async function POST(request: Request) {
  try {
    const text = await request.text()
    if (new TextEncoder().encode(text).byteLength > 20_000) return Response.json({ message: 'Ongeldige aanvraag.' }, { status: 413 })
    const body = JSON.parse(text) as { answers?: Partial<Record<keyof BhvGuideAnswers, unknown>>; idempotencyKey?: unknown; startedAt?: unknown; completedAt?: unknown }
    const access = await getArboGuideApiAccess()
    if (!access.authorized) return Response.json({ saved: false }, { status: access.status })
    if (typeof body.idempotencyKey !== 'string' || typeof body.startedAt !== 'string' || typeof body.completedAt !== 'string') return Response.json({ message: 'Ongeldige aanvraag.' }, { status: 400 })
    const startedAt = new Date(body.startedAt); const completedAt = new Date(body.completedAt); const now = Date.now()
    if ([startedAt, completedAt].some((date) => Number.isNaN(date.getTime())) || completedAt < startedAt || completedAt.getTime() > now + 60_000 || now - completedAt.getTime() > 5 * 60_000 || completedAt.getTime() - startedAt.getTime() > 86_400_000) return Response.json({ message: 'Ongeldige aanvraag.' }, { status: 400 })
    const answers = normalizeBhvGuideAnswers(body.answers ?? {})
    const report = buildBhvReportData({ answers, organizationName: access.organizationName, scannedAt: completedAt, tier: 'BASIC' })
    const result = await completeArboGuideRun({ guideType: 'BHV', guideVersion: String(BHV_GUIDE_VERSION), reportVersion: BHV_REPORT_VERSION, organizationId: access.organizationId, completedByUserId: access.userId, idempotencyKey: body.idempotencyKey, startedAt, completedAt, answersSnapshot: answers, reportSnapshot: report })
    return Response.json({ saved: true, runId: result.id, reportNumber: result.reportNumber }, { status: result.created ? 201 : 200 })
  } catch (error) {
    const status = error instanceof ArboGuideRunError
      ? error.code === 'ACCESS_DENIED' ? 403 : error.code === 'CONFLICT' ? 409 : 400
      : 400
    return Response.json({ message: 'Het resultaat kon niet veilig worden opgeslagen.' }, { status })
  }
}
