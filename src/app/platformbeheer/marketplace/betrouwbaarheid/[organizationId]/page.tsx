import { notFound } from 'next/navigation'
import { decideMarketplaceContactRequestAction } from '@/app/platformbeheer/actions'
import { AdminPageHeader, AdminSection, AdminTable, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getMarketplaceReliabilityDetail, withdrawalReasonLabels } from '@/lib/marketplace/marketplace-reliability-service'

const contactStatusLabels = {
  OPEN: 'Open',
  ADDITIONAL_INFORMATION_REQUIRED: 'Aanvullende informatie gevraagd',
  APPROVED: 'Goedgekeurd',
  REJECTED: 'Afgewezen',
  CLOSED: 'Afgesloten',
} as const

export default async function MarketplaceReliabilityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>
  searchParams: Promise<{ resultaat?: string; fout?: string }>
}) {
  const { organizationId } = await params
  const feedback = await searchParams
  const administrator = await requirePlatformAdministrator(`/platformbeheer/marketplace/betrouwbaarheid/${organizationId}`)
  const organization = await getMarketplaceReliabilityDetail(administrator.id, organizationId)
  if (!organization) notFound()
  const canManage = ['OWNER', 'ADMIN'].includes(administrator.platformMembership.role)
  return (
    <>
      <AdminPageHeader eyebrow="Betrouwbaarheid" title={organization.name} description={`KvK-nummer: ${organization.chamberOfCommerceNumber ?? 'niet vastgelegd'}`} />
      {feedback.resultaat ? <p role="status" className="rounded-control border border-success-border bg-success-subtle p-4">Het beheerbesluit is vastgelegd.</p> : null}
      {feedback.fout ? <p role="alert" className="rounded-control border border-error-border bg-error-subtle p-4">Het beheerbesluit kon niet veilig worden vastgelegd.</p> : null}
      <AdminSection title="Intrekkingen">
        <AdminTable headers={['Opdracht', 'Gebeurtenis', 'Reden', 'Deelnemers', 'Terugbetaald', 'Moment']}>
          {organization.marketplaceReliabilityEvents.map((event) => (
            <tr key={event.id}>
              <td className="px-4 py-3">{event.request.requestNumber}<br /><span className="text-xs text-text-secondary">{event.request.title}</span></td>
              <td className="px-4 py-3">{event.type === 'WITHDRAWN_AFTER_PARTICIPATION' ? 'Ingetrokken na deelname' : event.type === 'WITHDRAWN_WITHOUT_PARTICIPANTS' ? 'Ingetrokken zonder deelname' : 'Correctie'}</td>
              <td className="px-4 py-3">{event.withdrawalReason ? withdrawalReasonLabels[event.withdrawalReason] : event.correctionReason ?? 'Niet vastgelegd'}</td>
              <td className="px-4 py-3">{event.participantCount}</td>
              <td className="px-4 py-3">{event.totalRefundedCredits} credits</td>
              <td className="px-4 py-3">{event.occurredAt.toLocaleString('nl-NL')}</td>
            </tr>
          ))}
        </AdminTable>
      </AdminSection>
      <AdminSection title="Contactverzoeken">
        <div className="grid gap-4">
          {organization.marketplaceContactRequests.map((request) => (
            <article key={request.id} className="rounded-card border border-border bg-surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-3"><StatusPill tone={request.status === 'OPEN' ? 'warning' : request.status === 'APPROVED' ? 'good' : 'neutral'}>{contactStatusLabels[request.status]}</StatusPill><time className="text-sm text-text-secondary">{request.createdAt.toLocaleString('nl-NL')}</time></div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{request.explanation}</p>
              <p className="mt-2 text-xs text-text-secondary">{request.relevantWithdrawalCount} relevante intrekkingen bij indiening.</p>
              {canManage && ['OPEN', 'ADDITIONAL_INFORMATION_REQUIRED'].includes(request.status) ? (
                <form action={decideMarketplaceContactRequestAction} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <input type="hidden" name="contactRequestId" value={request.id} />
                  <label className="grid gap-1 text-sm font-semibold">Besluit<select name="decision" required className="rounded-control border border-border px-3 py-2 font-normal"><option value="APPROVED">Eenmalig toestaan</option><option value="ADDITIONAL_INFORMATION_REQUIRED">Aanvullende informatie vragen</option><option value="REJECTED">Afwijzen</option><option value="CLOSED">Afsluiten</option></select></label>
                  <label className="grid gap-1 text-sm font-semibold">Geldig tot (optioneel)<input type="datetime-local" name="validUntil" className="rounded-control border border-border px-3 py-2 font-normal" /></label>
                  <label className="grid gap-1 text-sm font-semibold sm:col-span-2">Reden<textarea name="reason" required minLength={10} maxLength={1000} rows={3} className="rounded-control border border-border px-3 py-2 font-normal" /></label>
                  <button type="submit" className="min-h-11 rounded-control bg-brand-primary px-5 font-semibold text-white hover:bg-brand-dark">Besluit vastleggen</button>
                </form>
              ) : request.reviewReason ? <p className="mt-3 text-sm"><strong>Beheerbesluit:</strong> {request.reviewReason}</p> : null}
            </article>
          ))}
        </div>
      </AdminSection>
    </>
  )
}
