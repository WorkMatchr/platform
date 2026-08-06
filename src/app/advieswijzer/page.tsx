import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Section } from '@/components/layout/section'
import { PublicIntakePrototype } from '@/components/public/public-intake-prototype'
import { PublicPageLayout } from '@/components/public/public-page-layout'
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
}> {
  const token = (await cookies()).get(PUBLIC_INTAKE_COOKIE_NAME)?.value
  if (!token) return { draft: null, invalidSession: false }
  try {
    return {
      draft: await attachAdviceDossierForCurrentUser(
        await enrichPublicIntakeDraftWithAIClassification(
          await resumePublicIntakeDraft(token),
        ),
      ),
      invalidSession: false,
    }
  } catch (error) {
    if (error instanceof PublicIntakeServiceError && error.code === 'ACCESS_DENIED') {
      return { draft: null, invalidSession: true }
    }
    throw error
  }
}

export default async function AdviceGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ context?: string | string[] }>
}) {
  const { draft, invalidSession } = await loadDraft()
  const contextValue = (await searchParams).context
  const knowledgeContext = resolveActiveKnowledgeContext(
    Array.isArray(contextValue) ? contextValue[0] : contextValue,
  )

  return (
    <PublicPageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Advieswijzer' }]}
      eyebrow="Advieswijzer"
      title="Waar kunnen wij u vandaag mee helpen?"
      description="Beschrijf kort waar u binnen uw organisatie tegenaan loopt. U hoeft niet te weten welke deskundige of dienst u nodig heeft."
      compactHero
    >
      <Section containerSize="default" spacing="compact" className="!py-5 sm:!py-7">
        <PublicIntakePrototype initialDraft={draft} invalidSession={invalidSession} knowledgeContext={knowledgeContext} />
      </Section>
    </PublicPageLayout>
  )
}
