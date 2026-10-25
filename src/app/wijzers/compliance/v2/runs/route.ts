import { z } from 'zod'
import { getArboGuideApiAccess } from '@/lib/arbo-guides/arbo-guide-access'
import { completeArboGuideRun, ArboGuideRunError } from '@/lib/arbo-guides/arbo-guide-run-service'
import { buildComplianceV2Report, complianceV2AnswersSchema } from '@/lib/compliance/compliance-v2'
import { isF4Enabled, loadF4Framework } from '@/lib/compliance/compliance-f4-framework'

export const runtime = 'nodejs'
const payload = z.object({ answers: complianceV2AnswersSchema, idempotencyKey: z.string().uuid(), startedAt: z.string().datetime(), completedAt: z.string().datetime() }).strict()
export async function POST(request: Request) {
  if (!isF4Enabled()) return Response.json({ saved: false }, { status: 404 })
  const access = await getArboGuideApiAccess()
  if (!access.authorized) return Response.json({ saved: false }, { status: access.status })
  if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ saved: false }, { status: 415 })
  if (Number(request.headers.get('content-length')) > 16_384) return Response.json({ saved: false }, { status: 413 })
  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).length > 16_384) return Response.json({ saved: false }, { status: 413 })
    const body = payload.parse(JSON.parse(raw))
    const startedAt = new Date(body.startedAt), completedAt = new Date(body.completedAt), now = Date.now()
    if (completedAt < startedAt || completedAt.getTime() > now + 60_000 || completedAt.getTime() - startedAt.getTime() > 86_400_000) throw new Error('Ongeldige periode.')
    const definition = await loadF4Framework()
    const report = buildComplianceV2Report(definition, body.answers, { organizationName: access.organizationName, scannedAt: body.completedAt })
    const run = await completeArboGuideRun({ guideType: 'COMPLIANCE', guideVersion: '2', reportVersion: '2.0', complianceFrameworkVersionId: definition.id,
      organizationId: access.organizationId, completedByUserId: access.userId, idempotencyKey: body.idempotencyKey,
      startedAt, completedAt, answersSnapshot: body.answers, reportSnapshot: report }, { maxCompletionAgeMs: 300_000 })
    return Response.json({ saved: true, runId: run.id, report }, { status: run.created ? 201 : 200 })
  } catch (error) {
    if (error instanceof ArboGuideRunError && error.code === 'EXPIRED_COMPLETION') return Response.json({ saved: false, code: 'EXPIRED_COMPLETION' }, { status: 409 })
    const status = error instanceof ArboGuideRunError && error.code === 'ACCESS_DENIED' ? 403 : error instanceof ArboGuideRunError && error.code === 'CONFLICT' ? 409 : 400
    return Response.json({ saved: false, message: 'Het resultaat kon niet veilig worden opgeslagen. Uw antwoorden blijven op deze pagina beschikbaar.' }, { status })
  }
}
