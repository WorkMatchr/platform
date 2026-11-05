import { NextResponse } from 'next/server'
import { isFinancialMaintenanceAuthorized } from '@/lib/finance/financial-maintenance-auth'
import { readAcademyOperations } from '@/lib/learning/academy-operations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }

/** Opt-in private observation only. No provider, worker, scheduler or mutation. */
export async function GET(request: Request) {
  if (process.env.ACADEMY_OPERATIONS_MONITOR_ENABLED !== 'true') return NextResponse.json({ error: 'Niet beschikbaar.' }, { status: 404, headers })
  if (!isFinancialMaintenanceAuthorized(request.headers.get('authorization'))) return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401, headers })
  try {
    const report = await readAcademyOperations()
    return NextResponse.json(report, { headers })
  } catch {
    // Do not serialize Prisma/provider errors: these may contain queries or credentials.
    return NextResponse.json({ status: 'UNAVAILABLE', code: 'ACADEMY_OPERATIONS_READ_FAILED' }, { status: 503, headers })
  }
}
