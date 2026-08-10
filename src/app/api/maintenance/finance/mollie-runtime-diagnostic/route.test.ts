import { afterEach, describe, expect, it, vi } from 'vitest'

const runMollieRuntimeDiagnostic = vi.fn()
vi.mock('@/lib/finance/mollie-gateway', () => ({ runMollieRuntimeDiagnostic }))

describe('GET /api/maintenance/finance/mollie-runtime-diagnostic', () => {
  afterEach(() => {
    delete process.env.FINANCIAL_MAINTENANCE_SECRET
    delete process.env.MOLLIE_API_KEY
    vi.clearAllMocks()
  })

  it('weigert verzoeken zonder de financiële onderhoudssecret', async () => {
    const { GET } = await import('./route')
    const response = await GET(new Request('https://app.example.invalid/api/maintenance/finance/mollie-runtime-diagnostic'))
    expect(response.status).toBe(503)
    expect(runMollieRuntimeDiagnostic).not.toHaveBeenCalled()
  })

  it('weigert een onjuiste onderhoudssecret', async () => {
    process.env.FINANCIAL_MAINTENANCE_SECRET = 'development-maintenance-secret-1234567890'
    const { GET } = await import('./route')
    const response = await GET(new Request('https://app.example.invalid/api/maintenance/finance/mollie-runtime-diagnostic', {
      headers: { authorization: 'Bearer fout' },
    }))
    expect(response.status).toBe(401)
    expect(runMollieRuntimeDiagnostic).not.toHaveBeenCalled()
  })

  it('geeft uitsluitend de veilige diagnostiek terug', async () => {
    process.env.FINANCIAL_MAINTENANCE_SECRET = 'development-maintenance-secret-1234567890'
    process.env.MOLLIE_API_KEY = 'test_zeer_geheime_mollie_api_key'
    runMollieRuntimeDiagnostic.mockResolvedValue({
      apiKey: {
        present: true,
        startsWithTest: true,
        startsWithLive: false,
        startsWithAccess: false,
        lengthBeforeTrim: 33,
        lengthAfterTrim: 33,
        hasLeadingOrTrailingWhitespace: false,
        hasLineBreak: false,
        hasBoundaryQuote: false,
      },
      payments: { authenticationSucceeded: true, httpStatus: 200, mollieErrorType: null, mollieErrorTitle: null },
      methods: { requested: true, methodIds: ['ideal'], httpStatus: 200, mollieErrorType: null, mollieErrorTitle: null },
    })
    const { GET } = await import('./route')
    const response = await GET(new Request('https://app.example.invalid/api/maintenance/finance/mollie-runtime-diagnostic', {
      headers: { authorization: `Bearer ${process.env.FINANCIAL_MAINTENANCE_SECRET}` },
    }))
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).not.toContain(process.env.MOLLIE_API_KEY)
    expect(body).not.toContain(process.env.FINANCIAL_MAINTENANCE_SECRET)
    expect(JSON.parse(body)).toMatchObject({
      apiKey: { startsWithTest: true, lengthAfterTrim: 33 },
      payments: { authenticationSucceeded: true, httpStatus: 200 },
      methods: { methodIds: ['ideal'] },
    })
  })
})
