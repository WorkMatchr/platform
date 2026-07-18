import { ProviderCompleteness } from '@/components/providers/provider-completeness'
import { ProviderOpenActions } from '@/components/providers/provider-open-actions'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderStatusSummary } from '@/components/providers/provider-status-summary'
import { Card } from '@/components/ui/card'
import { getProviderDossierDashboard } from '@/lib/providers/provider-dossier-query-service'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'

const dateFormatter = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeStyle: 'short' })

export default async function ProviderDossierPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier')
  const dashboard = await getProviderDossierDashboard(context.user.id, context.providerProfileId)
  return (
    <>
      <ProviderPageHeader title="Uw dienstverlenersprofiel" description={`Beheer de gegevens waarmee WorkMatchr Uw organisatie later zorgvuldig kan beoordelen. Laatst bijgewerkt op ${dateFormatter.format(new Date(dashboard.lastModifiedAt))}.`} readOnly={!context.canManage} />
      <ProviderStatusSummary statuses={dashboard.statuses} />
      <ProviderCompleteness assessment={dashboard.completeness} />
      <ProviderOpenActions actions={dashboard.openActions} canManage={context.canManage} />
      <Card className="mt-6" variant="subtle">
        <h2 className="text-xl font-bold text-brand-dark">Hoe WorkMatchr deze gegevens gebruikt</h2>
        <ul className="mt-4 space-y-2 text-text-secondary">
          <li>Betaalde voorkeursposities bestaan niet en credits beïnvloeden selectie niet.</li>
          <li>Vrije marketingtekst wordt niet gebruikt door de toekomstige Decision Engine.</li>
          <li>Alleen geldige en volgens het vastgestelde proces gecontroleerde gegevens kunnen later voor selectie worden gebruikt.</li>
          <li>Een volledig dossier is nog geen goedkeuring, kwalificatie of selecteerbaarheid.</li>
        </ul>
      </Card>
    </>
  )
}
