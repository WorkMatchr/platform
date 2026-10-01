import type { Metadata } from 'next'
import { ArboGuideNotice, ArboGuidePageLayout } from '@/components/public/arbo-guide-layout'
import { ComplianceFreeIntake } from '@/components/public/compliance-free-intake'

export const metadata: Metadata = {
  title: 'Gratis Arbo Compliance intake | WorkMatchr',
  description: 'Bepaal in enkele minuten welke arbo-onderwerpen relevant zijn voor uw organisatie, zonder volledige bevindingen of detailacties prijs te geven.',
}

export default function ComplianceScanIntakePage() {
  return (
    <ArboGuidePageLayout
      currentLabel="Arbo Compliance Scan"
      title="Welke arbo-onderwerpen zijn relevant voor uw organisatie?"
      description="Beantwoord 15 korte profielvragen. U ziet daarna welke onderwerpen in een volledige scan moeten worden beoordeeld."
    >
      <ArboGuideNotice>
        <strong className="text-brand-dark">Gratis intake:</strong> deze stap bepaalt alleen de relevante onderwerpen en signalen voor verdieping. U krijgt hier nog geen volledige juridische beoordeling, detailbevindingen of certificaat.
      </ArboGuideNotice>
      <ComplianceFreeIntake />
    </ArboGuidePageLayout>
  )
}
