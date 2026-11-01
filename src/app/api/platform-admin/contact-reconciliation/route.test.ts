import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ context: vi.fn(), reconcile: vi.fn() }))
vi.mock('@/lib/authorization', () => ({ getCurrentAuthenticationContext: mocks.context }))
vi.mock('@/lib/contact/contact-reconciliation', () => ({ reconcileContact: mocks.reconcile }))
import { POST } from './route'
import { ContactReconciliationError } from '@/lib/contact/contact-reconciliation-policy'
const request = (extra: Record<string, string> = {}, body = '{}') => new Request('https://synthetic.example.invalid/api/platform-admin/contact-reconciliation', {
  method: 'POST', headers: { origin: 'https://synthetic.example.invalid', 'content-type': 'application/json', ...extra }, body,
})
beforeEach(() => {
  vi.stubEnv('BETTER_AUTH_URL', 'https://synthetic.example.invalid')
  vi.stubEnv('CONTACT_RECONCILIATION_ENABLED', 'true')
  mocks.context.mockResolvedValue({ actorUser: { id: 'actor' }, effectiveUser: { id: 'actor' }, sessionId: 'session', impersonation: null })
  mocks.reconcile.mockResolvedValue({ outcome: 'ACCEPTED', repeated: false })
})
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks() })
it('is closed by default before accessing authentication or database', async () => {
  vi.stubEnv('CONTACT_RECONCILIATION_ENABLED', '')
  const result = await POST(request()); expect(result.status).toBe(404)
  expect(result.headers.get('cache-control')).toBe('no-store'); expect(mocks.context).not.toHaveBeenCalled()
})
it.each([{ authorization: 'Bearer synthetic' }, { origin: 'https://other.example.invalid' }, { origin: '' }] as Record<string, string>[])('rejects bearer/CSRF before session access', async headers => {
  expect((await POST(request(headers))).status).toBe(403); expect(mocks.context).not.toHaveBeenCalled()
})
it.each([null, { actorUser: { id: 'actor' }, effectiveUser: { id: 'other' }, sessionId: 'session' },
  { actorUser: { id: 'actor' }, effectiveUser: { id: 'actor' }, sessionId: 'session', impersonation: { valid: true } }])('requires an individual authenticated non-impersonated operator', async context => {
  mocks.context.mockResolvedValue(context)
  expect((await POST(request())).status).toBe(403); expect(mocks.reconcile).not.toHaveBeenCalled()
})
it.each(['not-json', ' '.repeat(4097)])('rejects malformed/oversized input', async body => {
  expect((await POST(request({}, body))).status).toBe(400); expect(mocks.reconcile).not.toHaveBeenCalled()
})
it('binds identity exclusively to the existing Better Auth context', async () => {
  expect((await POST(request())).status).toBe(200)
  expect(mocks.reconcile).toHaveBeenCalledExactlyOnceWith({ userId: 'actor', sessionId: 'session' }, {})
})
it.each([['FORBIDDEN', 403], ['INVALID', 400], ['CONFLICT', 409], ['CLOSED', 404]] as const)('returns generic %s without operational details', async (code, status) => {
  mocks.reconcile.mockRejectedValue(new ContactReconciliationError(code))
  const result = await POST(request()); expect(result.status).toBe(status)
  expect(await result.text()).not.toContain(code)
})
it('does not report success when the transaction fails', async () => {
  mocks.reconcile.mockRejectedValue(new Error('private database detail'))
  const result = await POST(request()); expect(result.status).toBe(503)
  expect(await result.text()).not.toContain('private database detail')
})
