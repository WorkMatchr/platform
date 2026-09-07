import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ guard: vi.fn(), audit: vi.fn(), mail: vi.fn(), fetch: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ getPlatformOperatorContext: mocks.guard }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ adminActionLog: { create: mocks.audit } }) }))
vi.mock('@/lib/email', () => ({ sendAuthEmail: mocks.mail }))
import { tradingAccountStatus, resetTradingPassword, revokeTradingSessions } from './trading-access-service'
const token = 'synthetic-management-token-'.repeat(2)
const resetToken = 'synthetic-reset-token-only-for-tests'
describe('Trading-toegang via bestaand WorkMatchr Beheer', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('TRADING_ADMIN_API_TOKEN', token)
    vi.stubEnv('TRADING_MANAGEMENT_BASE_URL', 'https://trading.workmatchr.nl')
    vi.stubGlobal('fetch', mocks.fetch)
    mocks.guard.mockResolvedValue({ id: 'test-admin' })
    mocks.audit.mockResolvedValue({})
    mocks.mail.mockResolvedValue({ status: 'ACCEPTED' })
  })
  it('weigert iedere service vóór netwerkverkeer bij ontbrekende beheerbevoegdheid', async () => {
    mocks.guard.mockRejectedValue(new Error('not authorized'))
    for (const action of [tradingAccountStatus, resetTradingPassword, revokeTradingSessions]) {
      await expect(action('test-user')).rejects.toThrow()
    }
    expect(mocks.fetch).not.toHaveBeenCalled()
    expect(mocks.mail).not.toHaveBeenCalled()
  })
  it('projecteert uitsluitend veilige accountstatus en gebruikt aparte serverauth', async () => {
    mocks.fetch.mockResolvedValue(Response.json({ email: 'trade@workmatchr.nl', status: 'ACTIVE', last_login_at: null, password: 'PRIVATE' }))
    expect(await tradingAccountStatus('test-admin')).toEqual({ email: 'trade@workmatchr.nl', status: 'ACTIVE', lastLoginAt: null })
    expect(mocks.fetch).toHaveBeenCalledWith('https://trading.workmatchr.nl/api/management/status', expect.objectContaining({
      method: 'GET', redirect: 'error', cache: 'no-store', headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
    }))
  })
  it('verstuurt reset via bestaande mailfunctie en geeft nooit resetlink terug', async () => {
    mocks.fetch.mockResolvedValue(Response.json({ reset_url: 'https://trading.workmatchr.nl/reset-password#token=' + resetToken, expires_in: 1800 }))
    expect(await resetTradingPassword('test-admin')).toEqual({ ok: true })
    const email = mocks.mail.mock.calls[0][0]
    expect(email.to).toBe('trade@workmatchr.nl')
    expect(email.subject).toBe('Wachtwoord opnieuw instellen – WorkMatchr Trading')
    expect(email.text).toContain('30 minuten')
    expect(email.developmentUrl).toBeUndefined()
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain(resetToken)
  })
  it('trekt sessies in zonder incoming cookies of headers door te sturen', async () => {
    mocks.fetch.mockResolvedValue(Response.json({ ok: true }))
    expect(await revokeTradingSessions('test-admin')).toEqual({ ok: true })
    expect(mocks.fetch.mock.calls[0][1].method).toBe('POST')
    expect(Object.keys(mocks.fetch.mock.calls[0][1].headers)).toEqual(['Accept', 'Authorization'])
  })
  it('weigert afwijkende resetbestemming en verstuurt geen e-mail', async () => {
    mocks.fetch.mockResolvedValue(Response.json({ reset_url: 'https://evil.example/reset-password#token=' + resetToken, expires_in: 1800 }))
    await expect(resetTradingPassword('test-admin')).rejects.toThrow('tijdelijk niet beschikbaar')
    expect(mocks.mail).not.toHaveBeenCalled()
  })
  it('sanitiseert backend- en mailfouten zonder token te tonen', async () => {
    mocks.fetch.mockRejectedValue(new Error(token))
    await expect(tradingAccountStatus('test-admin')).rejects.toThrow('tijdelijk niet beschikbaar')
    mocks.fetch.mockResolvedValue(Response.json({ reset_url: 'https://trading.workmatchr.nl/reset-password#token=' + resetToken, expires_in: 1800 }))
    mocks.mail.mockRejectedValue(new Error(resetToken))
    await expect(resetTradingPassword('test-admin')).rejects.toThrow('tijdelijk niet beschikbaar')
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain(resetToken)
  })
})
