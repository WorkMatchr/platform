import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { betterAuth } from 'better-auth'
import { memoryAdapter } from 'better-auth/adapters/memory'
import { hashPassword } from 'better-auth/crypto'

vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ user: { findUnique: async () => ({ status: 'ACTIVE' }) } }) }))
vi.mock('@/lib/email', () => ({ sendAuthEmail: vi.fn(), invitationActivationEmail: vi.fn(), passwordResetEmail: vi.fn(), verificationEmail: vi.fn() }))
vi.mock('@/lib/account-architecture/invitation-acceptance-service', () => ({ activateInvitationAfterPasswordReset: vi.fn(), activateVerifiedInvitation: vi.fn(), isPendingOrganizationInvitation: vi.fn() }))
import { auth as applicationAuth } from './auth'

const password = 'Synthetic session fixture only 472!'
const email = 'session-check@example.invalid'
let passwordHash: string
beforeAll(async () => { passwordHash = await hashPassword(password) }, 180000)
afterEach(() => vi.useRealTimers())
async function fixture() {
  const db: Record<string, Record<string, unknown>[]> = { user: [], account: [], session: [], verification: [], RateLimit: [] }
  const auth = betterAuth({ ...applicationAuth.options, baseURL: 'http://localhost:3046', trustedOrigins: ['http://localhost:3046'],
    secret: 'synthetic-unit-test-secret-not-for-use-9384', database: memoryAdapter(db), plugins: [] })
  const ctx = await auth.$context
  const user = await ctx.internalAdapter.createUser({ name: 'Synthetic session test', email, emailVerified: true })
  await ctx.internalAdapter.createAccount({ userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash })
  async function login(rememberMe?: unknown) {
    return auth.handler(new Request('http://localhost:3046/api/auth/sign-in/email', { method: 'POST', headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3046' }, body: JSON.stringify({ email, password, ...(rememberMe === undefined ? {} : { rememberMe }) }) }))
  }
  return { auth, db, login }
}
const cookies = (response: Response) => response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')

describe('native Better Auth sessies met de echte WorkMatchr hooks', () => {
  it.each([undefined, false])('geeft %s een sessiecookie en maximaal 24 uur, zonder refresh', async remember => {
    const { auth, db, login } = await fixture()
    const before = Date.now()
    const response = await login(remember)
    expect(response.status).toBe(200)
    const session = db.session[0]
    expect(new Date(session.expiresAt as string).getTime() - before).toBeGreaterThanOrEqual(86400000)
    expect(new Date(session.expiresAt as string).getTime() - before).toBeLessThan(86405000)
    const tokenCookie = response.headers.getSetCookie().find(value => value.startsWith('better-auth.session_token='))!
    expect(tokenCookie).toContain('HttpOnly'); expect(tokenCookie).toContain('SameSite=Lax'); expect(tokenCookie).not.toMatch(/Max-Age|Expires=/)
    expect(cookies(response)).toContain('dont_remember')
    const expiry = new Date(session.expiresAt as string).getTime()
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(before + 23 * 3600000)
    const fresh = await auth.api.getSession({ headers: new Headers({ cookie: cookies(response) }) })
    expect(fresh?.session.expiresAt.getTime()).toBe(expiry)
    vi.setSystemTime(expiry + 1)
    expect(await auth.api.getSession({ headers: new Headers({ cookie: cookies(response) }) })).toBeNull()
  })
  it('behoudt de rollende zeven dagen alleen na expliciete keuze', async () => {
    const { auth, db, login } = await fixture()
    const response = await login(true)
    expect(response.status).toBe(200)
    const cookie = response.headers.getSetCookie().find(value => value.startsWith('better-auth.session_token='))!
    expect(cookie).toContain('Max-Age=604800')
    const initial = new Date(db.session[0].expiresAt as string).getTime()
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(Date.now() + 2 * 86400000)
    const renewed = await auth.api.getSession({ headers: new Headers({ cookie: cookies(response) }) })
    expect(renewed?.session.expiresAt.getTime()).toBeGreaterThan(initial)
  })
  it.each(['true', 'false', 1, null])('weigert ongeldige rememberMe=%s zonder sessie', async remember => {
    const { db, login } = await fixture()
    expect((await login(remember)).status).toBe(400)
    expect(db.session).toHaveLength(0)
  })
  it('een verwijderde dont_remember-marker kan een korte sessie niet verlengen', async () => {
    const { auth, db, login } = await fixture()
    const response = await login(false)
    const expiry = new Date(db.session[0].expiresAt as string).getTime()
    const tokenOnly = cookies(response).split('; ').filter(value => value.startsWith('better-auth.session_token=')).join('; ')
    const result = await auth.handler(new Request('http://localhost:3046/api/auth/get-session', { headers: { cookie: tokenOnly } }))
    expect(result.status).toBe(401)
    expect(new Date(db.session[0].expiresAt as string).getTime()).toBe(expiry)
  })
  it('beÃ«indigt de sessie via Better Auth en laat andere sessies intact', async () => {
    const { auth, db, login } = await fixture()
    const first = await login(false); await login(true)
    expect(db.session).toHaveLength(2)
    const result = await auth.api.signOut({ headers: new Headers({ cookie: cookies(first), origin: 'http://localhost:3046' }) })
    expect(result.success).toBe(true); expect(db.session).toHaveLength(1)
    expect(await auth.api.getSession({ headers: new Headers({ cookie: cookies(first) }) })).toBeNull()
  })
})
