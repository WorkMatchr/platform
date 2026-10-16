import { describe, expect, it, vi } from 'vitest'
import { submitContact } from './contact-service'
const payload = { name: 'Test', subject: 'GENERAL', email: 'test@example.invalid', message: '<script>veilig testbericht</script>', website: '', requestId: '10000000-0000-4000-8000-000000000001' }
const secret = 'synthetic-contact-test-secret-at-least-32'
const dependencies = () => ({ reserve: vi.fn().mockResolvedValue(true), send: vi.fn().mockResolvedValue({ accepted: true, transport: 'RESEND', status: 'ACCEPTED', messageId: 'mock' }) })
describe('contactverwerking zonder echte e-mail', () => {
  it.each([{...payload,name:''}, {...payload,email:'bad'}, {...payload,email:'test@example.invalid\r\nBcc: other@example.invalid'}, {...payload,subject:undefined}, {...payload,subject:'Injected\r\nBcc: other@example.invalid'}, {...payload,message:'x'.repeat(4001)}, {...payload,message:''}, {...payload,website:'spam'}, {...payload,requestId:'bad'}])('weigert ongeldige invoer zonder opslag of verzending', async input => {
    const deps=dependencies(); expect((await submitContact(input,'local',secret,deps)).status).toBe(400); expect(deps.reserve).not.toHaveBeenCalled(); expect(deps.send).not.toHaveBeenCalled()
  })
  it('begrenst verzoeken en weigert ontbrekende beveiligingsconfiguratie', async () => {
    const deps=dependencies();expect((await submitContact(payload,'local','',deps)).status).toBe(503);expect(deps.reserve).not.toHaveBeenCalled()
    deps.reserve.mockResolvedValue(false);expect((await submitContact(payload,'local',secret,deps)).status).toBe(429);expect(deps.send).not.toHaveBeenCalled()
  })
  it('verzendt uitsluitend intern, escaped HTML en hergebruikt idempotency bij dezelfde aanvraag', async () => {
    const deps=dependencies();expect((await submitContact(payload,'local',secret,deps)).status).toBe(200)
    const first=deps.send.mock.calls[0][0];expect(first.to).toBe('contact@workmatchr.nl');expect(first.html).toContain('&lt;script&gt;');expect(first.html).not.toContain('<script>');expect(first.subject).not.toContain(payload.name)
    await submitContact(payload,'local',secret,deps);expect(deps.send.mock.calls[1][0].idempotencyKey).toBe(first.idempotencyKey)
    expect(JSON.stringify(deps.reserve.mock.calls)).not.toContain(payload.email);expect(JSON.stringify(deps.reserve.mock.calls)).not.toContain(payload.message)
  })
  it('meldt providerfouten veilig en presenteert een mock/developmentlog niet als aflevering', async () => {
    const deps=dependencies();deps.send.mockRejectedValue(new Error('private provider detail'));const result=await submitContact(payload,'local',secret,deps);expect(result.status).toBe(503);expect(JSON.stringify(result)).not.toContain('private')
    deps.send.mockResolvedValue({transport:'DEVELOPMENT_LOG',status:'DEVELOPMENT_ONLY'});expect((await submitContact(payload,'local',secret,deps)).status).toBe(503)
  })
})


it.each([['GENERAL', 'Algemene vraag'], ['TECHNICAL', 'Technische ondersteuning'], ['PRIVACY', 'Privacy of klacht'], ['OTHER', 'Overig']])('verwerkt uitsluitend het gekozen toegestane onderwerp %s', async (subject, label) => {
  const deps = dependencies()
  expect((await submitContact({ ...payload, subject }, 'local', secret, deps)).status).toBe(200)
  expect(deps.send.mock.calls[0][0].subject).toBe(`${label} | WorkMatchr`)
  expect(deps.send.mock.calls[0][0].subject).not.toMatch(/[\r\n]/)
})
it('gebruikt alleen een geldig server-side geconfigureerd contactadres', async () => {
  const deps = { ...dependencies(), recipient: 'support@example.invalid' }
  expect((await submitContact(payload, 'local', secret, deps)).status).toBe(200)
  expect(deps.send.mock.calls[0][0].to).toBe('support@example.invalid')
})
it.each(['', 'invalid', 'one@example.invalid,two@example.invalid', 'one@example.invalid\r\nBcc: two@example.invalid'])('weigert ongeldige ontvangerconfiguratie vóór limiter/mail', async recipient => {
  const deps = { ...dependencies(), recipient }
  expect((await submitContact(payload, 'local', secret, deps)).status).toBe(503)
  expect(deps.reserve).not.toHaveBeenCalled()
  expect(deps.send).not.toHaveBeenCalled()
})
