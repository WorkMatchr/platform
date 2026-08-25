import { NextResponse } from 'next/server'

const EXPECTED_BRANCH = 'codex/jortt-operationalization'
const TOKEN_URL = 'https://app.jortt.nl/oauth-provider/oauth/token'
const API_BASE = 'https://api.jortt.nl/v3'
const REQUIRED_SCOPES = ['customers:read', 'customers:write', 'invoices:read', 'invoices:write'] as const

function unavailable() {
  return new NextResponse(null, { status: 404 })
}

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== EXPECTED_BRANCH) return unavailable()

  const clientId = process.env.JORTT_CLIENT_ID
  const clientSecret = process.env.JORTT_CLIENT_SECRET
  const acceptanceEnvironment = process.env.JORTT_SYNC_ENVIRONMENT === 'acceptance'
  if (!clientId || !clientSecret || !acceptanceEnvironment) {
    return NextResponse.json({
      oauthAuthenticated: false,
      administrationReachable: false,
      acceptanceEnvironment,
      safeErrorCode: 'JORTT_PREVIEW_CONFIGURATION_INVALID',
      tradenameConfigured: Boolean(process.env.JORTT_TRADENAME_ID),
      ledgerAccountConfigured: Boolean(process.env.JORTT_REVENUE_LEDGER_ACCOUNT_ID),
    }, { status: 503 })
  }

  try {
    const requestedScope = REQUIRED_SCOPES.join(' ')
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials', scope: requestedScope }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    })
    if (!tokenResponse.ok) throw new Error('JORTT_AUTHENTICATION_FAILED')
    const token = await tokenResponse.json() as { access_token?: string; scope?: string }
    if (!token.access_token) throw new Error('JORTT_ACCESS_TOKEN_MISSING')
    const grantedScopes = token.scope?.split(' ') ?? REQUIRED_SCOPES
    const requestedScopesAccepted = REQUIRED_SCOPES.every((scope) => grantedScopes.includes(scope))
    if (!requestedScopesAccepted) throw new Error('JORTT_REQUIRED_SCOPES_MISSING')

    const headers = { Authorization: `Bearer ${token.access_token}`, Accept: 'application/json' }
    const [customers, invoices] = await Promise.all([
      fetch(`${API_BASE}/customers?page=1`, { headers, signal: AbortSignal.timeout(10_000), cache: 'no-store' }),
      fetch(`${API_BASE}/invoices?page=1`, { headers, signal: AbortSignal.timeout(10_000), cache: 'no-store' }),
    ])
    const administrationReachable = customers.ok && invoices.ok
    return NextResponse.json({
      oauthAuthenticated: true,
      requestedScopesAccepted,
      scopeEchoed: Boolean(token.scope),
      administrationReachable,
      customersReadStatus: customers.status,
      invoicesReadStatus: invoices.status,
      acceptanceEnvironment,
      tradenameConfigured: Boolean(process.env.JORTT_TRADENAME_ID),
      ledgerAccountConfigured: Boolean(process.env.JORTT_REVENUE_LEDGER_ACCOUNT_ID),
      safeErrorCode: administrationReachable ? null : 'JORTT_ADMINISTRATION_UNREACHABLE',
    }, { status: administrationReachable ? 200 : 502 })
  } catch (error) {
    const message = error instanceof Error && /^[A-Z0-9_]{3,80}$/.test(error.message)
      ? error.message
      : 'JORTT_CONNECTIVITY_CHECK_FAILED'
    return NextResponse.json({
      oauthAuthenticated: false,
      administrationReachable: false,
      acceptanceEnvironment,
      safeErrorCode: message,
      tradenameConfigured: Boolean(process.env.JORTT_TRADENAME_ID),
      ledgerAccountConfigured: Boolean(process.env.JORTT_REVENUE_LEDGER_ACCOUNT_ID),
    }, { status: 502 })
  }
}
