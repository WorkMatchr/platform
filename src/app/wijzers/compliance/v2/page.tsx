import { notFound } from 'next/navigation'
import { ArboGuidePageLayout, ArboGuideStartGate } from '@/components/public/arbo-guide-layout'
import { getArboGuidePageAccess } from '@/lib/arbo-guides/arbo-guide-access'
import { isF4Enabled, loadF4Framework } from '@/lib/compliance/compliance-f4-framework'
import { ComplianceExpandedGuide } from '@/components/public/compliance-expanded-guide'

export const metadata = { title: 'Uitgebreide Compliance-wijzer | WorkMatchr', robots: { index: false, follow: false } }
export default async function ExpandedGuidePage() {
  if (!isF4Enabled()) notFound()
  const access = await getArboGuidePageAccess('/wijzers/compliance/v2')
  return <ArboGuidePageLayout title="Uw arbobeleid in beeld" description="Beantwoord vragen over uw organisatie. U krijgt een indicatief overzicht per onderwerp." currentLabel="Compliance-wijzer">
    {access.status !== 'AUTHORIZED' ? <ArboGuideStartGate access={access} guideName="Compliance-wijzer" /> : <AvailableGuide />}
  </ArboGuidePageLayout>
}
async function AvailableGuide() {
  const definition = await loadF4Framework().catch(() => null)
  return definition ? <ComplianceExpandedGuide definition={definition} /> : <p role="status">Deze versie van de wijzer is nog niet beschikbaar. Probeer het later opnieuw.</p>
}
