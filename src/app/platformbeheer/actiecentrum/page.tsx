import Link from 'next/link'
import { PlatformSignalStatusForm } from '@/components/platform-admin/platform-admin-actions'
import { AdminPageHeader, AdminSection, EmptyState, StatusPill } from '@/components/platform-admin/platform-admin-ui'
import { platformActionStatusLabels } from '@/lib/platform-admin/platform-admin-action-center'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import { getPlatformActionCenter } from '@/lib/platform-admin/platform-admin-query-service'

const severityPresentation = {
  CRITICAL: { label: 'Kritiek', tone: 'bad' as const },
  HIGH: { label: 'Hoog', tone: 'warning' as const },
  NORMAL: { label: 'Normaal', tone: 'neutral' as const },
}

export default async function PlatformActionCenterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const administrator = await requirePlatformAdministrator('/platformbeheer/actiecentrum')
  const params = await searchParams
  const actions = await getPlatformActionCenter(administrator.id)
  return (
    <>
      <AdminPageHeader
        title="Actiecentrum"
        description="Signaleren, begrijpen, handelen en append-only vastleggen vanuit één compacte werkvoorraad."
      />
      {params.resultaat ? <p className="rounded-control border border-success-border bg-success-subtle px-4 py-3 text-sm">De beheeractie is vastgelegd.</p> : null}
      {params.fout ? <p className="rounded-control border border-danger-border bg-danger-subtle px-4 py-3 text-sm">De beheeractie is niet uitgevoerd. Er zijn geen wijzigingen doorgevoerd. Controleer de gegevens en uw bevoegdheid en probeer het opnieuw.</p> : null}
      <AdminSection title="Open beheeracties" description={`${actions.length} open ${actions.length === 1 ? 'actie' : 'acties'}, deterministisch geordend op ernst.`}>
        {actions.length === 0 ? <EmptyState>Er zijn geen open beheeracties.</EmptyState> : (
          <ol className="grid gap-3">
            {actions.map((action) => {
              const severity = severityPresentation[action.severity]
              const highlighted = params.signaal === action.id
              return (
                <li
                  className={`rounded-card border bg-surface p-4 shadow-sm ${highlighted ? 'border-brand-primary ring-2 ring-brand-primary-subtle' : 'border-border'}`}
                  id={`action-${action.id.replaceAll(':', '-')}`}
                  key={action.id}
                >
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.8fr)]">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={severity.tone}>{severity.label}</StatusPill>
                        <StatusPill>{action.category}</StatusPill>
                        <StatusPill tone="warning">{platformActionStatusLabels[action.status]}</StatusPill>
                      </div>
                      <h2 className="mt-3 text-lg font-bold text-brand-dark">{action.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">{action.explanation}</p>
                      <p className="mt-2 text-sm"><strong>Aanbevolen:</strong> {action.recommendedAction}</p>
                      <dl className="mt-3 grid gap-1 text-xs text-text-secondary sm:grid-cols-2">
                        <div><dt className="inline">Bron: </dt><dd className="inline font-semibold">{action.ruleCode}</dd></div>
                        <div><dt className="inline">Datum: </dt><dd className="inline font-semibold">{action.detectedAt.toLocaleString('nl-NL')}</dd></div>
                        <div><dt className="inline">Verantwoordelijke: </dt><dd className="inline font-semibold">{action.responsibleName ?? 'Nog niet toegewezen'}</dd></div>
                        <div><dt className="inline">Deeplink: </dt><dd className="inline"><Link className="font-semibold text-brand-primary underline" href={action.href}>{action.actionLabel}</Link></dd></div>
                      </dl>
                    </div>
                    <PlatformSignalStatusForm signalId={action.id} currentStatus={action.status} />
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </AdminSection>
    </>
  )
}
