import { PDFDocument } from 'pdf-lib'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getOrganization: vi.fn() }))
vi.mock('@/lib/organizations/organization-authorization', () => ({ getOptionalActiveOrganizationContext: mocks.getOrganization }))
import { POST } from './route'

describe('BHV basis-PDF endpoint', () => {
  beforeEach(() => mocks.getOrganization.mockResolvedValue(null))
  it('downloadt anoniem een niet-cachebare basis-PDF', async () => {
    const response = await POST(new Request('https://workmatchr.nl/wijzers/bhv/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: 'BASIC', answers: { hasEmployees: 'YES' } }) }))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-disposition')).toMatch(/^attachment; filename="workmatchr-bhv-rapport-\d{4}-\d{2}-\d{2}\.pdf"$/)
    expect(response.headers.get('cache-control')).toBe('private, no-store')
    const pdf = await PDFDocument.load(await response.arrayBuffer())
    expect(pdf.getTitle()).toBe('WorkMatchr BHV-wijzer rapport')
  })
  it('weigert betaalniveau en verkeerde mediatypen', async () => {
    const extended = await POST(new Request('https://workmatchr.nl/wijzers/bhv/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: 'EXTENDED' }) }))
    const wrong = await POST(new Request('https://workmatchr.nl/wijzers/bhv/pdf', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: '{}' }))
    expect([extended.status, wrong.status]).toEqual([403, 415])
  })
})
