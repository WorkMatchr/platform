import { afterEach, describe, expect, it, vi } from 'vitest'

const runFinancialMaintenance = vi.fn().mockResolvedValue({
  refunds: { inspected: 0 },
  cancellations: { count: 0 },
  suspensions: { count: 0 },
})
vi.mock('@/lib/finance/financial-maintenance-service', () => ({ runFinancialMaintenance }))

describe('POST /api/maintenance/finance', () => {
  afterEach(() => {
    delete process.env.FINANCIAL_MAINTENANCE_SECRET
    vi.clearAllMocks()
  })

  it('is fail-closed zonder serverconfiguratie', async () => {
    const { POST } = await import('./route')
    const response = await POST(new Request('https://app.example.invalid/api/maintenance/finance', { method: 'POST' }))
    expect(response.status).toBe(503)
    expect(runFinancialMaintenance).not.toHaveBeenCalled()
  })

  it('weigert een onjuist bearer-token', async () => {
    process.env.FINANCIAL_MAINTENANCE_SECRET = 'development-maintenance-secret-1234567890'
    const { POST } = await import('./route')
    const response = await POST(new Request('https://app.example.invalid/api/maintenance/finance', { method: 'POST', headers: { authorization: 'Bearer fout' } }))
    expect(response.status).toBe(401)
    expect(runFinancialMaintenance).not.toHaveBeenCalled()
  })

  it('voert onderhoud uitsluitend met de exacte serversecret uit', async () => {
    process.env.FINANCIAL_MAINTENANCE_SECRET = 'development-maintenance-secret-1234567890'
    const { POST } = await import('./route')
    const response = await POST(new Request('https://app.example.invalid/api/maintenance/finance', { method: 'POST', headers: { authorization: `Bearer ${process.env.FINANCIAL_MAINTENANCE_SECRET}` } }))
    expect(response.status).toBe(200)
    expect(runFinancialMaintenance).toHaveBeenCalledOnce()
  })
})
