import type { Metadata } from 'next'
import { ArboGuideNotice, ArboGuidePageLayout } from '@/components/public/arbo-guide-layout'
import { ComplianceGuide } from '@/components/public/compliance-guide'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Compliance-wijzer | WorkMatchr',
  description: 'Controleer indicatief welke algemene arboverplichtingen zijn geregeld en waar actie of nadere controle nodig is.',
  alternates: { canonical: publicRoutes.complianceGuide },
}

export default function ComplianceGuidePage() {
  return (
    <ArboGuidePageLayout currentLabel="Compliance-wijzer" title="Welke algemene arboverplichtingen heeft u geregeld?" description="Beantwoord compacte vragen over de basis van uw arbobeleid. U krijgt per onderwerp een indicatieve uitkomst en een concrete vervolgstap.">
      <ArboGuideNotice><strong className="text-brand-dark">Goed om te weten:</strong> de Compliance-wijzer geeft een indicatief overzicht op basis van uw antwoorden. De uitkomst is geen formele juridische beoordeling of certificering.</ArboGuideNotice>
      <ComplianceGuide />
    </ArboGuidePageLayout>
  )
}
