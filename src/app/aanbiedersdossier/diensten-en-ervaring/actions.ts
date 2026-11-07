'use server'

import { revalidatePath } from 'next/cache'
import { ProviderServiceError } from '@/lib/providers/provider-errors'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import { getProviderOffering } from '@/lib/providers/provider-offering-query'
import { saveProviderOffering } from '@/lib/providers/provider-offering-service'

export async function saveOfferingAction(profileId: string, input: unknown) {
  const context = await requireProviderDossierContext('/aanbiedersdossier/diensten-en-ervaring')
  try {
    if (context.providerProfileId !== profileId) throw new ProviderServiceError('ACCESS_DENIED')
    await saveProviderOffering(context.user.id, profileId, input)
    revalidatePath('/aanbiedersdossier', 'layout')
    return { data: await getProviderOffering(context.user.id, profileId) }
  } catch (error) {
    return { error: error instanceof ProviderServiceError ? error.message : 'Opslaan kon niet worden bevestigd. Open het profiel opnieuw om de laatste stand te controleren.' }
  }
}
