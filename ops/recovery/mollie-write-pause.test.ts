import { beforeEach, describe, expect, it, vi } from 'vitest'

const { processPayment } = vi.hoisted(() => ({ processPayment: vi.fn() }))
vi.mock('@/lib/finance/financial-purchase-service', () => ({ processMolliePayment: processPayment }))
import { POST } from '@/app/api/payments/mollie/webhook/route'

describe('existing Mollie webhook during a database write pause', () => {
  beforeEach(() => { processPayment.mockReset() })
  const request = (id = 'tr_synthetic') => new Request('http://127.0.0.1/api/payments/mollie/webhook', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ id }),
  })
  it('does not acknowledge a database refusal and suppresses internal errors', async () => {
    processPayment.mockRejectedValue(new Error('SYNTHETIC_DATABASE_LOGIN_DENIED'))
    const response = await POST(request())
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('SYNTHETIC_DATABASE_LOGIN_DENIED')
  })
  it('acknowledges only after processing, and permits a later provider replay', async () => {
    processPayment.mockRejectedValueOnce(new Error('paused')).mockResolvedValue(undefined)
    expect((await POST(request())).status).toBe(500)
    expect((await POST(request())).status).toBe(200)
    expect(processPayment).toHaveBeenCalledTimes(2)
  })
  it('rejects an invalid provider identifier before touching the service', async () => {
    expect((await POST(request('invalid'))).status).toBe(400)
    expect(processPayment).not.toHaveBeenCalled()
  })
})
