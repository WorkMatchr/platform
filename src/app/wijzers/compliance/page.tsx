import type { Metadata } from 'next'
import { ArboGuideNotice, ArboGuidePageLayout, ArboGuideStartGate } from '@/components/public/arbo-guide-layout'
import { ComplianceGuide } from '@/components/public/compliance-guide'
import { LinkButton } from '@/components/ui/link-button'
import { publicRoutes } from '@/content/public-routes'
import { getArboGuidePageAccess } from '@/lib/arbo-guides/arbo-guide-access'

export const metadata: Metadata = {
  title: 'Compliance-wijzer | WorkMatchr',
  description: 'Controleer indicatief welke algemene arboverplichtingen zijn geregeld en waar actie of nadere controle nodig is.',
  alternates: { canonical: publicRoutes.complianceGuide },
}

export default async function ComplianceGuidePage() {
  const access = await getArboGuidePageAccess(publicRoutes.complianceGuide)
  return (
    <ArboGuidePageLayout currentLabel="Compliance-wijzer" title="Welke algemene arboverplichtingen heeft u geregeld?" description="Beantwoord compacte vragen over de basis van uw arbobeleid. U krijgt per onderwerp een indicatieve uitkomst en een concrete vervolgstap.">
      <ArboGuideNotice><strong className="text-brand-dark">Goed om te weten:</strong> de Compliance-wijzer geeft een indicatief overzicht op basis van uw antwoorden. De uitkomst is geen formele juridische beoordeling of certificering.</ArboGuideNotice>
      <section className="mb-7 rounded-card border border-brand-primary/20 bg-brand-primary-subtle p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">Nieuwe Arbo Compliance Scan</p>
        <h2 className="mt-2 text-xl font-bold text-brand-dark">Start met de gratis intake</h2>
        <p className="mt-2 max-w-3xl text-text-secondary">Beantwoord 15 korte profielvragen en zie welke arbo-onderwerpen in uw volledige scan relevant zijn. De intake geeft nog geen betaalde detailbevindingen prijs.</p>
        <LinkButton className="mt-5" href={publicRoutes.complianceScan}>Start gratis intake</LinkButton>
      </section>
      {access.status === 'AUTHORIZED'
        ? <ComplianceGuide />
        : <ArboGuideStartGate access={access} guideName="Compliance-wijzer" />}
    </ArboGuidePageLayout>
  )
}
