import type { Metadata } from 'next'
import { ArboGuideOverviewCard, ArboGuidePageLayout } from '@/components/public/arbo-guide-layout'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Arbo-wijzers | WorkMatchr',
  description: 'Gebruik de WorkMatchr Arbo-wijzers om uw situatie te verhelderen en een passende vervolgstap te kiezen.',
  alternates: { canonical: publicRoutes.guides },
}

export default function GuidesPage() {
  return (
    <ArboGuidePageLayout title="Krijg richting bij uw arbo- en veiligheidsvraag" description="Onze Arbo-wijzers helpen u stap voor stap bepalen wat aandacht vraagt en welke ondersteuning passend kan zijn.">
      <div className="grid gap-6 md:grid-cols-2">
        <ArboGuideOverviewCard title="Advieswijzer" description="Beschrijf wat er speelt. WorkMatchr helpt uw hulpvraag verhelderen zonder dat u vooraf de juiste deskundige hoeft te kiezen." href={publicRoutes.adviceGuide} actionLabel="Start de Advieswijzer" />
        <ArboGuideOverviewCard title="Compliance-wijzer" description="Krijg een indicatief overzicht van algemene arboverplichtingen die op orde lijken, actie vragen of nog moeten worden gecontroleerd." href={publicRoutes.complianceGuide} actionLabel="Start de Compliance-wijzer" />
      </div>
    </ArboGuidePageLayout>
  )
}
