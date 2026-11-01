import { NextResponse } from 'next/server'
import { isFinancialMaintenanceCronAuthorized } from '@/lib/finance/financial-maintenance-auth'
import { readContactHealth } from '@/lib/contact/contact-health'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store' }

export async function GET(request: Request) {
  if (process.env.CONTACT_MONITOR_ENABLED !== 'true') return NextResponse.json({ error: 'Niet beschikbaar.' }, { status: 404, headers })
  if (!isFinancialMaintenanceCronAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401, headers })
  }
  try { return NextResponse.json(await readContactHealth(), { headers }) }
  catch { return NextResponse.json({ error: 'CONTACT_HEALTH_UNAVAILABLE' }, { status: 503, headers }) }
}
