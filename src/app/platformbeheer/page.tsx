import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminSection, EmptyState, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import {
  getDutchGreeting,
  selectCoreKpis,
  selectVisibleQueues,
  type PlatformAdviceSeverity,
} from '@/lib/platform-admin/platform-admin-advice'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformAdminCockpit } from '@/lib/platform-admin/platform-admin-query-service'

export const metadata: Metadata = { title: 'Platformbeheer | WorkMatchr' }

const severityPresentation: Record<PlatformAdviceSeverity, { label: string; tone: 'bad' | 'warning' | 'neutral' }> = {
  CRITICAL: { label: 'Kritiek', tone: 'bad' },
  HIGH: { label: 'Hoog', tone: 'warning' },
  NORMAL: { label: 'Normaal', tone: 'neutral' },
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(value)
}

export default async function PlatformAdminDashboardPage() {
  const administrator = await requirePlatformAdministrator('/platformbeheer')
  const now = new Date()
  const data = await getPlatformAdminCockpit(administrator.id, now)
  const displayName = administrator.displayName?.trim() || administrator.email
  const firstName = displayName.split(/\s+/)[0]
  const kpis = selectCoreKpis({
    activeOrganizations: data.dashboard.platform.activeOrganizations,
    activeUsers: data.dashboard.platform.activeUsers,
    selectableProviders: data.dashboard.providers.selectable,
    openAssignments: data.dashboard.assignments.open,
  })
  const queueSections = selectVisibleQueues([
    { key: 'reviews', label: 'Reviews', href: '/platformbeheer/reviewer', count: data.queueCounts.reviews, items: data.queues.reviews },
    { key: 'approvals', label: 'Goedkeuringen', href: '/platformbeheer/approver', count: data.queueCounts.approvals, items: data.queues.approvals },
    { key: 'audit', label: 'Auditmeldingen (30 dagen)', href: '/platformbeheer/auditor', count: data.queueCounts.audit, items: data.queues.audit },
    { key: 'expired', label: 'Verlopen uitnodigingen', href: '/platformbeheer/opdrachten', count: data.queueCounts.expiredInvitations, items: data.queues.expiredInvitations },
  ])
  const statusTone = data.platformStatus.level === 'CRITICAL'
    ? 'bad'
    : data.platformStatus.level === 'ATTENTION'
      ? 'warning'
      : 'good'

  return (
    <div className="space-y-6">
      <header className="rounded-card border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Dagelijkse cockpit</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">
              {getDutchGreeting(now)}, {firstName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{data.platformStatus.summary}</p>
          </div>
          <div className="text-right">
            <StatusPill tone={statusTone}>{data.platformStatus.label}</StatusPill>
            <p className="mt-2 text-xs text-text-secondary">
              {data.signals.length} {data.signals.length === 1 ? 'actief signaal' : 'actieve signalen'}
            </p>
          </div>
        </div>
      </header>

      <AdminSection
        title="Actie vereist"
        description="Deterministische signalen, gesorteerd op ernst en daarna op vaste regelcode."
      >
        {data.signals.length === 0 ? (
          <EmptyState>Er zijn vandaag geen signalen die directe actie vereisen.</EmptyState>
        ) : (
          <ol className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface shadow-sm">
            {data.signals.map((signal) => {
              const presentation = severityPresentation[signal.severity]
              return (
                <li className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start" key={signal.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill tone={presentation.tone}>{presentation.label}</StatusPill>
                      <h3 className="font-bold text-brand-dark">{signal.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">{signal.explanation}</p>
                    <p className="mt-2 text-sm text-brand-dark">
                      <span className="font-semibold">Aanbevolen:</span> {signal.recommendedAction}
                    </p>
                    <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                      {signal.sources.map((source) => (
                        <div className="flex gap-1" key={`${signal.id}:${source.label}`}>
                          <dt>{source.label}:</dt>
                          <dd className="font-semibold">{source.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <Link
                    className="inline-flex min-h-10 items-center justify-center rounded-control border border-brand-primary px-4 text-sm font-semibold text-brand-primary hover:bg-brand-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                    href={signal.href}
                  >
                    Actie bekijken
                  </Link>
                </li>
              )
            })}
          </ol>
        )}
      </AdminSection>

      <AdminSection title="Kerncijfers" description="De vier cijfers die de actuele platformomvang en operatie samenvatten.">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {kpis.map((metric) => (
            <Link
              className="rounded-card border border-border bg-surface p-4 shadow-sm transition hover:border-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
              href={metric.href}
              key={metric.key}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{metric.label}</p>
              <p className="mt-1 text-2xl font-bold text-brand-dark">{metric.value}</p>
            </Link>
          ))}
        </div>
      </AdminSection>

      <AdminSection title="Wachtrijen" description="Werkvoorraad die opvolging of controle vraagt.">
        {queueSections.length === 0 ? (
          <EmptyState>Alle operationele wachtrijen zijn leeg.</EmptyState>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {queueSections.map((queue) => (
              <section className="rounded-card border border-border bg-surface p-4 shadow-sm" key={queue.key}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-brand-dark">{queue.label}</h3>
                  <span className="text-sm font-bold text-brand-primary">{queue.count}</span>
                </div>
                <ul className="mt-3 divide-y divide-border">
                  {queue.items.map((item) => (
                    <li className="py-2 text-sm" key={item.id}>
                      <Link className="font-semibold text-brand-dark underline-offset-4 hover:underline" href={item.href}>
                        {item.label}
                      </Link>
                      <p className="mt-1 text-xs text-text-secondary">{formatDate(item.at)}</p>
                    </li>
                  ))}
                </ul>
                <Link className="mt-3 inline-flex text-sm font-semibold text-brand-primary underline-offset-4 hover:underline" href={queue.href}>
                  Volledige wachtrij
                </Link>
              </section>
            ))}
          </div>
        )}
      </AdminSection>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
        <AdminSection
          title="Trends"
          description="Alleen signalen waarvoor voldoende geaggregeerde gegevens beschikbaar zijn."
        >
          {!data.trends.hasSufficientData ? (
            <EmptyState>Er zijn nog onvoldoende gegevens voor betrouwbare trends.</EmptyState>
          ) : (
            <div className="grid gap-3 rounded-card border border-border bg-surface p-4 shadow-sm sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold text-brand-dark">Registraties</h3>
                <p className="mt-1 text-2xl font-bold text-brand-primary">{data.trends.currentRegistrations}</p>
                <p className="text-xs text-text-secondary">
                  Afgelopen 30 dagen
                  {data.trends.registrationChange === null ? '' : ` · ${data.trends.registrationChange >= 0 ? '+' : ''}${data.trends.registrationChange}%`}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-brand-dark">Gemiddelde ouderdom open opdrachten</h3>
                <p className="mt-1 text-2xl font-bold text-brand-primary">
                  {data.trends.averageOpenAgeDays === null ? '—' : `${data.trends.averageOpenAgeDays} dagen`}
                </p>
                <p className="text-xs text-text-secondary">
                  Aanbod-vraagverhouding: {data.trends.providerDemandRatio ?? 'onvoldoende data'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-brand-dark">Open opdrachten per dienst</h3>
                <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                  {data.trends.assignmentsByService.map((item) => <li className="flex justify-between gap-3" key={item.label}><span>{item.label}</span><strong>{item.count}</strong></li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-brand-dark">Open opdrachten per regio</h3>
                <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                  {data.trends.assignmentsByRegion.map((item) => <li className="flex justify-between gap-3" key={item.label}><span>{item.label}</span><strong>{item.count}</strong></li>)}
                </ul>
              </div>
            </div>
          )}
          {!data.trends.searchTelemetryAvailable ? (
            <p className="mt-3 text-xs text-text-secondary">
              Zoekgedrag wordt nog niet getoond. Privacyveilige aggregatie is nog niet operationeel.
            </p>
          ) : null}
        </AdminSection>

        <AdminSection title="Platformgezondheid" description="Governance- en verwerkingscontroles.">
          <dl className="divide-y divide-border rounded-card border border-border bg-surface px-4 shadow-sm">
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-text-secondary">Platformconfiguratie</dt>
              <dd><StatusPill tone={data.health.platformConfigurationValid ? 'good' : 'bad'}>{data.health.platformConfigurationValid ? 'Geldig' : 'Ongeldig'}</StatusPill></dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-text-secondary">Governanceblokkades</dt>
              <dd className="font-bold text-brand-dark">{data.health.governanceBlockers}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-text-secondary">Organisaties zonder eigenaar</dt>
              <dd className="font-bold text-brand-dark">{data.health.organizationsWithoutOwner}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-text-secondary">Accounts zonder geldige context</dt>
              <dd className="font-bold text-brand-dark">{data.health.accountsWithoutValidContext}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-text-secondary">Mislukte outboxitems</dt>
              <dd className="font-bold text-brand-dark">{data.health.failedOutbox}</dd>
            </div>
          </dl>
        </AdminSection>
      </div>
    </div>
  )
}
