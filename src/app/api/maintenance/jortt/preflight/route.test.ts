import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePlatformAdministrator: vi.fn(),
  preflightOrganizationRead: vi.fn(),
}))

vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ requirePlatformAdministrator: mocks.requirePlatformAdministrator }))
vi.mock('@/lib/finance/jortt-api-gateway', () => ({
  JorttApiGateway: class {
    preflightOrganizationRead = mocks.preflightOrganizationRead
  },
}))

import { POST } from './route'

const makeRequest = (authorization?: string) => new Request('https://www.workmatchr.nl/api/maintenance/jortt/preflight', {
  method: 'POST',
  ...(authorization ? { headers: { authorization } } : {}),
})

describe('POST /api/maintenance/jortt/preflight', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('VERCEL_ENV', 'production')
    vi.stubEnv('FINANCIAL_MAINTENANCE_SECRET', 'maintenance-secret-value-that-is-long-enough')
    mocks.preflightOrganizationRead.mockResolvedValue({ ok: true, auth: 'PASS', organizationRead: 'PASS', providerCode: null, httpStatus: 200 })
  })

  afterEach(() => vi.unstubAllEnvs())

  it('is verborgen buiten Production', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    const response = await POST(makeRequest('Bearer maintenance-secret-value-that-is-long-enough'))
    expect(response.status).toBe(404)
    expect(mocks.requirePlatformAdministrator).not.toHaveBeenCalled()
    expect(mocks.preflightOrganizationRead).not.toHaveBeenCalled()
  })

  it('vereist zowel een platformbeheerderssessie als maintenance-secret', async () => {
    const response = await POST(makeRequest())
    expect(response.status).toBe(401)
    expect(mocks.requirePlatformAdministrator).toHaveBeenCalledWith('/platformbeheer/financien')
    expect(mocks.preflightOrganizationRead).not.toHaveBeenCalled()
  })

  it('faalt gesloten als de maintenance-secret ontbreekt', async () => {
    vi.stubEnv('FINANCIAL_MAINTENANCE_SECRET', '')
    const response = await POST(makeRequest())
    expect(response.status).toBe(503)
    expect(mocks.preflightOrganizationRead).not.toHaveBeenCalled()
  })

  it('roept uitsluitend de read-only gatewaypreflight aan en retourneert geen geheimen', async () => {
    const secret = 'maintenance-secret-value-that-is-long-enough'
    const response = await POST(makeRequest(`Bearer ${secret}`))
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(mocks.preflightOrganizationRead).toHaveBeenCalledOnce()
    expect(body).toEqual({ ok: true, auth: 'PASS', organizationRead: 'PASS', providerCode: null, httpStatus: 200 })
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(JSON.stringify(body)).not.toContain(secret)
  })

  it('vertaalt alleen veilige failure-informatie naar de response', async () => {
    mocks.preflightOrganizationRead.mockResolvedValue({ ok: false, auth: 'PASS', organizationRead: 'FAIL', providerCode: 'organization.requires_mkb_plan', httpStatus: 401 })
    const response = await POST(makeRequest('Bearer maintenance-secret-value-that-is-long-enough'))
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ ok: false, auth: 'PASS', organizationRead: 'FAIL', providerCode: 'organization.requires_mkb_plan', httpStatus: 401 })
  })
})
