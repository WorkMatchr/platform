import { beforeEach, expect, it, vi } from 'vitest'

const processPayment = vi.hoisted(() => vi.fn())
vi.mock('@/lib/finance/financial-purchase-service', () => ({ processMolliePayment: processPayment }))
import { POST } from './route'

beforeEach(() => { vi.resetAllMocks(); processPayment.mockResolvedValue(undefined) })
const request = (body: string, contentType = 'application/json') => new Request('http://localhost/api/payments/mollie/webhook', {
  method: 'POST', headers: { 'Content-Type': contentType }, body,
})

it.each(['{}', '{', '{"id":42}', '{"id":"not-a-payment"}', '{"id":"tr_bad%20id"}'])('weigert ongeldige webhook zonder financiële verwerking: %s', async body => {
  expect((await POST(request(body))).status).toBe(400)
  expect(processPayment).not.toHaveBeenCalled()
})

it.each([
  ['application/json', JSON.stringify({ id: 'tr_synthetic', status: 'paid', amount: '0.01', organizationId: 'other' })],
  ['application/x-www-form-urlencoded', 'id=tr_synthetic&status=paid&amount=0.01&organizationId=other'],
])('vertrouwt alleen het betaal-ID uit %s en laat de service de providerstatus ophalen', async (type, body) => {
  expect((await POST(request(body, type))).status).toBe(200)
  expect(processPayment).toHaveBeenCalledExactlyOnceWith('tr_synthetic')
})

it('geeft bij provider-/databasefout geen valse bevestiging of interne informatie en laat dezelfde webhook opnieuw verwerken', async () => {
  processPayment.mockRejectedValueOnce(new Error('synthetic-private-provider-detail'))
  const body = JSON.stringify({ id: 'tr_synthetic' })
  const failed = await POST(request(body))
  expect(failed.status).toBe(500)
  expect(await failed.text()).toBe('Payment processing failed')
  expect((await POST(request(body))).status).toBe(200)
  expect(processPayment.mock.calls).toEqual([['tr_synthetic'], ['tr_synthetic']])
})
