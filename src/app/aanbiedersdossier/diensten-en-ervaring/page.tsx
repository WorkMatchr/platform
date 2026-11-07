import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderOfferingForm } from '@/components/providers/provider-offering-form'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderOffering } from '@/lib/providers/provider-offering-query'
import { saveOfferingAction } from './actions'

export default async function ProviderOfferingPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/diensten-en-ervaring')
  const data = await getProviderOffering(context.user.id, context.providerProfileId)
  return <>
    <ProviderPageHeader title="Sectoren en diensten"
      description="Geef aan in welke branches u werkt en welke diensten u daar aanbiedt."
      readOnly={!data.editSectors && !data.editServices} />
    <ProviderOfferingForm key={data.profileId} initial={data} save={saveOfferingAction} />
  </>
}
