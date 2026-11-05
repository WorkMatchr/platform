import { afterEach, describe, expect, it, vi } from 'vitest'
import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'

const mail = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({}) }))
vi.mock('@/lib/email', () => ({ sendAuthEmail: mail.send, invitationActivationEmail: vi.fn(), passwordResetEmail: vi.fn(), verificationEmail: vi.fn() }))
vi.mock('@/lib/account-architecture/invitation-acceptance-service', () => ({ activateInvitationAfterPasswordReset: vi.fn(), activateVerifiedInvitation: vi.fn(), isPendingOrganizationInvitation: vi.fn() }))

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); vi.resetModules() })

async function fixture() {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('BETTER_AUTH_URL', 'https://academy.example.invalid')
  vi.stubEnv('BETTER_AUTH_SECRET', 'synthetic-surface-test-secret-not-for-use-947183')
  const { auth: applicationAuth } = await import('./auth')
  const db: Record<string, Record<string, unknown>[]> = { user: [], account: [], session: [], verification: [], RateLimit: [] }
  // Preserve the actual application plugins/hooks; only persistence is replaced.
  const auth = betterAuth({ ...applicationAuth.options, database: memoryAdapter(db) })
  return { auth, db }
}

describe('production Better Auth attack surface with actual WorkMatchr configuration', () => {
  it('keeps verified email/password, secure cookies, database rate limits and an exact trusted origin', async () => {
    const { auth } = await fixture()
    const options: BetterAuthOptions = auth.options
    expect(options.emailAndPassword).toMatchObject({ enabled: true, requireEmailVerification: true, autoSignIn: false, revokeSessionsOnPasswordReset: true })
    expect(options.advanced?.useSecureCookies).toBe(true)
    expect(options.trustedOrigins).toEqual(['https://academy.example.invalid'])
    expect(options.rateLimit).toMatchObject({ enabled: true, storage: 'database' })
    expect(options.session?.cookieCache?.enabled).not.toBe(true)
    expect(options.socialProviders).toBeUndefined()
    const plugins = options.plugins?.map(plugin => plugin.id)
    expect(plugins).toEqual(['have-i-been-pwned', 'workmatchr-password-breach-check-failure-audit', 'next-cookies'])
  })

  it.each(['/sign-in/magic-link', '/magic-link/verify', '/oauth-proxy-callback', '/device/code', '/device/approve'])(
    'does not expose %s or create identity/session/mail state', async path => {
      const { auth, db } = await fixture()
      const response = await auth.handler(new Request(`https://academy.example.invalid/api/auth${path}`, {
        method: path === '/magic-link/verify' ? 'GET' : 'POST',
        headers: { origin: 'https://academy.example.invalid', 'Content-Type': 'application/json' },
        ...(path === '/magic-link/verify' ? {} : { body: JSON.stringify({ email: 'surface@example.invalid', token: 'synthetic-not-a-token' }) }),
      }))
      expect(response.status).toBe(404)
      expect(response.headers.getSetCookie()).toHaveLength(0)
      expect(db.user).toHaveLength(0)
      expect(db.account).toHaveLength(0)
      expect(db.session).toHaveLength(0)
      expect(db.verification).toHaveLength(0)
      expect(mail.send).not.toHaveBeenCalled()
    },
  )

  it('rejects social sign-in when an attacker supplies a provider', async () => {
    const { auth, db } = await fixture()
    const response = await auth.handler(new Request('https://academy.example.invalid/api/auth/sign-in/social', {
      method: 'POST', headers: { origin: 'https://academy.example.invalid', 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'github', email: 'surface@example.invalid' }),
    }))
    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(500)
    expect(db.user).toHaveLength(0)
    expect(db.session).toHaveLength(0)
    expect(mail.send).not.toHaveBeenCalled()
  })
})
