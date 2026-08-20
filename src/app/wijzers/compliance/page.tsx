import type { Metadata } from 'next'
import { Section } from '@/components/layout/section'
import { ComplianceGuide } from '@/components/public/compliance-guide'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Compliance-wijzer | WorkMatchr',
  description: 'Controleer indicatief welke algemene arboverplichtingen zijn geregeld en waar actie of nadere controle nodig is.',
  alternates: { canonical: publicRoutes.complianceGuide },
}

export default function ComplianceGuidePage() {
  return (
    <PublicPageLayout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Wijzers', href: publicRoutes.guides }, { label: 'Compliance-wijzer' }]} eyebrow="Compliance-wijzer" title="Welke algemene arboverplichtingen heeft u geregeld?" description="Beantwoord compacte vragen over de basis van uw arbobeleid. U krijgt per onderwerp een indicatieve uitkomst en een concrete vervolgstap." compactHero>
      <Section spacing="compact" containerSize="default">
        <div className="mb-7 rounded-card border border-brand-primary/20 bg-brand-primary-subtle p-5 text-sm text-text-secondary"><strong className="text-brand-dark">Goed om te weten:</strong> de Compliance-wijzer geeft een indicatief overzicht op basis van uw antwoorden. De uitkomst is geen formele juridische beoordeling of certificering.</div>
        <ComplianceGuide />
      </Section>
    </PublicPageLayout>
  )
}
