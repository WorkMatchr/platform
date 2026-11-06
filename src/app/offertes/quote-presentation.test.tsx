import { beforeEach, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
const state = vi.hoisted(() => ({ client: vi.fn(), provider: vi.fn() }))
vi.mock('@/lib/organizations/organization-authorization', () => ({ requireOrganizationMembership: async () => ({ user: { id: 'user' }, activeMembership: { organization: { id: 'org' } } }) }))
vi.mock('@/lib/marketplace/dashboard-query-service', () => ({ getClientQuotes: state.client, getProviderQuoteDetail: state.provider }))
vi.mock('@/app/marktplaats/actions', () => ({ awardQuoteAction: vi.fn(), submitQuoteAction: vi.fn() }))
import ClientQuotesPage from '../opdrachten/[assignmentId]/offertes/page'
import QuotePage from './[quoteId]/page'
const version = { version: 2, priceCents: BigInt(25000), priceExplanation: 'Vaste synthetische prijs inclusief voorbereiding.', approach: 'Synthetische aanpak met advies.', planning: 'Binnen drie weken.', terms: 'Synthetische voorwaarden zonder echte overeenkomst.', validUntil: new Date('2099-12-01T00:00:00Z') }
const participation = { id: 'participation', status: 'ACTIVE', invitation: { deadlineAt: new Date('2099-12-01') }, assignment: { title: 'Synthetisch', status: 'IN_SELECTION' }, messageChannel: null }
beforeEach(() => {
  state.client.mockResolvedValue({ membership: { role: 'OWNER' }, assignment: { id: 'assignment', title: 'Synthetisch', status: 'IN_SELECTION', awardDecision: null, marketplaceQuotes: [{ id: 'quote', status: 'SUBMITTED', providerOrganization: { name: 'Synthetische aanbieder' }, providerProfileId: 'profile', submittedVersion: version, participation }] } })
  state.provider.mockResolvedValue({ membership: { role: 'OWNER' }, quote: { id: 'quote', version: 2, status: 'DRAFT', currentVersion: version, participation } })
})
it('shows identical saved price explanation and terms to both authorized parties', async () => {
  const htmls = [renderToStaticMarkup(await ClientQuotesPage({ params: Promise.resolve({ assignmentId: 'assignment' }) })), renderToStaticMarkup(await QuotePage({ params: Promise.resolve({ quoteId: 'quote' }) }))]
  for (const html of htmls) for (const value of [version.priceExplanation, version.terms, version.approach, version.planning, 'Geldig tot']) expect(html).toContain(value)
  expect(htmls[0]).toContain('Deze offerte gunnen')
  expect(htmls[1]).toContain('Offerte aanpassen')
})
it('keeps an expired submitted offer readable without an award form', async () => {
  const result = await state.client(); result.assignment.marketplaceQuotes[0].submittedVersion = { ...version, validUntil: new Date('2000-01-01') }
  const html = renderToStaticMarkup(await ClientQuotesPage({ params: Promise.resolve({ assignmentId: 'assignment' }) }))
  expect(html).toContain('(verstreken)'); expect(html).toContain(version.terms); expect(html).not.toContain('Deze offerte gunnen')
})
it.each(['WITHDRAWN', 'EXPIRED', 'SUBMITTED', 'AWARDED'])('does not expose edit or submit controls for %s', async status => {
  const result = await state.provider(); result.quote.status = status
  const html = renderToStaticMarkup(await QuotePage({ params: Promise.resolve({ quoteId: 'quote' }) }))
  expect(html).not.toContain('Offerte aanpassen'); expect(html).not.toContain('Definitief indienen')
})
it.each(['MEMBER', 'CLOSED', 'INACTIVE', 'DEADLINE'])('honors the %s edit boundary', async boundary => {
  const result = await state.provider(); result.quote.participation = { ...participation }
  if (boundary === 'MEMBER') result.membership.role = 'MEMBER'
  if (boundary === 'CLOSED') result.quote.participation.assignment = { ...participation.assignment, status: 'CLOSED' }
  if (boundary === 'INACTIVE') result.quote.participation.status = 'WITHDRAWN'
  if (boundary === 'DEADLINE') result.quote.participation.invitation = { deadlineAt: new Date('2000-01-01') }
  const html = renderToStaticMarkup(await QuotePage({ params: Promise.resolve({ quoteId: 'quote' }) }))
  expect(html).not.toContain('Offerte aanpassen'); expect(html).not.toContain('Definitief indienen')
})
