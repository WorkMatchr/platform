import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { AssignmentDetail } from './assignment-detail'
import type { AssignmentDetailView } from '@/lib/assignments/assignment-query-service'

vi.mock('./assignment-status-actions', () => ({ AssignmentStatusActions: () => null }))
vi.mock('./assignment-publication-actions', () => ({ AssignmentWithdrawForm: () => null }))

const assignment: AssignmentDetailView = {
  id: 'canonical-request', canonicalRequestId: 'canonical-request', title: 'Testopdracht',
  description: 'Synthetische opdracht', status: 'OPEN', canManage: true, canDelete: false,
  createdAt: '2026-10-25T08:00:00Z', updatedAt: '2026-10-25T08:00:00Z',
  organizationName: 'Testorganisatie', version: 1, intakeId: null, originalHelpRequest: null,
  sectorName: null, employeeCount: null, desiredStartDate: null, location: 'Testregio',
  locationDescription: null, locationItems: [], allowsRemoteWork: false, maxSelections: 3,
  publishedAt: '2026-10-25T08:00:00Z', publishedByName: 'Synthetische gebruiker',
  publishedVersion: 1, revisionCount: 1, statusHistory: [], primaryExpertise: 'Bedrijfsarts',
}
const action = vi.fn()
const view = (patch: Partial<AssignmentDetailView> = {}) => renderToStaticMarkup(
  <AssignmentDetail assignment={{ ...assignment, ...patch }} actions={{ reopen: action, cancel: action, withdraw: action }} />,
)

describe('vervolgnavigatie na opdrachtpublicatie', () => {
  it('biedt bestaande selectie en offertes via de canonieke Request-identiteit zonder actie uit te voeren', () => {
    const html = view()
    expect(html).toContain('href="/opdrachten/canonical-request/selectie"')
    expect(html).toContain('href="/opdrachten/canonical-request/offertes"')
    expect(html).toContain('Publicatie alleen start geen selectie.')
    expect(html).not.toContain('toekomstige marktverwerking')
    expect(action).not.toHaveBeenCalled()
  })
  it('behoudt de blokkade wanneer een primaire deskundigheid ontbreekt', () => {
    expect(view({ primaryExpertise: null })).toContain('nadat u expliciet een primaire deskundigheid heeft gekozen')
  })
  it.each(['MATCHING', 'AWAITING_RESPONSES', 'IN_SELECTION', 'AWARDED', 'CLOSED'] as const)(
    'toont een lopende of afgeronde %s-publicatie niet als ingetrokken', (status) => {
      const html = view({ status })
      expect(html).toContain('Bekijk offertes')
      expect(html).not.toContain('Publicatie ingetrokken')
      expect(html).not.toContain('Deze opdracht is nog niet gepubliceerd')
    },
  )
  it.each([
    { canManage: false },
    { publishedAt: null, publishedVersion: null, status: 'DRAFT' as const },
    { status: 'CANCELLED' as const },
    { status: 'ARCHIVED' as const },
  ])('biedt geen beheervervolgactie buiten de bestaande beheer-/publicatiestatusgrens: %o', (patch) => {
    expect(view(patch)).not.toContain('Bekijk selectie')
    expect(view(patch)).not.toContain('Bekijk offertes')
  })
})
