import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { ProviderOfferingForm } from '@/components/providers/provider-offering-form'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderOffering } from '@/lib/providers/provider-offering-query'
import { saveOfferingAction } from './actions'
import { saveOfferingAction } from './actions'

export default async function ProviderOfferingPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/diensten-en-ervaring')
  const data = await getProviderOffering(context.user.id, context.providerProfileId)
  return <>
    <ProviderPageHeader title="Mijn dienstverlening" description="Vul sectoren, diensten, specialismen, leveringsvormen en werkgebied samen in. Sla alle wijzigingen in één keer op." readOnly={!data.editSectors && !data.editServices && !data.editArea} />
    <ProviderOfferingForm key={data.profileId} initial={data} save={saveOfferingAction} />
  </>
}
