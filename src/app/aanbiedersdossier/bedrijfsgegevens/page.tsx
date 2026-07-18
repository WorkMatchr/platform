import Link from 'next/link'
import { saveProviderProfileAction } from '../actions'
import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderProfileForm } from '@/components/providers/provider-profile-form'
import { Card } from '@/components/ui/card'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderDossierDashboard, getProviderDossierOrganizationSection } from '@/lib/providers/provider-dossier-query-service'

export default async function ProviderOrganizationPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/bedrijfsgegevens')
  const [data, dashboard] = await Promise.all([getProviderDossierOrganizationSection(context.user.id, context.providerProfileId), getProviderDossierDashboard(context.user.id, context.providerProfileId)])
  if (data.section !== 'ORGANIZATION' || !data.value) return null
  const editable = context.canManage && dashboard.completeness.editableSections.includes('ORGANIZATION')
  return <><ProviderPageHeader title="Bedrijfsgegevens" description="Controleer de organisatiebasis en beheer afzonderlijk de gegevens die bij Uw dienstverlenersprofiel horen." readOnly={!editable} />
    <Card className="mb-6"><h2 className="text-lg font-bold">Organisatiebasis</h2><dl className="mt-4 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-text-secondary">Naam</dt><dd>{data.value.organization.name}</dd></div><div><dt className="text-sm text-text-secondary">Handelsnaam</dt><dd>{data.value.organization.tradeName ?? 'Niet ingevuld'}</dd></div><div><dt className="text-sm text-text-secondary">KvK-nummer</dt><dd>{data.value.organization.chamberOfCommerceNumber ?? 'Niet ingevuld'}</dd></div><div><dt className="text-sm text-text-secondary">Website</dt><dd>{data.value.organization.website ?? 'Niet ingevuld'}</dd></div></dl>{context.canManage && <Link href="/organisatie/profiel" className="mt-5 inline-block font-semibold text-brand underline">Organisatiegegevens wijzigen</Link>}</Card>
    {editable && <Card><h2 className="mb-5 text-lg font-bold">Aanbiedersprofiel</h2><ProviderProfileForm action={saveProviderProfileAction} version={data.value.version} description={data.value.description} maxTravelDistanceKm={data.value.maxTravelDistanceKm} acceptsRemoteWork={data.value.acceptsRemoteWork} /></Card>}
  </>
}
