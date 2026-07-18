import { saveProviderWorkAreaAction, setProviderRecordStatusAction } from '../actions'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderRecordStatusForm } from '@/components/providers/provider-onboarding-forms'
import { ProviderWorkAreaForm } from '@/components/providers/provider-work-area-form'
import { Card } from '@/components/ui/card'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderOnboardingOptions } from '@/lib/providers/provider-onboarding-query-service'
import { getProviderDossierDashboard, getProviderDossierWorkAreaSection } from '@/lib/providers/provider-dossier-query-service'

export default async function ProviderWorkAreaPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/werkgebied')
  const [data, options, dashboard] = await Promise.all([getProviderDossierWorkAreaSection(context.user.id, context.providerProfileId), getProviderOnboardingOptions(context.user.id, context.providerProfileId), getProviderDossierDashboard(context.user.id, context.providerProfileId)])
  if (data.section !== 'WORK_AREA') return null
  const editable = context.canManage && dashboard.completeness.editableSections.includes('WORK_AREA')
  return <><ProviderPageHeader title="Werkgebied" description="Kies provincies, Landelijk en/of Remote. Internationale inzet valt buiten deze versie." readOnly={!editable} /><div className="space-y-4">{data.value.map((item) => <Card key={item.id}><div className="flex justify-between gap-4"><div><h2 className="font-bold">{item.revisions[0]?.regionTerm.label}</h2><p className="text-sm text-text-secondary">{item.revisions[0]?.maxTravelDistanceKm ? `Maximaal ${item.revisions[0].maxTravelDistanceKm} km` : 'Geen afstand opgegeven'}</p></div>{editable && <ProviderRecordStatusForm action={setProviderRecordStatusAction} profileVersion={dashboard.profileVersion} recordVersion={item.version} recordId={item.id} kind="WORK_AREA" status={item.status} returnPath="/aanbiedersdossier/werkgebied" />}</div></Card>)}</div>{editable && <Card className="mt-6"><h2 className="mb-5 text-lg font-bold">Werkgebied toevoegen</h2><ProviderWorkAreaForm action={saveProviderWorkAreaAction} profileVersion={dashboard.profileVersion} regions={options.regions} /></Card>}</>
}
