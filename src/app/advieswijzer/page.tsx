import type { Metadata } from 'next'
import { cookies, headers } from 'next/headers'
import { ArboGuidePageLayout } from '@/components/public/arbo-guide-layout'
import { PublicIntakePrototype } from '@/components/public/public-intake-prototype'
import { publicRoutes } from '@/content/public-routes'
import {
  PUBLIC_INTAKE_COOKIE_NAME,
} from '@/lib/public-intake/public-intake-config'
import { PublicIntakeServiceError } from '@/lib/public-intake/public-intake-errors'
import { enrichPublicIntakeDraftWithAIClassification } from '@/lib/public-intake/public-intake-ai-classification'
import { resumePublicIntakeDraft } from '@/lib/public-intake/public-intake-service'
import type { PublicIntakeDraftView } from '@/lib/public-intake/public-intake-types'
import { attachAdviceDossierForCurrentUser } from '@/lib/advice-dossiers/public-intake-advice-dossier-handoff'
import { resolveActiveKnowledgeContext } from '@/content/knowledge/knowledge-contexts'
import {
  assertPublicIntakeRequestAllowed,
  PublicIntakeAbuseProtectionError,
} from '@/lib/public-intake/public-intake-abuse-protection'

export const metadata: Metadata = {
  title: 'Advieswijzer | WorkMatchr',
  description: 'Beschrijf uw situatie en verduidelijk stap voor stap uw hulpvraag over arbeidsomstandigheden en veiligheid.',
  alternates: { canonical: publicRoutes.adviceGuide },
  openGraph: {
    title: 'Advieswijzer | WorkMatchr',
    description: 'Beschrijf uw situatie en verduidelijk stap voor stap uw hulpvraag.',
    url: publicRoutes.adviceGuide,
  },
}

async function loadDraft(): Promise<{
  draft: PublicIntakeDraftView | null
  invalidSession: boolean
  temporarilyUnavailable: boolean
}> {
  const token = (await cookies()).get(PUBLIC_INTAKE_COOKIE_NAME)?.value
  if (!token) return { draft: null, invalidSession: false, temporarilyUnavailable: false }
  try {
    const abuseContext = { requestHeaders: await headers(), sessionToken: token }
    await assertPublicIntakeRequestAllowed(abuseContext)
    return {
      draft: await attachAdviceDossierForCurrentUser(
        await enrichPublicIntakeDraftWithAIClassification(
          await resumePublicIntakeDraft(token),
          { abuseContext },
        ),
      ),
      invalidSession: false,
      temporarilyUnavailable: false,
    }
  } catch (error) {
    if (error instanceof PublicIntakeAbuseProtectionError) {
      return { draft: null, invalidSession: false, temporarilyUnavailable: true }
    }
    if (error instanceof PublicIntakeServiceError && error.code === 'ACCESS_DENIED') {
      return { draft: null, invalidSession: true, temporarilyUnavailable: false }
    }
    throw error
  }
}

export default async function AdviceGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ context?: string | string[] }>
}) {
  const { draft, invalidSession, temporarilyUnavailable } = await loadDraft()
  const contextValue = (await searchParams).context
  const knowledgeContext = resolveActiveKnowledgeContext(
    Array.isArray(contextValue) ? contextValue[0] : contextValue,
  )

  return (
    <ArboGuidePageLayout
      currentLabel="Advieswijzer"
      title="Waar kunnen wij u vandaag mee helpen?"
      description="Beschrijf kort waar u binnen uw organisatie tegenaan loopt. U hoeft niet te weten welke deskundige of dienst u nodig heeft."
    >
      <PublicIntakePrototype
        initialDraft={draft}
        invalidSession={invalidSession}
        temporarilyUnavailable={temporarilyUnavailable}
        knowledgeContext={knowledgeContext}
      />
    </ArboGuidePageLayout>
  )
}
