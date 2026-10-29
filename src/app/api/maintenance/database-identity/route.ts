import { NextResponse } from 'next/server'
import { isDatabaseIdentityDiagnosticAuthorized } from '@/lib/maintenance/database-identity-auth'
import { isDatabaseIdentityDiagnosticEnabled, readDatabaseIdentity } from '@/lib/maintenance/database-identity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' }

export async function POST(request: Request) {
  if (!isDatabaseIdentityDiagnosticEnabled()) return NextResponse.json({ error: 'Niet beschikbaar.' }, { status: 404, headers })
  if (!isDatabaseIdentityDiagnosticAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401, headers })
  }
  if (request.headers.get('x-workmatchr-diagnostic') !== 'database-identity-v1' || new URL(request.url).search) {
    return NextResponse.json({ error: 'Ongeldige diagnoseaanvraag.' }, { status: 400, headers })
  }
  try {
    const identity = await readDatabaseIdentity()
    // A slow read must not disclose identity after the authorized window closes.
    if (!isDatabaseIdentityDiagnosticEnabled()) return NextResponse.json({ error: 'Niet beschikbaar.' }, { status: 404, headers })
    return NextResponse.json(identity, { headers })
  } catch {
    // Do not log adapter/parser errors: they may contain connection information.
    return NextResponse.json({ error: 'Database-identiteit kon niet veilig worden bevestigd.' }, { status: 503, headers })
  }
}
