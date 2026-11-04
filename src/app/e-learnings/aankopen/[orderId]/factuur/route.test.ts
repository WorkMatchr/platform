import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), guard: vi.fn(), owned: vi.fn(), invoice: vi.fn(), pdf: vi.fn() }))
vi.mock('@/lib/learning/learning-authorization', () => ({ requireLearningUser: mocks.auth }))
vi.mock('@/lib/learning/academy-commerce-environment', () => ({ assertAcademyCommerceSandbox: mocks.guard }))
vi.mock('@/lib/learning/academy-commerce-access', () => ({ ownedAcademyOrder: mocks.owned }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ financialInvoice: { findUnique: mocks.invoice } }) }))
vi.mock('@/lib/finance/financial-invoice-pdf', () => ({ buildFinancialInvoicePdf: mocks.pdf }))
import { GET } from './route'
const id = '10000000-0000-4000-8000-000000000001'
const request = () => GET(new Request(`http://127.0.0.1:3002/e-learnings/aankopen/${id}/factuur`), { params: Promise.resolve({ orderId: id }) })
beforeEach(() => {
  vi.resetAllMocks()
  mocks.auth.mockResolvedValue({ id: 'buyer' }); mocks.owned.mockResolvedValue({ purchaseId: 'purchase' })
  mocks.invoice.mockResolvedValue({ invoiceNumber: 'WM-TEST\r\n', id: 'invoice' }); mocks.pdf.mockResolvedValue(Buffer.from('%PDF-fixture'))
})
describe('Academy privé-testfactuurdownload', () => {
  it('vereist normale authenticatie vóór PDF-generatie', async () => {
    mocks.auth.mockRejectedValue(new Error('LOGIN_REQUIRED'))
    await expect(request()).rejects.toThrow('LOGIN_REQUIRED'); expect(mocks.pdf).not.toHaveBeenCalled()
  })
  it('weigert een andere koper zonder factuurgegevens terug te geven', async () => {
    mocks.owned.mockRejectedValue(new Error('ORDER_NOT_FOUND'))
    expect((await request()).status).toBe(404); expect(mocks.invoice).not.toHaveBeenCalled()
  })
  it('weigert buiten de gecontroleerde sandbox vóór de financiële lookup', async () => {
    mocks.guard.mockImplementation(() => { throw new Error('SANDBOX_REQUIRED') })
    expect((await request()).status).toBe(404); expect(mocks.owned).not.toHaveBeenCalled()
  })
  it('levert uitsluitend de eigen PDF met private cache en veilige bestandsnaam', async () => {
    const response = await request()
    expect(response.status).toBe(200); expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="Academy-testfactuur-WM-TEST.pdf"')
    expect(mocks.owned).toHaveBeenCalledWith(expect.anything(), 'buyer', id)
  })
  it('weigert een ongeldige orderreferentie zonder databasequery', async () => {
    const response = await GET(new Request('http://127.0.0.1:3002'), { params: Promise.resolve({ orderId: 'invalid' }) })
    expect(response.status).toBe(404); expect(mocks.owned).not.toHaveBeenCalled()
  })
})
