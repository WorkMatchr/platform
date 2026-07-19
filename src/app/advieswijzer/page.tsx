import type { Metadata } from 'next'
import { Section } from '@/components/layout/section'
import { GuidedIntake } from '@/components/public/guided-intake'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Advieswijzer | WorkMatchr',
  description: 'Beantwoord maximaal vijf gerichte vragen en krijg een eerste, uitlegbaar advies over uw arbo- en veiligheidssituatie.',
  alternates: { canonical: publicRoutes.adviceGuide },
  openGraph: { title: 'Advieswijzer | WorkMatchr', description: 'Beantwoord maximaal vijf gerichte vragen en krijg een eerste, uitlegbaar advies.', url: publicRoutes.adviceGuide },
}

export default function AdviceGuidePage() {
  return (
    <PublicPageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Advieswijzer' }]}
      eyebrow="Advieswijzer"
      title="Verduidelijk uw vraag in maximaal vijf stappen"
      description="De Advieswijzer brengt aantoonbare feiten uit uw antwoorden samen en geeft eerst inhoudelijk advies. Alleen daarna ziet u mogelijke dienstverlening."
    >
      <Section containerSize="default" spacing="compact">
        <GuidedIntake />
      </Section>
    </PublicPageLayout>
  )
}
