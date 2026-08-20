import type { Metadata } from 'next'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Wijzers | WorkMatchr',
  description: 'Gebruik de WorkMatchr-wijzers om uw situatie te verhelderen en een passende vervolgstap te kiezen.',
  alternates: { canonical: publicRoutes.guides },
}

export default function GuidesPage() {
  return (
    <PublicPageLayout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Wijzers' }]} eyebrow="Wijzers" title="Krijg richting bij uw arbo- en veiligheidsvraag" description="Onze wijzers helpen u stap voor stap bepalen wat aandacht vraagt en welke ondersteuning passend kan zijn.">
      <Section spacing="compact">
        <div className="grid gap-6 md:grid-cols-2">
          <Card><h2 className="text-2xl font-bold text-brand-dark">Advieswijzer</h2><p className="mt-3 text-text-secondary">Beschrijf wat er speelt. WorkMatchr helpt uw hulpvraag verhelderen zonder dat u vooraf de juiste deskundige hoeft te kiezen.</p><LinkButton href={publicRoutes.adviceGuide} className="mt-6">Start de Advieswijzer</LinkButton></Card>
          <Card><h2 className="text-2xl font-bold text-brand-dark">Compliance-wijzer</h2><p className="mt-3 text-text-secondary">Krijg een indicatief overzicht van algemene arboverplichtingen die op orde lijken, actie vragen of nog moeten worden gecontroleerd.</p><LinkButton href={publicRoutes.complianceGuide} className="mt-6">Start de Compliance-wijzer</LinkButton></Card>
        </div>
      </Section>
    </PublicPageLayout>
  )
}
