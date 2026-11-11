import { beforeEach, expect, it, vi } from 'vitest'
import { GET, POST } from './route'
import { requestWithdrawal, withdrawalReceipt } from '@/lib/learning/academy-withdrawal'

vi.mock('@/lib/authorization', () => ({ requireUser: async () => ({ id: 'buyer' }) }))
vi.mock('@/lib/learning/academy-withdrawal', () => ({ requestWithdrawal: vi.fn(), withdrawalReceipt: vi.fn() }))
const id = '0912a270-c6f1-41b0-91e0-a57c425b61d0'
const ctx = { params: Promise.resolve({ purchaseId: id }) }
const url = 'https://example.invalid/account/academy-aankopen/' + id + '/herroeping'
beforeEach(() => vi.resetAllMocks())
it('weigert een verzoek vanaf een andere website vóór registratie', async () => {
  const r = await POST(new Request(url, { method: 'POST', headers: {origin:'https://other.invalid'} }), ctx)
  expect(r.status).toBe(403)
  expect(requestWithdrawal).not.toHaveBeenCalled()
})
it('geeft de verklaring direct als privédownload en biedt dezelfde kopie opnieuw aan', async () => {
  vi.mocked(withdrawalReceipt).mockResolvedValue('Ontvangstbewijs voor synthetische koper')
  const r = await POST(new Request(url, { method: 'POST', headers: { origin: new URL(url).origin } }), ctx)
  expect(requestWithdrawal).toHaveBeenCalledWith('buyer',id)
  expect(r.headers.get('content-disposition')).toContain('attachment;')
  expect(r.headers.get('cache-control')).toBe('private, no-store')
  expect(await r.text()).toBe(await (await GET(new Request(url),ctx)).text())
  expect(requestWithdrawal).toHaveBeenCalledTimes(1)
})
it('onthult geen bewijs dat deze koper niet bezit', async () => {
  vi.mocked(withdrawalReceipt).mockResolvedValue(null)
  expect((await GET(new Request(url),ctx)).status).toBe(404)
})
