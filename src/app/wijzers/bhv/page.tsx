import type { Metadata } from 'next'
import { ArboGuideNotice, ArboGuidePageLayout, ArboGuideStartGate } from '@/components/public/arbo-guide-layout'
import { BhvGuide } from '@/components/public/bhv-guide'
import { publicRoutes } from '@/content/public-routes'
import { getArboGuidePageAccess } from '@/lib/arbo-guides/arbo-guide-access'

export const metadata: Metadata = {
  title: 'BHV-wijzer | WorkMatchr',
  description: 'Breng indicatief in beeld of uw BHV-organisatie aansluit op risico’s, scenario’s, bezetting, middelen en borging.',
  alternates: { canonical: publicRoutes.bhvGuide },
}

export default async function BhvGuidePage() {
  const access = await getArboGuidePageAccess(publicRoutes.bhvGuide)
  return <ArboGuidePageLayout currentLabel="BHV-wijzer" title="Past uw BHV-organisatie bij uw risico’s en bezetting?" description="Doorloop zes stappen van aanwezigen en scenario’s naar taken, dekking, middelen, opleiding en verbeteren.">
    <ArboGuideNotice><strong className="text-brand-dark">Geen vaste rekensom:</strong> de BHV-wijzer gebruikt geen verhouding ‘één BHV’er per aantal werknemers’. De benodigde organisatie hangt af van uw RI&E, scenario’s, aanwezigen, locaties en feitelijke beschikbaarheid.</ArboGuideNotice>
    {access.status === 'AUTHORIZED'
      ? <BhvGuide />
      : <ArboGuideStartGate access={access} guideName="BHV-wijzer" />}
  </ArboGuidePageLayout>
}
