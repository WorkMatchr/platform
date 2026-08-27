import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { ArboGuidePageLayout } from '@/components/public/arbo-guide-layout'
import { PublicIntakePrototype } from '@/components/public/public-intake-prototype'
import { PUBLIC_INTAKE_COOKIE_NAME } from '@/lib/public-intake/public-intake-config'
import { PublicIntakeServiceError } from '@/lib/public-intake/public-intake-errors'
import { enrichPublicIntakeDraftWithAIClassification } from '@/lib/public-intake/public-intake-ai-classification'
import { resumePublicIntakeDraft } from '@/lib/public-intake/public-intake-service'
import type { PublicIntakeDraftView } from '@/lib/public-intake/public-intake-types'
import { attachAdviceDossierForCurrentUser } from '@/lib/advice-dossiers/public-intake-advice-dossier-handoff'
import { assertPublicIntakeRequestAllowed, PublicIntakeAbuseProtectionError } from '@/lib/public-intake/public-intake-abuse-protection'

export const metadata: Metadata = {
  title: 'Ondersteuning aanvragen | WorkMatchr',
  description: 'Beschrijf uw hulpvraag. WorkMatchr stelt daarna alleen de relevante aanvullende vragen.',
  robots: { index: false, follow: false },
}

async function loadDraft(): Promise<{ draft: PublicIntakeDraftView | null; invalidSession: boolean; temporarilyUnavailable: boolean }> {
  const token = (await cookies()).get(PUBLIC_INTAKE_COOKIE_NAME)?.value
  if (!token) return { draft: null, invalidSession: false, temporarilyUnavailable: false }
  try {
    const abuseContext = { requestHeaders: await headers(), sessionToken: token }
    await assertPublicIntakeRequestAllowed(abuseContext)
    return {
      draft: await attachAdviceDossierForCurrentUser(await enrichPublicIntakeDraftWithAIClassification(await resumePublicIntakeDraft(token), { abuseContext })),
      invalidSession: false,
      temporarilyUnavailable: false,
    }
  } catch (error) {
    if (error instanceof PublicIntakeAbuseProtectionError) return { draft: null, invalidSession: false, temporarilyUnavailable: true }
    if (error instanceof PublicIntakeServiceError && error.code === 'ACCESS_DENIED') return { draft: null, invalidSession: true, temporarilyUnavailable: false }
    throw error
  }
}

export default async function PublicHelpRequestPage() {
  const { draft, invalidSession, temporarilyUnavailable } = await loadDraft()
  return (
    <ArboGuidePageLayout
      currentLabel="Ondersteuning aanvragen"
      title="Waarbij heeft uw organisatie hulp nodig?"
      description="Beschrijf uw hulpvraag in uw eigen woorden. Daarna stellen wij alleen de aanvullende vragen die voor uw situatie relevant zijn."
    >
      <PublicIntakePrototype
        initialDraft={draft}
        invalidSession={invalidSession}
        temporarilyUnavailable={temporarilyUnavailable}
        experience="HELP_REQUEST_V2"
      />
    </ArboGuidePageLayout>
  )
}
