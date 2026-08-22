import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const EXPECTED_PREVIEW_BRANCH = 'codex/mollie-credit-acceptance'
const EXPECTED_PREVIEW_ALIAS = 'https://platform-mollie-acceptance-preview-workmatchrs-projects.vercel.app'
const EXPECTED_PREVIEW_NEON_PROJECT_ID = 'odd-water-61971869'

function normalizedDatabaseHost(databaseUrl: string | undefined) {
  if (!databaseUrl) return null

  try {
    return new URL(databaseUrl).hostname.trim().toLowerCase() || null
  } catch {
    return null
  }
}

function hasExpectedPreviewDatabaseIdentity(databaseUrl: string | undefined) {
  const databaseHost = normalizedDatabaseHost(databaseUrl)
  if (!databaseHost) return false

  // The isolated Preview Neon resource has a separate, known project identity.
  // The parsed hostname is deliberately never returned or logged by this route.
  return process.env.NEON_PROJECT_ID === EXPECTED_PREVIEW_NEON_PROJECT_ID
}

function isMollieTestKey(value: string | undefined) {
  return Boolean(value && /^test_[A-Za-z0-9_\-]+$/.test(value))
}

function isExpectedAlias(value: string | undefined) {
  return value === EXPECTED_PREVIEW_ALIAS
}

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== EXPECTED_PREVIEW_BRANCH) {
    return new Response(null, { status: 404 })
  }

  const databaseUrl = process.env.DATABASE_URL
  return NextResponse.json({
    vercelEnvIsPreview: true,
    gitBranchIsExpected: true,
    mollieApiKeyIsTest: isMollieTestKey(process.env.MOLLIE_API_KEY),
    redirectBaseIsExpected: isExpectedAlias(process.env.MOLLIE_REDIRECT_BASE_URL),
    webhookBaseIsExpected: isExpectedAlias(process.env.MOLLIE_WEBHOOK_BASE_URL),
    databaseUrlPresent: Boolean(databaseUrl),
    databaseIsNotProduction: hasExpectedPreviewDatabaseIdentity(databaseUrl),
  }, {
    headers: { 'cache-control': 'no-store' },
  })
}
