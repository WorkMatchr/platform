import { timingSafeEqual } from 'node:crypto'
import { isPreviewInfrastructureAccepted } from '@/lib/maintenance/preview-isolation'
import { readDispatchStatus } from '@/lib/marketplace/dispatch-status'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: Request) {
  const key = process.env.MARKETPLACE_MONITOR_SECRET
  const supplied = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from('Bearer ' + key)
  if (!isPreviewInfrastructureAccepted() || !key || !/^[a-f0-9]{64}$/.test(key)
    || [process.env.CRON_SECRET, process.env.FINANCIAL_MAINTENANCE_SECRET, process.env.CONTACT_MONITOR_SECRET].includes(key)
    || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return Response.json({ error: 'Niet geautoriseerd.' }, { status: 401, headers })
  }
  try {
    return Response.json(await readDispatchStatus(), { headers })
  } catch {
    return Response.json({ error: 'STATUS_UNAVAILABLE' }, { status: 503, headers })
  }
}
