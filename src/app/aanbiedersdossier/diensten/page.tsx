import { saveProviderCapabilityAction, setProviderRecordStatusAction } from '../actions'
import { ProviderCapabilityForm } from '@/components/providers/provider-capability-form'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderRecordStatusForm } from '@/components/providers/provider-onboarding-forms'
import { ProviderVerificationLabel } from '@/components/providers/provider-verification-label'
import { Card } from '@/components/ui/card'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderOnboardingOptions } from '@/lib/providers/provider-onboarding-query-service'
import { getProviderDossierCapabilitiesSection, getProviderDossierDashboard } from '@/lib/providers/provider-dossier-query-service'
import { providerDeliveryModeLabels } from '@/lib/providers/provider-dossier-presentation'

export default async function ProviderCapabilitiesPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/diensten')
  const [data, options, dashboard] = await Promise.all([getProviderDossierCapabilitiesSection(context.user.id, context.providerProfileId), getProviderOnboardingOptions(context.user.id, context.providerProfileId), getProviderDossierDashboard(context.user.id, context.providerProfileId)])
  if (data.section !== 'CAPABILITIES') return null
  const editable = context.canManage && dashboard.completeness.editableSections.includes('CAPABILITIES')
  return <><ProviderPageHeader title="Diensten en specialismen" groupLabel="Diensten en ervaring" description="Leg vast welke diensten u levert en op welke manier. Alle nieuwe informatie start als zelfverklaard." readOnly={!editable} />
    <div className={`grid min-w-0 gap-6 ${editable ? 'lg:grid-cols-2' : ''}`}>
      {editable && <Card className="min-w-0 self-start"><h2 className="mb-5 text-lg font-bold">Dienst toevoegen</h2><ProviderCapabilityForm action={saveProviderCapabilityAction} profileVersion={dashboard.profileVersion} services={options.services} specialisms={options.specialisms} /></Card>}
      <section className="min-w-0" aria-labelledby="provider-services-title">
        <h2 id="provider-services-title" className="mb-4 text-lg font-bold">Uw diensten</h2>
        <div className="space-y-3">{data.value.length > 0 ? data.value.map((item) => { const current = item.revisions[0]; return <Card className="min-w-0 p-5 sm:p-5" key={item.id}><div className="flex min-w-0 flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h3 className="break-words font-bold">{current?.serviceTerm?.label ?? current?.specialismTerm?.label ?? 'Onbekende dienst'}</h3><p className="mt-1 break-words text-sm text-text-secondary">{current?.specialismTerm?.label ?? 'Geen specialisme'} | {(current?.deliveryModes ?? []).map((mode) => providerDeliveryModeLabels[mode]).join(', ')}</p><ProviderVerificationLabel label={current?.verificationLabel ?? 'Zelf verklaard'} /></div>{editable && <ProviderRecordStatusForm action={setProviderRecordStatusAction} profileVersion={dashboard.profileVersion} recordVersion={item.version} recordId={item.id} kind="CAPABILITY" status={item.status} returnPath="/aanbiedersdossier/diensten" />}</div></Card> }) : <Card className="p-5 sm:p-5" variant="subtle"><p className="text-sm text-text-secondary">Er zijn nog geen diensten toegevoegd.</p></Card>}</div>
      </section>
    </div>
  </>
}
