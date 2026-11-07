import { beforeEach, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
const state = vi.hoisted(() => ({ read: vi.fn() }))
vi.mock('@/lib/organizations/organization-authorization', () => ({ requireOrganizationMembership: async () => ({ user: { id: 'user' }, activeMembership: { organization: { id: 'provider' } } }) }))
vi.mock('@/lib/marketplace/dashboard-query-service', () => ({ getProviderParticipationForQuote: state.read }))
vi.mock('@/app/marktplaats/actions', () => ({ saveQuoteDraftAction: vi.fn() }))
import NewQuotePage from './page'
beforeEach(() => { state.read.mockResolvedValue({ canEdit: true, participation: { assignment: { title: 'Synthetische opdracht', status: 'IN_SELECTION' }, invitation: { deadlineAt: new Date('2099-01-01') }, quote: { version: 2, status: 'DRAFT', currentVersion: { priceCents: BigInt(12345), priceExplanation: 'Bewaar deze prijsuitleg', approach: 'Bewaar deze volledige aanpak', planning: 'Bewaar de planning', terms: 'Bewaar de voorwaarden', validUntil: new Date('2098-12-31T00:00:00Z') } } } }) })
it('restores every saved field when a professional edits a draft', async () => {
  const html = renderToStaticMarkup(await NewQuotePage({ searchParams: Promise.resolve({ deelname: 'participation' }) }))
  for (const value of ['123.45', 'Bewaar deze prijsuitleg', 'Bewaar deze volledige aanpak', 'Bewaar de planning', 'Bewaar de voorwaarden', '2098-12-31']) expect(html).toContain(value)
  expect(html).toContain('name="expectedQuoteVersion" value="2"')
  expect(html).toContain('Bij behoud van deze datum vervalt uw offerte op')
  expect(html).toContain('01:00:00')
})

it('does not offer an edit form when the lifecycle no longer permits changes', async () => {
  state.read.mockResolvedValue({ canEdit: false, participation: { quote: null } })
  const html = renderToStaticMarkup(await NewQuotePage({ searchParams: Promise.resolve({ deelname: 'participation' }) }))
  expect(html).toContain('Offerte niet meer aanpasbaar')
  expect(html).not.toContain('<form')
})
