import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePlatformAdministrator: vi.fn(),
  listOneoffPaymentMethods: vi.fn(),
  listFirstPaymentMethods: vi.fn(),
  getMollieApiMode: vi.fn(),
}))

vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({
  requirePlatformAdministrator: mocks.requirePlatformAdministrator,
}))
vi.mock('@/lib/finance/mollie-gateway', () => ({
  createMollieGateway: () => ({
    listOneoffPaymentMethods: mocks.listOneoffPaymentMethods,
    listFirstPaymentMethods: mocks.listFirstPaymentMethods,
  }),
  getMollieApiMode: mocks.getMollieApiMode,
}))

import { GET } from './route'

describe('Mollie-methodenpreflight', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('MOLLIE_REDIRECT_BASE_URL', 'https://www.workmatchr.nl')
    vi.stubEnv('MOLLIE_WEBHOOK_BASE_URL', 'https://www.workmatchr.nl')
    mocks.getMollieApiMode.mockReturnValue('live')
    mocks.listOneoffPaymentMethods.mockResolvedValue([{ id: 'ideal', name: 'iDEAL' }])
    mocks.listFirstPaymentMethods.mockResolvedValue(['ideal', 'creditcard'])
  })

  afterEach(() => vi.unstubAllEnvs())

  it('autoriseert platformbeheer voordat Mollie read-only wordt bevraagd', async () => {
    const response = await GET()

    expect(mocks.requirePlatformAdministrator).toHaveBeenCalledWith('/platformbeheer/financien')
    expect(mocks.listOneoffPaymentMethods).toHaveBeenCalledWith('30.25')
    expect(mocks.listFirstPaymentMethods).toHaveBeenCalledWith('59.29')
    expect(await response.json()).toEqual({
      ok: true,
      mode: 'live',
      redirectBaseUrlMatchesProduction: true,
      webhookBaseUrlMatchesProduction: true,
      amount: { value: '30.25', currency: 'EUR' },
      sequenceType: 'oneoff',
      methods: [{ id: 'ideal', name: 'iDEAL' }],
      proFirstPayment: {
        mode: 'live',
        amount: '59.29',
        currency: 'EUR',
        sequenceType: 'first',
        methods: ['ideal', 'creditcard'],
        hasSuitableMethod: true,
      },
    })
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it.each([
    undefined,
    '',
    'https://www.workmatchr.nl/',
    'https://workmatchr.nl',
    'http://www.workmatchr.nl',
    ' https://www.workmatchr.nl',
    'https://www.workmatchr.nl?secret=not-for-output',
    'https://preview.example.invalid',
    'not-a-url',
  ])('geeft alleen false bij een niet exact gelijke URL (%s)', async (value) => {
    vi.stubEnv('MOLLIE_REDIRECT_BASE_URL', value)
    const redirectBody = await (await GET()).json()
    expect(redirectBody.redirectBaseUrlMatchesProduction).toBe(false)
    expect(redirectBody.webhookBaseUrlMatchesProduction).toBe(true)
    vi.stubEnv('MOLLIE_REDIRECT_BASE_URL', 'https://www.workmatchr.nl')
    vi.stubEnv('MOLLIE_WEBHOOK_BASE_URL', value)
    const webhookBody = await (await GET()).json()
    expect(webhookBody.redirectBaseUrlMatchesProduction).toBe(true)
    expect(webhookBody.webhookBaseUrlMatchesProduction).toBe(false)
    expect(JSON.stringify([redirectBody, webhookBody])).not.toContain('https://')
    expect(JSON.stringify([redirectBody, webhookBody])).not.toContain('not-for-output')
  })

  it('stopt vóór configuratiecontrole en Mollie bij geweigerde autorisatie', async () => {
    mocks.requirePlatformAdministrator.mockRejectedValue(new Error('FORBIDDEN'))
    await expect(GET()).rejects.toThrow('FORBIDDEN')
    expect(mocks.getMollieApiMode).not.toHaveBeenCalled()
    expect(mocks.listOneoffPaymentMethods).not.toHaveBeenCalled()
    expect(mocks.listFirstPaymentMethods).not.toHaveBeenCalled()
  })

  it('faalt gesloten bij een onbekende keymodus zonder Mollie-call', async () => {
    mocks.getMollieApiMode.mockReturnValue('unknown')

    const response = await GET()

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ redirectBaseUrlMatchesProduction: true, webhookBaseUrlMatchesProduction: true })
    expect(mocks.listOneoffPaymentMethods).not.toHaveBeenCalled()
    expect(mocks.listFirstPaymentMethods).not.toHaveBeenCalled()
  })

  it('rapporteert fail-closed wanneer geen geschikte Pro-first methode beschikbaar is', async () => {
    mocks.listFirstPaymentMethods.mockResolvedValue([])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.proFirstPayment).toEqual({
      mode: 'live',
      amount: '59.29',
      currency: 'EUR',
      sequenceType: 'first',
      methods: [],
      hasSuitableMethod: false,
    })
  })

  it('retourneert alleen gesaniteerde providerdetails bij een preflightfout', async () => {
    mocks.listOneoffPaymentMethods.mockRejectedValue(Object.assign(
      new Error('No suitable payment methods found.'),
      { statusCode: 422, field: 'method', title: 'Unprocessable Entity' },
    ))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(502)
    expect(body).toMatchObject({ redirectBaseUrlMatchesProduction: true, webhookBaseUrlMatchesProduction: true })
    expect(body.error).toEqual(expect.objectContaining({
      httpStatus: 422,
      mollieErrorField: 'method',
      mollieErrorDetail: 'No suitable payment methods found.',
    }))
    expect(JSON.stringify(body)).not.toContain('apiKey')
  })
})
