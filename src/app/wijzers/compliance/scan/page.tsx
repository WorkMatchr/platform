import type { Metadata } from 'next'
import { ArboGuideNotice, ArboGuidePageLayout } from '@/components/public/arbo-guide-layout'
import { ComplianceFreeIntake } from '@/components/public/compliance-free-intake'

export const metadata: Metadata = {
  title: 'Gratis Arbo Compliance intake | WorkMatchr',
  description: 'Verken met vijf hoofdvragen welke arbo-onderwerpen relevant of mogelijk relevant zijn voor uw organisatie. Gratis, zonder account en zonder complianceoordeel.',
  alternates: { canonical: '/wijzers/compliance/scan' },
}

export default function ComplianceScanIntakePage() {
  return (
    <ArboGuidePageLayout
      currentLabel="Gratis Compliance-intake"
      title="Welke arbo-onderwerpen zijn relevant voor uw organisatie?"
      description="Verken uw situatie met vijf hoofdvragen, waaronder vragen met meerdere antwoordmogelijkheden. U heeft geen account nodig."
    >
      <ArboGuideNotice>
        <strong className="text-brand-dark">Gratis intake:</strong> u ziet relevante en mogelijk relevante onderwerpen. Dit is uitsluitend oriëntatie, geen compliancebeoordeling, juridische conclusie of certificaat.
      </ArboGuideNotice>
      <ComplianceFreeIntake />
    </ArboGuidePageLayout>
  )
}
