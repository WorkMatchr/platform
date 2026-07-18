import { saveProviderSectorAction, setProviderRecordStatusAction } from '../actions'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderRecordStatusForm } from '@/components/providers/provider-onboarding-forms'
import { ProviderSectorForm } from '@/components/providers/provider-sector-form'
import { Card } from '@/components/ui/card'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderOnboardingOptions } from '@/lib/providers/provider-onboarding-query-service'
import { getProviderDossierDashboard, getProviderDossierSectorSection } from '@/lib/providers/provider-dossier-query-service'

export default async function ProviderSectorPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/sectorervaring')
  const [data, options, dashboard] = await Promise.all([getProviderDossierSectorSection(context.user.id, context.providerProfileId), getProviderOnboardingOptions(context.user.id, context.providerProfileId), getProviderDossierDashboard(context.user.id, context.providerProfileId)])
  if (data.section !== 'SECTOR_EXPERIENCE') return null
  const editable = context.canManage && dashboard.completeness.editableSections.includes('SECTOR_EXPERIENCE')
  return <><ProviderPageHeader title="Sectorervaring" groupLabel="Diensten en ervaring" description="Beschrijf aantoonbare ervaring per sector. Ervaringsjaren zijn optioneel en blijven zelfverklaard." readOnly={!editable} /><div className="space-y-4">{data.value.map((item) => <Card key={item.id}><div className="flex justify-between gap-4"><div><h2 className="font-bold">{item.revisions[0]?.sectorTerm.label}</h2><p className="text-sm text-text-secondary">{item.revisions[0]?.experienceYears ?? 'Onbekend'} jaar ervaring</p></div>{editable && <ProviderRecordStatusForm action={setProviderRecordStatusAction} profileVersion={dashboard.profileVersion} recordVersion={item.version} recordId={item.id} kind="SECTOR_EXPERIENCE" status={item.status} returnPath="/aanbiedersdossier/sectorervaring" />}</div></Card>)}</div>{editable && <Card className="mt-6"><h2 className="mb-5 text-lg font-bold">Sector toevoegen</h2><ProviderSectorForm action={saveProviderSectorAction} profileVersion={dashboard.profileVersion} sectors={options.sectors} /></Card>}</>
}
