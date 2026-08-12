import { notFound } from 'next/navigation'
import { AdminPageHeader, AdminSection, AdminTable, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformAdminCommunicationDetail } from '@/lib/platform-admin/platform-admin-query-service'

function presentDeliveryStatus(status: 'PROVIDER_ACCEPTED' | 'FAILED' | 'DEVELOPMENT_ONLY') {
  if (status === 'PROVIDER_ACCEPTED') return { label: 'Door e-mailprovider geaccepteerd', tone: 'good' as const }
  if (status === 'DEVELOPMENT_ONLY') return { label: 'Alleen lokaal vastgelegd', tone: 'warning' as const }
  return { label: 'Verzending niet geaccepteerd', tone: 'bad' as const }
}

export default async function PlatformAdminCommunicationDetailPage({
  params,
}: {
  params: Promise<{ communicationId: string }>
}) {
  const { communicationId } = await params
  const administrator = await requirePlatformAdministrator(`/platformbeheer/communicatie/${communicationId}`)
  const communication = await getPlatformAdminCommunicationDetail(administrator.id, communicationId)
  if (!communication) notFound()

  return (
    <>
      <AdminPageHeader title="Beheercommunicatie" description="De inhoud van dit bericht is na verzending voor auditdoeleinden vastgelegd." />
      <AdminSection title="Bericht">
        <dl className="grid gap-4 rounded-card border border-border bg-surface p-5 sm:grid-cols-2">
          <div><dt className="text-xs text-text-secondary">Onderwerp</dt><dd className="font-semibold text-brand-dark">{communication.subject}</dd></div>
          <div><dt className="text-xs text-text-secondary">Doel</dt><dd className="font-semibold text-brand-dark">{communication.targetContext}</dd></div>
          <div><dt className="text-xs text-text-secondary">Verzonden door</dt><dd>{communication.authorUser.displayName ?? communication.authorUser.email}</dd></div>
          <div><dt className="text-xs text-text-secondary">Aangemaakt</dt><dd>{communication.createdAt.toLocaleString('nl-NL')}</dd></div>
        </dl>
        <div className="mt-4 rounded-card border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold text-brand-dark">Berichtinhoud</h2>
          <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-text-primary">{communication.textSnapshot}</pre>
        </div>
      </AdminSection>
      <AdminSection title="Verzendhistorie" description="Een provideracceptatie bevestigt nog geen aflevering in de mailbox.">
        <AdminTable headers={['Poging', 'Status', 'Transport', 'Opmerking', 'Moment']}>
          {communication.deliveryAttempts.map((attempt) => {
            const status = presentDeliveryStatus(attempt.providerStatus)
            return <tr key={attempt.id}>
              <td className="px-4 py-3">{attempt.attemptNumber}</td>
              <td className="px-4 py-3"><StatusPill tone={status.tone}>{status.label}</StatusPill></td>
              <td className="px-4 py-3">{attempt.transport}</td>
              <td className="px-4 py-3">{attempt.failureCode ?? '—'}</td>
              <td className="px-4 py-3">{attempt.occurredAt.toLocaleString('nl-NL')}</td>
            </tr>
          })}
        </AdminTable>
      </AdminSection>
    </>
  )
}
