import { afterEach, describe, expect, it } from 'vitest'

const keys = [
  'VERCEL_ENV',
  'VERCEL_GIT_COMMIT_REF',
  'MOLLIE_API_KEY',
  'MOLLIE_REDIRECT_BASE_URL',
  'MOLLIE_WEBHOOK_BASE_URL',
  'DATABASE_URL',
  'NEON_PROJECT_ID',
] as const

const original = Object.fromEntries(keys.map((key) => [key, process.env[key]]))

function restoreEnvironment() {
  for (const key of keys) {
    const value = original[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function configurePreviewRuntime() {
  process.env.VERCEL_ENV = 'preview'
  process.env.VERCEL_GIT_COMMIT_REF = 'codex/mollie-credit-acceptance'
  process.env.MOLLIE_API_KEY = 'test_preview_only_key'
  process.env.MOLLIE_REDIRECT_BASE_URL = 'https://platform-mollie-acceptance-preview-workmatchrs-projects.vercel.app'
  process.env.MOLLIE_WEBHOOK_BASE_URL = 'https://platform-mollie-acceptance-preview-workmatchrs-projects.vercel.app'
  process.env.DATABASE_URL = 'postgresql://preview:password@preview.example.invalid:5432/neondb'
  process.env.NEON_PROJECT_ID = 'odd-water-61971869'
}

describe('GET /api/internal/preview-mollie-runtime-health', () => {
  afterEach(restoreEnvironment)

  it('bestaat uitsluitend op de beoogde Preview-branch', async () => {
    configurePreviewRuntime()
    process.env.VERCEL_GIT_COMMIT_REF = 'main'
    const { GET } = await import('./route')

    expect((await GET()).status).toBe(404)
  })

  it('geeft uitsluitend niet-gevoelige configuratiestatussen terug', async () => {
    configurePreviewRuntime()
    const { GET } = await import('./route')
    const response = await GET()
    const body = await response.json() as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(body).toEqual({
      vercelEnvIsPreview: true,
      gitBranchIsExpected: true,
      mollieApiKeyIsTest: true,
      redirectBaseIsExpected: true,
      webhookBaseIsExpected: true,
      databaseUrlPresent: true,
      databaseIsNotProduction: true,
    })
    expect(JSON.stringify(body)).not.toContain(process.env.MOLLIE_API_KEY)
    expect(JSON.stringify(body)).not.toContain(process.env.DATABASE_URL)
  })

  it('faalt gesloten bij een ontbrekende Preview-database-identiteit', async () => {
    configurePreviewRuntime()
    delete process.env.NEON_PROJECT_ID
    const { GET } = await import('./route')
    const body = await (await GET()).json() as Record<string, unknown>

    expect(body.databaseIsNotProduction).toBe(false)
  })
})
