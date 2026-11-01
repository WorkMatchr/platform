import { randomBytes, randomUUID } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthEmailDeliveryError, sendAuthEmail } from '@/lib/email'
import { renderContactEmail } from './contact-envelope'
import { submitContact } from './contact-service'

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), send: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))
vi.mock('resend', () => ({ Resend: class { emails = { send: mocks.send } } }))

const content = {
  name: 'Synthetic privacy probe', email: 'privacy-probe@example.invalid',
  subject: 'GENERAL' as const, message: 'SYNTHETIC_PRIVATE_CONTACT_BODY', recipient: 'mailbox@example.invalid',
}
const privateError = `${content.email} ${content.message}`

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production')
  vi.stubEnv('CONTACT_FORM_ENABLED', 'true')
  vi.stubEnv('CONTACT_OUTBOX_ENABLED', 'true')
  vi.stubEnv('CONTACT_MESSAGE_ENCRYPTION_KEY', randomBytes(32).toString('hex'))
  vi.stubEnv('CONTACT_EMAIL_TO', content.recipient)
  vi.stubEnv('RESEND_API_KEY', 'synthetic-not-a-provider-key')
  vi.stubEnv('AUTH_EMAIL_FROM', 'WorkMatchr <contact@example.invalid>')
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); mocks.transaction.mockReset(); mocks.send.mockReset() })

function observeLogs() {
  const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map(level => vi.spyOn(console, level).mockImplementation(() => {}))
  const streams = [vi.spyOn(process.stdout, 'write').mockImplementation(() => true), vi.spyOn(process.stderr, 'write').mockImplementation(() => true)]
  return () => { for (const spy of [...spies, ...streams]) expect(spy).not.toHaveBeenCalled() }
}

describe('contact failures do not expose message content', () => {
  it('returns a generic response without logging a database error containing contact data', async () => {
    mocks.transaction.mockRejectedValue(new Error(privateError))
    const assertNoLogs = observeLogs()
    const { name, email, subject, message } = content
    const result = await submitContact({ name, email, subject, message, requestId: randomUUID() }, '192.0.2.1')
    expect(mocks.transaction).toHaveBeenCalledTimes(1)
    expect(result.status).toBe(503)
    expect(JSON.stringify(result)).not.toContain(content.email)
    expect(JSON.stringify(result)).not.toContain(content.message)
    expect(mocks.send).not.toHaveBeenCalled()
    assertNoLogs()
  })

  it.each(['rejection', 'exception'] as const)('sanitizes a provider %s and never logs its raw response', async mode => {
    if (mode === 'rejection') mocks.send.mockResolvedValue({ data: null, error: { statusCode: 422, message: privateError } })
    else mocks.send.mockRejectedValue(new Error(privateError))
    const assertNoLogs = observeLogs()
    const result = await sendAuthEmail(renderContactEmail(content, 'synthetic-contact-event')).catch(error => error)
    expect(result).toBeInstanceOf(AuthEmailDeliveryError)
    expect(result.code).toBe(mode === 'rejection' ? 'EMAIL_PROVIDER_REJECTED' : 'EMAIL_PROVIDER_UNAVAILABLE')
    expect(`${String(result)} ${JSON.stringify(result)}`).not.toContain(content.email)
    expect(`${String(result)} ${JSON.stringify(result)}`).not.toContain(content.message)
    expect(mocks.send).toHaveBeenCalledTimes(1)
    assertNoLogs()
  })
})
