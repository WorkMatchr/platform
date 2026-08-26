import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePlatformAdministrator: vi.fn(),
  listOneoffPaymentMethods: vi.fn(),
  getMollieApiMode: vi.fn(),
}))

vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({
  requirePlatformAdministrator: mocks.requirePlatformAdministrator,
}))
vi.mock('@/lib/finance/mollie-gateway', () => ({
  createMollieGateway: () => ({ listOneoffPaymentMethods: mocks.listOneoffPaymentMethods }),
  getMollieApiMode: mocks.getMollieApiMode,
}))

import { GET } from './route'

describe('Mollie-methodenpreflight', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getMollieApiMode.mockReturnValue('live')
    mocks.listOneoffPaymentMethods.mockResolvedValue([{ id: 'ideal', name: 'iDEAL' }])
  })

  it('autoriseert platformbeheer voordat Mollie read-only wordt bevraagd', async () => {
    const response = await GET()

    expect(mocks.requirePlatformAdministrator).toHaveBeenCalledWith('/platformbeheer/financien')
    expect(mocks.listOneoffPaymentMethods).toHaveBeenCalledWith('30.25')
    expect(await response.json()).toEqual({
      ok: true,
      mode: 'live',
      amount: { value: '30.25', currency: 'EUR' },
      sequenceType: 'oneoff',
      methods: [{ id: 'ideal', name: 'iDEAL' }],
    })
  })

  it('faalt gesloten bij een onbekende keymodus zonder Mollie-call', async () => {
    mocks.getMollieApiMode.mockReturnValue('unknown')

    const response = await GET()

    expect(response.status).toBe(503)
    expect(mocks.listOneoffPaymentMethods).not.toHaveBeenCalled()
  })

  it('retourneert alleen gesaniteerde providerdetails bij een preflightfout', async () => {
    mocks.listOneoffPaymentMethods.mockRejectedValue(Object.assign(
      new Error('No suitable payment methods found.'),
      { statusCode: 422, field: 'method', title: 'Unprocessable Entity' },
    ))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body.error).toEqual(expect.objectContaining({
      httpStatus: 422,
      mollieErrorField: 'method',
      mollieErrorDetail: 'No suitable payment methods found.',
    }))
    expect(JSON.stringify(body)).not.toContain('apiKey')
  })
})
