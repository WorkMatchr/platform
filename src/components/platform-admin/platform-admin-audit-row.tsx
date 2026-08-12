import Link from 'next/link'

export function PlatformAdminAuditRow({
  event,
}: {
  event: {
    id: string
    action: string
    reason: string | null
    adminCommunicationId: string | null
    createdAt: Date
    actorUser: { displayName: string | null; email: string }
  }
}) {
  const hasArchivedCommunication = event.action === 'ADMIN_EMAIL_SENT' && Boolean(event.adminCommunicationId)
  return (
    <tr>
      <td className="px-4 py-3 font-semibold">
        {hasArchivedCommunication ? <Link className="text-brand-primary underline" href={`/platformbeheer/communicatie/${event.adminCommunicationId}`}>{event.action}</Link> : event.action}
      </td>
      <td className="px-4 py-3">{event.actorUser.displayName ?? event.actorUser.email}</td>
      <td className="max-w-xl whitespace-pre-wrap px-4 py-3">
        {event.reason ?? '—'}
        {event.action === 'ADMIN_EMAIL_SENT' && !event.adminCommunicationId ? <p className="mt-1 text-xs text-text-secondary">Berichtinhoud is voor deze historische verzending niet opgeslagen.</p> : null}
      </td>
      <td className="px-4 py-3">{event.createdAt.toLocaleString('nl-NL')}</td>
    </tr>
  )
}
