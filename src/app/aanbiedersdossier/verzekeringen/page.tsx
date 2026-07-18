import { saveProviderInsuranceAction, setProviderRecordStatusAction } from '../actions'
import { ProviderFailureNotice } from '@/components/providers/provider-failure-notice'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderInsuranceForm, ProviderRecordStatusForm } from '@/components/providers/provider-onboarding-forms'
import { Card } from '@/components/ui/card'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderOnboardingOptions } from '@/lib/providers/provider-onboarding-query-service'
import { getProviderDossierComplianceSection, getProviderDossierDashboard } from '@/lib/providers/provider-dossier-query-service'

export default async function ProviderInsurancePage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/verzekeringen')
  const [data, options, dashboard] = await Promise.all([getProviderDossierComplianceSection(context.user.id, context.providerProfileId), getProviderOnboardingOptions(context.user.id, context.providerProfileId), getProviderDossierDashboard(context.user.id, context.providerProfileId)])
  if (data.section !== 'INSURANCE') return null
  const editable = context.canManage && dashboard.completeness.editableSections.includes('INSURANCE')
  return <><ProviderPageHeader title="Verzekeringen" description="Leg verzekeringsgegevens vast. Alleen veilig gescande bewijsrevisies kunnen worden gekoppeld." readOnly={!editable} /><div className="space-y-4">{data.value.map((item) => <Card key={item.id}><div className="flex justify-between gap-4"><div><h2 className="font-bold">{item.revisions[0]?.insuranceTypeTerm.label}</h2><p className="text-sm text-text-secondary">{item.revisions[0]?.insurer} · geldig tot {item.revisions[0]?.expiresAt.toLocaleDateString('nl-NL')}</p></div>{editable && <ProviderRecordStatusForm action={setProviderRecordStatusAction} profileVersion={dashboard.profileVersion} recordVersion={item.version} recordId={item.id} kind="INSURANCE" status={item.status} returnPath="/aanbiedersdossier/verzekeringen" />}</div></Card>)}</div>{editable && options.evidence.length > 0 ? <Card className="mt-6"><h2 className="mb-5 text-lg font-bold">Verzekering toevoegen</h2><ProviderInsuranceForm action={saveProviderInsuranceAction} profileVersion={dashboard.profileVersion} insuranceTypes={options.insuranceTypes} evidence={options.evidence} /></Card> : editable && <div className="mt-6"><ProviderFailureNotice title="Bewijsupload niet beschikbaar">Er is geen veilig, als schoon beoordeeld bewijsbestand beschikbaar. De productieopslag- en malwareketen moet volledig zijn geconfigureerd voordat bewijs kan worden gekoppeld.</ProviderFailureNotice></div>}</>
}
