import { notFound } from 'next/navigation'
import { saveProviderQualificationAction, setProviderRecordStatusAction } from '../../../actions'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderQualificationForm, ProviderRecordStatusForm } from '@/components/providers/provider-onboarding-forms'
import { Card } from '@/components/ui/card'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderOnboardingOptions } from '@/lib/providers/provider-onboarding-query-service'
import { getProviderDossierCapabilitiesSection, getProviderDossierDashboard, getProviderDossierQualificationsSection } from '@/lib/providers/provider-dossier-query-service'

export default async function ProviderQualificationsPage({ params }: { params: Promise<{ professionalId: string }> }) {
  const { professionalId } = await params
  const context = await requireProviderDossierContext(`/aanbiedersdossier/professionals/${professionalId}/kwalificaties`)
  const [data, capabilities, options, dashboard] = await Promise.all([
    getProviderDossierQualificationsSection(context.user.id, context.providerProfileId),
    getProviderDossierCapabilitiesSection(context.user.id, context.providerProfileId),
    getProviderOnboardingOptions(context.user.id, context.providerProfileId),
    getProviderDossierDashboard(context.user.id, context.providerProfileId),
  ])
  if (data.section !== 'QUALIFICATIONS' || capabilities.section !== 'CAPABILITIES') return null
  const professional = data.value.find((item) => item.id === professionalId)
  if (!professional) notFound()
  const editable = context.canManage && dashboard.completeness.editableSections.includes('QUALIFICATIONS')
  const capabilityOptions = capabilities.value
    .filter((item) => item.status === 'ACTIVE')
    .map((item) => ({ id: item.id, label: item.revisions[0]?.serviceTerm?.label ?? item.revisions[0]?.specialismTerm?.label ?? 'Dienst' }))
  const capabilityLabels = new Map(capabilityOptions.map((item) => [item.id, item.label]))

  return <>
    <ProviderPageHeader title="Kwalificaties" description="Leg door u opgegeven beroepskwalificaties vast en koppel deze aan relevante diensten." readOnly={!editable} />
    <div className="space-y-4">{professional.qualifications.map((item) => {
      const revision = item.revisions[0]
      const serviceLabels = item.capabilities.map((capability) => capabilityLabels.get(capability.capabilityId)).filter(Boolean)
      const registrationNumber = revision && 'registrationNumber' in revision ? revision.registrationNumber : null
      return <Card key={item.id}><div className="flex justify-between gap-4">
        <div>
          <h2 className="font-bold">{revision?.qualificationTerm.label}</h2>
          <p className="mt-1 text-sm text-text-secondary">Opleider of uitgevende instantie: {revision?.issuer ?? 'Niet opgegeven'}</p>
          <p className="mt-1 text-sm text-text-secondary">Soort bewijs: {revision?.isCertified ? 'Certificaat' : 'Overige kwalificatie'}</p>
          {registrationNumber && <p className="mt-1 text-sm text-text-secondary">Registratie- of certificaatnummer: {registrationNumber}</p>}
          <p className="mt-1 text-sm text-text-secondary">Diensten: {serviceLabels.length > 0 ? serviceLabels.join(', ') : 'Geen diensten gekoppeld'}</p>
          <p className="mt-1 text-sm font-semibold">Door u opgegeven</p>
        </div>
        {editable && <ProviderRecordStatusForm action={setProviderRecordStatusAction} profileVersion={dashboard.profileVersion} recordVersion={item.version} recordId={item.id} kind="PROFESSIONAL_QUALIFICATION" status={item.status} returnPath={`/aanbiedersdossier/professionals/${professionalId}/kwalificaties`} />}
      </div></Card>
    })}</div>
    {editable && <Card className="mt-6"><h2 className="mb-5 text-lg font-bold">Kwalificatie toevoegen</h2><ProviderQualificationForm action={saveProviderQualificationAction} profileVersion={dashboard.profileVersion} professionalId={professionalId} qualifications={options.qualifications} capabilities={capabilityOptions} /></Card>}
  </>
}
