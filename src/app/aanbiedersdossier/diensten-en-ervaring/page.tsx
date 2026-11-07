import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderOfferingForm } from '@/components/providers/provider-offering-form'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderOffering } from '@/lib/providers/provider-offering-query'
import { saveOfferingAction } from './actions'
import { saveProviderWorkAreaAction, setProviderRecordStatusAction } from '../actions'
import { ProviderRecordStatusForm } from '@/components/providers/provider-onboarding-forms'
import { ProviderWorkAreaForm } from '@/components/providers/provider-work-area-form'
import { Card } from '@/components/ui/card'
import { getProviderOnboardingOptions } from '@/lib/providers/provider-onboarding-query-service'
import { getProviderDossierDashboard, getProviderDossierWorkAreaSection } from '@/lib/providers/provider-dossier-query-service'

export default async function ProviderOfferingPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/diensten-en-ervaring')
  const data = await getProviderOffering(context.user.id, context.providerProfileId)
  const area = await getProviderDossierWorkAreaSection(context.user.id, context.providerProfileId)
  const dashboard = await getProviderDossierDashboard(context.user.id, context.providerProfileId)
  const options = await getProviderOnboardingOptions(context.user.id, context.providerProfileId)
  const editArea = context.canManage && dashboard.completeness.editableSections.includes('WORK_AREA')
  return <>
    <ProviderPageHeader title="Mijn dienstverlening"
      description="Leg op één plek vast in welke sectoren u werkt, welke diensten u aanbiedt en wat uw werkgebied is."
      readOnly={!data.editSectors && !data.editServices} />
    <ProviderOfferingForm key={data.profileId} initial={data} save={saveOfferingAction} />
    {area.section === 'WORK_AREA' && <section id="werkgebied" className="mt-6 space-y-4" aria-labelledby="werkgebied-heading"><Card><h2 id="werkgebied-heading" className="text-xl font-bold">Werkgebied</h2><p className="mt-2 text-text-secondary">Selecteer de regio’s waarin u opdrachten wilt uitvoeren.</p></Card>{area.value.map(item => <Card key={item.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{item.revisions[0]?.regionTerm.label}</p><p className="text-sm text-text-secondary">{item.revisions[0]?.maxTravelDistanceKm ? `Maximaal ${item.revisions[0].maxTravelDistanceKm} km` : 'Geen afstand opgegeven'}</p></div>{editArea && <ProviderRecordStatusForm action={setProviderRecordStatusAction} profileVersion={dashboard.profileVersion} recordVersion={item.version} recordId={item.id} kind="WORK_AREA" status={item.status} returnPath="/aanbiedersdossier/werkgebied" />}</div></Card>)}{editArea && <Card><h3 className="mb-4 text-lg font-bold">Werkgebied toevoegen</h3><ProviderWorkAreaForm action={saveProviderWorkAreaAction} profileVersion={dashboard.profileVersion} regions={options.regions} /></Card>}</section>}
  </>
}
