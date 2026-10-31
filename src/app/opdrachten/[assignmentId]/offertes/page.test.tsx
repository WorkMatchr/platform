import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Layout from './layout'
import NotFound from './not-found'
import RootNotFound from '@/app/not-found'
const mocks = vi.hoisted(() => ({ membership: vi.fn(), quotes: vi.fn() }))
vi.mock('@/lib/organizations/organization-authorization', () => ({ requireOrganizationMembership: mocks.membership }))
vi.mock('@/lib/marketplace/dashboard-query-service', () => ({ getClientQuotes: mocks.quotes }))
vi.mock('@/app/marktplaats/actions', () => ({ awardQuoteAction: vi.fn() }))
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404') } }))
import Page from './page'

describe('client quote not-found boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.membership.mockResolvedValue({ user: { id: 'actor' }, activeMembership: { organization: { id: 'own-tenant' } } })
  })
  it('keeps server-side membership and tenant checks before returning a not-found result', async () => {
    mocks.quotes.mockRejectedValue(new Error('ACCESS_DENIED'))
    await expect(Page({ params: Promise.resolve({ assignmentId: 'foreign-request' }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect(mocks.membership).toHaveBeenCalledWith(undefined, '/opdrachten/foreign-request/offertes')
    expect(mocks.quotes).toHaveBeenCalledWith('actor', 'own-tenant', 'foreign-request')
  })
  it('does not request protected quotes if membership authorization fails', async () => {
    mocks.membership.mockRejectedValue(new Error('MEMBERSHIP_REQUIRED'))
    await expect(Page({ params: Promise.resolve({ assignmentId: 'foreign-request' }) })).rejects.toThrow('MEMBERSHIP_REQUIRED')
    expect(mocks.quotes).not.toHaveBeenCalled()
  })
  it('renders authorized quotes without changing their content or introducing a new wrapper', async () => {
    mocks.quotes.mockResolvedValue({ assignment: { id: 'own-request', title: 'Synthetische opdracht', status: 'AWARDED', marketplaceQuotes: [] } })
    const page = await Page({ params: Promise.resolve({ assignmentId: 'own-request' }) })
    expect(renderToStaticMarkup(Layout({ children: page }))).toBe(renderToStaticMarkup(page))
    expect(renderToStaticMarkup(page)).toContain('Offertes vergelijken')
  })
  it('reuses the existing generic not-found UI without exposing quote data', () => {
    expect(NotFound).toBe(RootNotFound)
    const html = renderToStaticMarkup(<NotFound />)
    expect(html).toContain('Deze pagina kunnen we niet vinden')
    expect(html).toContain('href="/opdracht-starten"')
    expect(html).not.toContain('Offertes vergelijken')
  })
})
