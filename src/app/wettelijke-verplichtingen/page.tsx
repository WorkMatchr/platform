import type { Metadata } from 'next'
import { PublicPlaceholderPage } from '@/components/public/public-placeholder-page'

export const metadata: Metadata = { title: 'Wettelijke verplichtingen | WorkMatchr', description: 'Algemene informatie over arboverplichtingen voor organisaties.' }

export default function LegalObligationsPage() {
  return <PublicPlaceholderPage title="Informatie over wettelijke verplichtingen volgt" description="Hier vindt u straks praktische uitleg over veelvoorkomende verplichtingen uit de Arbowet en aanverwante regelgeving. De informatie is algemeen van aard. Of een verplichting op uw organisatie van toepassing is, hangt af van uw specifieke situatie." nextStep={{ href: '/advieswijzer', label: 'Verduidelijk uw vraag' }} />
}
