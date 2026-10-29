import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const services = vi.hoisted(() => ({
  finance: vi.fn(async () => ({ status: 'SUCCEEDED' })),
  mail: vi.fn(async () => ({ claimed: 0, sent: 0, retry: 0, failed: 0 })),
}))
vi.mock('@/lib/finance/financial-maintenance-service', () => ({ runFinancialMaintenance: services.finance }))
vi.mock('@/lib/marketplace/assignment-email-worker', () => ({ deliverAssignmentEmails: services.mail }))
import { isDatabaseIdentityDiagnosticAuthorized } from './database-identity-auth'
import { GET as financeCron, POST as financeManual } from '@/app/api/maintenance/finance/route'
import { GET as mailCron, POST as mailDispatch } from '@/app/api/maintenance/marketplace/route'

const diagnostic = 'a'.repeat(64) // Public synthetic fixtures, not generated credentials.
const cron = 'b'.repeat(64)
const finance = 'c'.repeat(64)
const header = `Bearer ${diagnostic}`
const request = (token: string) => new Request('https://app.example.invalid/api/maintenance/test', { headers: { authorization: `Bearer ${token}` } })

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-29T10:00:00Z'))
  vi.stubEnv('VERCEL_ENV', 'production')
  vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_ENABLED', 'true')
  vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_UNTIL', '2026-10-29T10:15:00Z')
  vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_SECRET', diagnostic)
  vi.stubEnv('CRON_SECRET', cron)
  vi.stubEnv('FINANCIAL_MAINTENANCE_SECRET', finance)
})
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers() })

describe('dedicated temporary database identity authorization', () => {
  it('requires the exact independently configured key', () => {
    expect(isDatabaseIdentityDiagnosticAuthorized(header)).toBe(true)
    expect(isDatabaseIdentityDiagnosticAuthorized(`Bearer ${cron}`)).toBe(false)
    expect(isDatabaseIdentityDiagnosticAuthorized(`Bearer ${finance}`)).toBe(false)
  })
  it.each([null, '', 'Basic invalid', `bearer ${diagnostic}`, `Bearer ${'d'.repeat(64)}`, `Bearer ${diagnostic}suffix`, `Bearer ${diagnostic.slice(1)}`, `Bearer ${diagnostic} `, `Bearer ${'é'.repeat(64)}`])('rejects missing, malformed or incorrect credentials', value => {
    expect(isDatabaseIdentityDiagnosticAuthorized(value)).toBe(false)
  })
  it.each(['', 'a'.repeat(63), 'a'.repeat(65), 'z'.repeat(64), `${diagnostic}\n`, 'synthetic-passphrase-that-is-not-a-random-hex-key'])('fails closed on invalid key configuration', secret => {
    vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_SECRET', secret)
    expect(isDatabaseIdentityDiagnosticAuthorized(`Bearer ${secret}`)).toBe(false)
  })
  it.each(['CRON_SECRET', 'FINANCIAL_MAINTENANCE_SECRET'])('refuses reuse of %s as a diagnostic key', name => {
    vi.stubEnv(name, diagnostic)
    expect(isDatabaseIdentityDiagnosticAuthorized(header)).toBe(false)
  })
  it.each(['', 'false', 'TRUE'])('cannot bypass a closed gate: %s', enabled => {
    vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_ENABLED', enabled)
    expect(isDatabaseIdentityDiagnosticAuthorized(header)).toBe(false)
  })
  it.each(['', 'invalid', '2026-10-29T10:00:00Z', '2026-10-29T09:59:59Z', '2026-10-29T10:15:01Z'])('refuses missing, expired or unbounded windows', until => {
    vi.stubEnv('DATABASE_IDENTITY_DIAGNOSTIC_UNTIL', until)
    expect(isDatabaseIdentityDiagnosticAuthorized(header)).toBe(false)
  })
  it('expires at the exact boundary without redeployment or secret rotation', () => {
    vi.setSystemTime(new Date('2026-10-29T10:14:59.999Z'))
    expect(isDatabaseIdentityDiagnosticAuthorized(header)).toBe(true)
    vi.setSystemTime(new Date('2026-10-29T10:15:00Z'))
    expect(isDatabaseIdentityDiagnosticAuthorized(header)).toBe(false)
  })
  it('keeps the existing Preview isolation guard', () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('PREVIEW_INFRASTRUCTURE_APPROVED', '')
    expect(isDatabaseIdentityDiagnosticAuthorized(header)).toBe(false)
  })
})

describe('isolation from unchanged financial and mail maintenance routes', () => {
  it('cannot start any maintenance worker with the diagnostic key', async () => {
    for (const handler of [financeCron, financeManual, mailCron, mailDispatch]) {
      expect((await handler(request(diagnostic))).status).toBe(401)
    }
    expect(services.finance).not.toHaveBeenCalled()
    expect(services.mail).not.toHaveBeenCalled()
  })
  it('does not supply a fallback when ordinary maintenance secrets are absent', async () => {
    vi.stubEnv('CRON_SECRET', '')
    vi.stubEnv('FINANCIAL_MAINTENANCE_SECRET', '')
    expect((await financeCron(request(diagnostic))).status).toBe(401)
    expect((await financeManual(request(diagnostic))).status).toBe(503)
    expect((await mailDispatch(request(diagnostic))).status).toBe(401)
    expect(services.finance).not.toHaveBeenCalled()
    expect(services.mail).not.toHaveBeenCalled()
  })
  it('preserves existing cron and financial authorization after diagnostic expiry', async () => {
    vi.setSystemTime(new Date('2026-10-29T10:15:00Z'))
    expect(isDatabaseIdentityDiagnosticAuthorized(header)).toBe(false)
    expect((await financeCron(request(cron))).status).toBe(200)
    expect((await financeManual(request(finance))).status).toBe(200)
    expect((await mailCron(request(cron))).status).toBe(200)
    expect((await mailDispatch(request(cron))).status).toBe(200)
    expect(services.finance).toHaveBeenCalledTimes(2)
    expect(services.mail).toHaveBeenCalledTimes(2)
  })
})
