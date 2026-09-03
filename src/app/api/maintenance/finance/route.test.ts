import { afterEach, describe, expect, it, vi } from 'vitest'

const runFinancialMaintenance = vi.fn().mockResolvedValue({
  status: 'SUCCEEDED',
  refunds: { inspected: 0 },
  cancellations: { count: 0 },
  suspensions: { count: 0 },
})
vi.mock('@/lib/finance/financial-maintenance-service', () => ({ runFinancialMaintenance }))

describe('POST /api/maintenance/finance', () => {
  afterEach(() => {
    delete process.env.FINANCIAL_MAINTENANCE_SECRET
    delete process.env.CRON_SECRET
    delete process.env.VERCEL_ENV
    vi.clearAllMocks()
  })

  it('weigert de scheduler buiten Production en zonder het cronsecret', async () => {
    process.env.CRON_SECRET = 'development-cron-secret-1234567890123456'
    const { GET } = await import('./route')
    expect((await GET(new Request('https://app.example.invalid/api/maintenance/finance'))).status).toBe(404)
    process.env.VERCEL_ENV = 'production'
    expect((await GET(new Request('https://app.example.invalid/api/maintenance/finance'))).status).toBe(401)
    expect(runFinancialMaintenance).not.toHaveBeenCalled()
  })

  it('start de Production-scheduler uitsluitend met het exacte cronsecret', async () => {
    process.env.VERCEL_ENV = 'production'
    process.env.CRON_SECRET = 'development-cron-secret-1234567890123456'
    const { GET } = await import('./route')
    const response = await GET(new Request('https://app.example.invalid/api/maintenance/finance', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    }))
    expect(response.status).toBe(200)
    expect(runFinancialMaintenance).toHaveBeenCalledWith(expect.any(Date), undefined, 'SCHEDULER')
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
