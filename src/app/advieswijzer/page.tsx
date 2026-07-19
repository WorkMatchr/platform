import type { Metadata } from 'next'
import { PublicPlaceholderPage } from '@/components/public/public-placeholder-page'

export const metadata: Metadata = {
  title: 'Advieswijzer | WorkMatchr',
  description: 'De WorkMatchr Advieswijzer helpt organisaties straks hun arbo- en veiligheidsvraag te verduidelijken.',
}

export default function AdviceGuidePage() {
  return (
    <PublicPlaceholderPage
      title="De Advieswijzer wordt ontwikkeld"
      description="Straks helpt de Advieswijzer u stap voor stap om uw vraag te verduidelijken. U hoeft vooraf niet te weten welke dienst of specialist u nodig heeft. Heeft u al een WorkMatchr-account en wilt u een hulpvraag vastleggen? Dan kunt u de bestaande beveiligde intake gebruiken."
      nextStep={{ href: '/hulpvragen/nieuw', label: 'Start de bestaande intake' }}
    />
  )
}
