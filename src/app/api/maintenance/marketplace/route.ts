import { isFinancialMaintenanceCronAuthorized } from '@/lib/finance/financial-maintenance-auth'
import { dispatchBatch } from '@/lib/marketplace/dispatch-batch'
import { claimDispatchSlot, finishDispatch } from '@/lib/marketplace/dispatch-status'

export const maxDuration = 300
const headers = { 'Cache-Control': 'no-store' }
const unavailable = () => Response.json({ error: 'NOTIFICATION_DISPATCH_INCOMPLETE' }, { status: 503, headers })
const denied = () => Response.json({ error: 'Niet geautoriseerd.' }, { status: 401, headers })
const inactive = () => Response.json({ error: 'Planner inactief.' }, { status: 404, headers })

function authorized(request: Request) {
  return process.env.CRON_SECRET !== process.env.MARKETPLACE_MONITOR_SECRET
    && isFinancialMaintenanceCronAuthorized(request.headers.get('authorization'))
}

export async function POST(request: Request) {
  if (!authorized(request)) return denied()
  if ((process.env.MARKETPLACE_DISPATCH_PLANNER ?? 'github') !== 'github') return inactive()
  try { return Response.json(await dispatchBatch(), { headers }) } catch { return unavailable() }
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== 'production') return inactive()
  if (!authorized(request)) return denied()
  if (process.env.MARKETPLACE_DISPATCH_PLANNER !== 'vercel') return inactive()
  const start = Date.now()
  const counters = { claimed: 0, sent: 0, retry: 0, failed: 0 }
  let claimed = false
  try {
    claimed = await claimDispatchSlot(start)
    if (!claimed) return Response.json({ duplicate: true }, { headers })
    // Leave time for the final in-flight batch and durable completion record.
    for (let batch = 0; batch < 100 && Date.now() - start < 120_000; batch++) {
      const r = await dispatchBatch()
      counters.claimed += r.claimed
      counters.sent += r.sent
      counters.retry += r.retry
      counters.failed += r.failed
      if (r.contact.failed || r.contact.retention.reviewRequired) throw Error('CONTACT_REVIEW_REQUIRED')
      if (r.claimed < 10 && r.contact.claimed < 5 && !r.contact.retention.pending) {
        await finishDispatch('COMPLETED', counters)
        return Response.json(counters, { headers })
      }
    }
  } catch {
    if (!claimed) return unavailable()
  }
  await finishDispatch('FAILED', counters)
  return unavailable()
}
