import 'server-only'
import { getPlatformOperatorContext } from '@/lib/platform-admin/platform-admin-authorization'
import { getPrisma } from '@/lib/prisma'
import { sendAuthEmail } from '@/lib/email'

const email = 'trade@workmatchr.nl'
export class TradingAccessError extends Error {
  constructor() { super('Trading-toegang is tijdelijk niet beschikbaar. Probeer het later opnieuw.') }
}
function configuration() {
  const token = process.env.TRADING_ADMIN_API_TOKEN ?? ''
  const url = new URL(process.env.TRADING_MANAGEMENT_BASE_URL ?? 'https://trading.workmatchr.nl')
  const local = process.env.NODE_ENV !== 'production' && !process.env.VERCEL &&
    ['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol === 'http:'
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token) || url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (!local && url.origin !== 'https://trading.workmatchr.nl')) throw new TradingAccessError()
  return { origin: url.origin, token }
}
async function audit(actorUserId: string, action: string) {
  await getPrisma().adminActionLog.create({ data: {
    actorUserId, action, entityType: 'TradingAccess', entityId: 'single-user',
    reason: 'Beheer van WorkMatchr Trading-toegang',
    metadata: { policyVersion: 'TRADING_ACCESS_V1' },
  } })
}
async function request(action: 'status' | 'password-reset' | 'revoke-sessions') {
  const config = configuration()
  const response = await fetch(config.origin + '/api/management/' + action, {
    method: action === 'status' ? 'GET' : 'POST', redirect: 'error', cache: 'no-store',
    headers: { Accept: 'application/json', Authorization: 'Bearer ' + config.token },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) throw new TradingAccessError()
  return { body: await response.json(), origin: config.origin }
}
export async function tradingAccountStatus(actorUserId: string) {
  await getPlatformOperatorContext(actorUserId)
  try {
    const { body } = await request('status')
    if (body.email !== email || !['ACTIVE', 'BLOCKED'].includes(body.status) ||
        !(body.last_login_at === null || (typeof body.last_login_at === 'string' && Number.isFinite(Date.parse(body.last_login_at))))) throw new TradingAccessError()
    return { email, status: body.status as 'ACTIVE' | 'BLOCKED', lastLoginAt: body.last_login_at as string | null }
  } catch { throw new TradingAccessError() }
}
export async function resetTradingPassword(actorUserId: string) {
  await getPlatformOperatorContext(actorUserId)
  try {
    // Record only fixed action metadata; never archive the secret-bearing mail.
    await audit(actorUserId, 'TRADING_PASSWORD_RESET_REQUESTED')
    const { body, origin } = await request('password-reset')
    if (typeof body.reset_url !== 'string' || body.expires_in !== 1800) throw new TradingAccessError()
    const url = new URL(body.reset_url)
    if (url.origin !== origin || url.pathname !== '/reset-password' || url.search ||
        !/^#token=[A-Za-z0-9_-]{20,128}$/.test(url.hash)) throw new TradingAccessError()
    const subject = 'Wachtwoord opnieuw instellen – WorkMatchr Trading'
    const text = `Stel uw wachtwoord in via deze link: ${url.href}\n\nDe link is 30 minuten geldig en werkt eenmalig. Na het instellen worden alle bestaande Trading-sessies beëindigd.`
    const delivery = await sendAuthEmail({ kind: 'PASSWORD_RESET', to: email, subject, text,
      html: `<p>Stel uw wachtwoord in via <a href="${url.href}">deze beveiligde link</a>.</p><p>De link is 30 minuten geldig en werkt eenmalig. Alle bestaande Trading-sessies worden daarna beëindigd.</p>` })
    if (delivery.status !== 'ACCEPTED') throw new TradingAccessError()
    await audit(actorUserId, 'TRADING_PASSWORD_RESET_MAIL_ACCEPTED')
    return { ok: true }
  } catch {
    await audit(actorUserId, 'TRADING_PASSWORD_RESET_FAILED')
    throw new TradingAccessError()
  }
}
export async function revokeTradingSessions(actorUserId: string) {
  await getPlatformOperatorContext(actorUserId)
  try {
    await audit(actorUserId, 'TRADING_SESSION_REVOCATION_REQUESTED')
    const { body } = await request('revoke-sessions')
    if (body.ok !== true) throw new TradingAccessError()
    await audit(actorUserId, 'TRADING_SESSIONS_REVOKED')
    return { ok: true }
  } catch { throw new TradingAccessError() }
}
