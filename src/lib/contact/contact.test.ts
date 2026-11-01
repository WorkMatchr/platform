import { randomBytes, randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { contactSchema } from './contact-contract'
import { contactConfiguration, contactFormEnabled } from './contact-configuration'
import { openContact, renderContactEmail, sealContact } from './contact-envelope'

const content = { name: '<Test>', email: 'synthetic@example.invalid', subject: 'GENERAL' as const, message: 'Synthetisch <script>alert(1)</script>', recipient: 'mailbox@example.invalid' }
afterEach(() => vi.unstubAllEnvs())
describe('contact privacy and validation', () => {
  it('requires both explicit gates, an independent key and configured transport', () => {
    for (const name of ['CONTACT_FORM_ENABLED', 'CONTACT_OUTBOX_ENABLED', 'CONTACT_MESSAGE_ENCRYPTION_KEY', 'RESEND_API_KEY', 'AUTH_EMAIL_FROM']) vi.stubEnv(name, '')
    expect(contactFormEnabled()).toBe(false)
    vi.stubEnv('CONTACT_FORM_ENABLED', 'true'); vi.stubEnv('CONTACT_OUTBOX_ENABLED', 'true')
    vi.stubEnv('CONTACT_MESSAGE_ENCRYPTION_KEY', randomBytes(32).toString('hex'))
    vi.stubEnv('RESEND_API_KEY', 'synthetic-not-a-provider-credential'); vi.stubEnv('AUTH_EMAIL_FROM', 'mail@example.invalid')
    expect(contactFormEnabled()).toBe(true)
    vi.stubEnv('CONTACT_OUTBOX_ENABLED', 'false'); expect(contactFormEnabled()).toBe(false)
    vi.stubEnv('CONTACT_EMAIL_TO', 'a@example.invalid,b@example.invalid'); expect(contactConfiguration()).toBeNull()
  })
  it.each([{ name: '' }, { email: 'bad' }, { email: 'a@example.invalid\r\nBcc: b@example.invalid' }, { message: 'x'.repeat(4001) }, { subject: 'INJECTED' }, { requestId: 'bad' }])('rejects invalid fields %j', override => {
    expect(contactSchema.safeParse({ name: content.name, email: content.email, subject: content.subject, message: content.message, requestId: randomUUID(), ...override }).success).toBe(false)
  })
  it('roundtrips authenticated ciphertext without plaintext and binds it to its event', () => {
    const key = randomBytes(32), id = randomUUID(), sealed = sealContact(content, key, id)
    expect(JSON.stringify(sealed)).not.toContain(content.email)
    expect(JSON.stringify(sealed)).not.toContain(content.message)
    expect(openContact(sealed, key, id)).toEqual(content)
    expect(() => openContact(sealed, randomBytes(32), id)).toThrow()
    expect(() => openContact(sealed, key, randomUUID())).toThrow()
    expect(() => openContact({ ...sealed, ciphertext: 'AAAA' }, key, id)).toThrow()
    expect(() => openContact({ ...sealed, digest: '0'.repeat(64) }, key, id)).toThrow()
  })
  it('uses only the configured recipient and escapes untrusted content', () => {
    const mail = renderContactEmail(content, 'stable-key')
    expect(mail.to).toBe(content.recipient); expect(mail.subject).toBe('Algemene vraag | WorkMatchr')
    expect(mail.html).not.toContain('<script>'); expect(mail.html).toContain('&lt;Test&gt;')
    expect(mail.idempotencyKey).toBe('stable-key')
  })
})
