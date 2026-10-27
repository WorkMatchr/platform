import { NextResponse } from 'next/server'
import { isFinancialMaintenanceCronAuthorized } from '@/lib/finance/financial-maintenance-auth'
import { isDatabaseIdentityDiagnosticEnabled, readDatabaseIdentity } from '@/lib/maintenance/database-identity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' }

export async function POST(request: Request) {
  if (!isDatabaseIdentityDiagnosticEnabled()) return NextResponse.json({ error: 'Niet beschikbaar.' }, { status: 404, headers })
  if (!isFinancialMaintenanceCronAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401, headers })
  }
  if (request.headers.get('x-workmatchr-diagnostic') !== 'database-identity-v1' || new URL(request.url).search) {
    return NextResponse.json({ error: 'Ongeldige diagnoseaanvraag.' }, { status: 400, headers })
  }
  try {
    return NextResponse.json(await readDatabaseIdentity(), { headers })
  } catch {
    // Do not log adapter/parser errors: they may contain connection information.
    return NextResponse.json({ error: 'Database-identiteit kon niet veilig worden bevestigd.' }, { status: 503, headers })
  }
}
