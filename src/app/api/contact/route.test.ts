import { afterEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({reserve:vi.fn(),send:vi.fn(),config:vi.fn(()=>({resendConfigured:true,fromConfigured:true}))}))
vi.mock('@/lib/email', async importOriginal => ({...await importOriginal<typeof import('@/lib/email')>(),sendAuthEmail:mocks.send,getAuthEmailConfigurationStatus:mocks.config}))
vi.mock('@/lib/contact/contact-rate-limit',()=>({reserveContactAttempt:mocks.reserve}))
import { POST } from './route'
const request=(body='{}',origin='https://workmatchr.example.invalid',type='application/json')=>new Request('https://workmatchr.example.invalid/api/contact',{method:'POST',headers:{origin,'content-type':type},body})
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks()})
describe('contact endpoint',()=>{
 it('staat standaard uit',async()=>{vi.stubEnv('CONTACT_FORM_ENABLED','');expect((await POST(request())).status).toBe(503);expect(mocks.send).not.toHaveBeenCalled()})
 it.each(['','https://evil.example.invalid'])('weigert verkeerde of ontbrekende origin',async origin=>{vi.stubEnv('CONTACT_FORM_ENABLED','true');vi.stubEnv('BETTER_AUTH_URL','https://workmatchr.example.invalid');expect((await POST(request('{}',origin))).status).toBe(403);expect(mocks.reserve).not.toHaveBeenCalled()})
 it('weigert verkeerde contenttype, JSON en te grote input zonder mail',async()=>{vi.stubEnv('CONTACT_FORM_ENABLED','true');vi.stubEnv('BETTER_AUTH_URL','https://workmatchr.example.invalid');expect((await POST(request('{}',undefined,'text/plain'))).status).toBe(415);expect((await POST(request('bad'))).status).toBe(400);expect((await POST(request('x'.repeat(20001)))).status).toBe(413);expect(mocks.send).not.toHaveBeenCalled()})
})


it('verwerkt een geldig bericht uitsluitend naar de vaste mailbox via de transportmock', async () => {
  vi.stubEnv('CONTACT_FORM_ENABLED', 'true')
  vi.stubEnv('BETTER_AUTH_URL', 'https://workmatchr.example.invalid')
  vi.stubEnv('BETTER_AUTH_SECRET', 'synthetic-test-secret-at-least-32-characters')
  vi.stubEnv('VERCEL', '')
  mocks.reserve.mockResolvedValue(true)
  mocks.send.mockResolvedValue({ transport: 'RESEND', status: 'ACCEPTED' })
  const response = await POST(request(JSON.stringify({ name: 'Test', email: 'contact-test@example.invalid', message: 'Een synthetische vraag.', requestId: '9f413d52-4499-4981-a7a0-b81da7777777' })))
  expect(response.status).toBe(200)
  expect(mocks.send).toHaveBeenCalledTimes(1)
  expect(mocks.send.mock.calls[0][0].to).toBe('contact@workmatchr.nl')
  expect(response.headers.get('cache-control')).toBe('no-store')
})
it('weigert op Vercel zonder vertrouwde IP-header voor limiter en transport', async () => {
  vi.stubEnv('CONTACT_FORM_ENABLED', 'true')
  vi.stubEnv('BETTER_AUTH_URL', 'https://workmatchr.example.invalid')
  vi.stubEnv('VERCEL', '1')
  expect((await POST(request('{}'))).status).toBe(503)
  expect(mocks.reserve).not.toHaveBeenCalled()
  expect(mocks.send).not.toHaveBeenCalled()
})
