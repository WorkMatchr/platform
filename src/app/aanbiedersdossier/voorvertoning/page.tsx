import { ProviderDecisionProfile } from '@/components/providers/provider-decision-profile'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderProfileEditor } from '@/lib/providers/provider-decision-profile-service'

export default async function ProviderProfilePreviewPage() {
  const context = await requireProviderDossierContext('/aanbiedersdossier/voorvertoning')
  const profile = await getProviderProfileEditor(context.user.id, context.providerProfileId)
  return <ProviderDecisionProfile profile={profile} backHref="/aanbiedersdossier/profiel" backLabel="Terug naar profielbeheer" showCompleteness />
}
