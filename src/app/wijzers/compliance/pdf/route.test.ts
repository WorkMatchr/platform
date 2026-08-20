import { PDFDocument } from 'pdf-lib'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getOrganization: vi.fn() }))
vi.mock('@/lib/organizations/organization-authorization', () => ({ getOptionalActiveOrganizationContext: mocks.getOrganization }))

import { POST } from './route'

describe('Compliance basis-PDF endpoint', () => {
  beforeEach(() => mocks.getOrganization.mockResolvedValue(null))

  it('downloadt anoniem een niet-cachebare basis-PDF zonder queryparameters', async () => {
    const response = await POST(new Request('https://workmatchr.nl/wijzers/compliance/pdf', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: 'BASIC', answers: { hasEmployees: 'NO' } }),
    }))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('content-disposition')).toMatch(/^attachment; filename="workmatchr-compliance-rapport-\d{4}-\d{2}-\d{2}\.pdf"$/)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    expect((await PDFDocument.load(await response.arrayBuffer())).getPageCount()).toBeGreaterThan(1)
  })

  it('neemt uitsluitend een beschikbare server-side organisatienaam over', async () => {
    mocks.getOrganization.mockResolvedValue({ activeMembership: { organization: { name: 'Veilige Organisatie' } } })
    const response = await POST(new Request('https://workmatchr.nl/wijzers/compliance/pdf', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers: {}, organizationName: 'Door client verzonnen' }),
    }))
    expect(response.status).toBe(200)
    const pdf = await PDFDocument.load(await response.arrayBuffer())
    expect(pdf.getTitle()).toBe('WorkMatchr Compliance-wijzer rapport')
  })

  it('weigert uitgebreide rapporten, verkeerde mediatypen en te grote bodies', async () => {
    const extended = await POST(new Request('https://workmatchr.nl/wijzers/compliance/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: 'EXTENDED' }) }))
    const wrongType = await POST(new Request('https://workmatchr.nl/wijzers/compliance/pdf', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' }))
    const oversized = await POST(new Request('https://workmatchr.nl/wijzers/compliance/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': '20000' }, body: '{}' }))
    expect([extended.status, wrongType.status, oversized.status]).toEqual([403, 415, 413])
  })
})
