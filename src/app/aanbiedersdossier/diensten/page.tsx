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
    <div className={`grid min-w-0 items-start gap-6 ${editable ? 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' : ''}`}>
      {editable && <Card className="min-w-0"><h2 className="mb-5 text-lg font-bold">Dienst toevoegen</h2><ProviderCapabilityForm action={saveProviderCapabilityAction} profileVersion={dashboard.profileVersion} services={options.services} specialisms={options.specialisms} /></Card>}
      <Card className="min-w-0" aria-labelledby="provider-services-title">
        <h2 id="provider-services-title" className="mb-5 text-lg font-bold">Uw diensten</h2>
        <div className="space-y-3">{data.value.length > 0 ? data.value.map((item) => { const current = item.revisions[0]; return <article className="min-w-0 rounded-control border border-border bg-background p-4" key={item.id}><div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 flex-1"><h3 className="break-words font-bold">{current?.serviceTerm?.label ?? current?.specialismTerm?.label ?? 'Onbekende dienst'}</h3><p className="mt-1 break-words text-sm text-text-secondary">{current?.specialismTerm?.label ?? 'Geen specialisme'} | {(current?.deliveryModes ?? []).map((mode) => providerDeliveryModeLabels[mode]).join(', ')}</p><ProviderVerificationLabel label={current?.verificationLabel ?? 'Zelf verklaard'} /></div>{editable && <div className="shrink-0 sm:self-center"><ProviderRecordStatusForm action={setProviderRecordStatusAction} profileVersion={dashboard.profileVersion} recordVersion={item.version} recordId={item.id} kind="CAPABILITY" status={item.status} returnPath="/aanbiedersdossier/diensten" /></div>}</div></article> }) : <div className="rounded-control border border-brand-primary/15 bg-surface-subtle p-5"><p className="text-sm text-text-secondary">Er zijn nog geen diensten toegevoegd.</p></div>}</div>
      </Card>
    </div>
  </>
}
