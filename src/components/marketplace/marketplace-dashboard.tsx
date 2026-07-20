import Link from 'next/link'
import type { MarketplaceDashboardView } from '@/lib/marketplace/dashboard-query-service'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'

export function MarketplaceDashboard({ dashboard }: { dashboard: MarketplaceDashboardView }) {
  if (dashboard.kind === 'PLATFORM') {
    return (
      <div className="grid gap-5 md:grid-cols-3">
        <Card><h2 className="font-semibold">Dossiers voor beoordeling</h2><p className="mt-3 text-3xl font-bold">{dashboard.providerReviews}</p></Card>
        <Card><h2 className="font-semibold">Actieve marktprocessen</h2><p className="mt-3 text-3xl font-bold">{dashboard.activeAssignments}</p></Card>
        <Card><h2 className="font-semibold">Mislukte notificaties</h2><p className="mt-3 text-3xl font-bold">{dashboard.failedOutbox}</p></Card>
        <Card className="md:col-span-3">
          <h2 className="text-lg font-semibold">Beheeracties</h2>
          <div className="mt-4 flex flex-wrap gap-3"><LinkButton href="/beheer/dossiers" variant="outline">Open dossierbeoordeling</LinkButton>{dashboard.canManageMarketplace ? <LinkButton href="/beheer/marktplaats">Open marktplaatsbeheer</LinkButton> : <p className="self-center text-text-secondary">Uw platformrol geeft alleen toegang tot beoordeling en auditinformatie.</p>}</div>
        </Card>
      </div>
    )
  }
  if (dashboard.kind === 'PROVIDER') {
    const profile = dashboard.membership.organization.providerProfile!
    return (
      <div className="space-y-6">
        <div className="grid gap-5 md:grid-cols-3">
          <Card><h2 className="font-semibold">Dossier</h2><p className="mt-2 text-text-secondary">{profile.lifecycleStatus}</p></Card>
          <Card><h2 className="font-semibold">Selecteerbaarheid</h2><p className="mt-2 text-text-secondary">{profile.selectabilityStatus === 'SELECTABLE' ? 'Selecteerbaar' : 'Niet selecteerbaar'}</p></Card>
          <Card><h2 className="font-semibold">Credits</h2><p className="mt-2 text-text-secondary">{dashboard.creditAccount?.availableBalance ?? 0} beschikbaar · {dashboard.creditAccount?.reservedBalance ?? 0} gereserveerd</p><Link className="mt-3 inline-block underline" href="/credits">Bekijk mutaties</Link></Card>
        </div>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Uitnodigingen</h2><LinkButton href="/uitnodigingen" variant="outline">Alle uitnodigingen</LinkButton></div>
          <ul className="mt-4 divide-y divide-border">
            {dashboard.invitations.map((invitation) => <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><span>{invitation.status} · deadline {invitation.deadlineAt.toLocaleDateString('nl-NL')}</span><Link href={`/uitnodigingen/${invitation.id}`} className="font-semibold underline">Bekijken</Link></li>)}
            {dashboard.invitations.length === 0 && <li className="py-4 text-text-secondary">Er zijn nog geen uitnodigingen.</li>}
          </ul>
        </Card>
      </div>
    )
  }
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Uw opdrachten</h2><LinkButton href="/opdrachten">Alle opdrachten</LinkButton></div>
        <ul className="mt-4 divide-y divide-border">
          {dashboard.assignments.map((assignment) => (
            <li key={assignment.id} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div><p className="font-semibold">{assignment.title}</p><p className="text-sm text-text-secondary">{assignment._count.marketplaceInvitations} geselecteerd · {assignment._count.marketplaceQuotes} offertes · {assignment.status}</p></div>
              <Link href={`/opdrachten/${assignment.id}/offertes`} className="font-semibold underline">Openen</Link>
            </li>
          ))}
          {dashboard.assignments.length === 0 && <li className="py-4 text-text-secondary">Er zijn nog geen opdrachten.</li>}
        </ul>
      </Card>
    </div>
  )
}
