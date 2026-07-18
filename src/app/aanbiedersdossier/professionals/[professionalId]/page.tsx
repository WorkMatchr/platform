import Link from 'next/link'
import { notFound } from 'next/navigation'
import { saveProviderProfessionalAction, setProviderRecordStatusAction } from '../../actions'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderProfessionalForm, ProviderRecordStatusForm } from '@/components/providers/provider-onboarding-forms'
import { Card } from '@/components/ui/card'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderDossierDashboard, getProviderDossierProfessionalsSection } from '@/lib/providers/provider-dossier-query-service'

export default async function ProviderProfessionalPage({ params }: { params: Promise<{ professionalId: string }> }) {
  const { professionalId } = await params
  const context = await requireProviderDossierContext(`/aanbiedersdossier/professionals/${professionalId}`)
  const [data, dashboard] = await Promise.all([getProviderDossierProfessionalsSection(context.user.id, context.providerProfileId), getProviderDossierDashboard(context.user.id, context.providerProfileId)])
  if (data.section !== 'PROFESSIONALS') return null
  const professional = data.value.find((item) => item.id === professionalId)
  if (!professional) notFound()
  const identity = professional.identityRevisions[0]
  const editable = context.canManage && dashboard.completeness.editableSections.includes('PROFESSIONALS') && 'displayName' in (identity ?? {})
  return <><ProviderPageHeader title={identity && 'displayName' in identity ? identity.displayName : 'Professional'} description="Bekijk de functionele rol en gekoppelde kwalificaties." readOnly={!editable} /><p className="mb-6"><Link href={`/aanbiedersdossier/professionals/${professionalId}/kwalificaties`} className="font-semibold text-brand underline">Kwalificaties beheren</Link></p>{editable && <Card className="space-y-5"><ProviderProfessionalForm action={saveProviderProfessionalAction} profileVersion={dashboard.profileVersion} professional={{ id: professional.id, version: professional.version, displayName: identity && 'displayName' in identity ? identity.displayName : '', functionalRole: identity?.functionalRole, status: professional.status }} /><ProviderRecordStatusForm action={setProviderRecordStatusAction} profileVersion={dashboard.profileVersion} recordVersion={professional.version} recordId={professional.id} kind="PROFESSIONAL" status={professional.status} returnPath={`/aanbiedersdossier/professionals/${professionalId}`} /></Card>}</>
}
