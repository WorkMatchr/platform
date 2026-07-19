import type { Metadata } from 'next'
import { PublicPlaceholderPage } from '@/components/public/public-placeholder-page'

export const metadata: Metadata = { title: 'Kenniscentrum | WorkMatchr', description: 'Begrijpelijke informatie over arbeidsomstandigheden, veiligheid en gezondheid.' }

export default function KnowledgeCenterPage() {
  return <PublicPlaceholderPage title="Het kenniscentrum wordt voorbereid" description="Hier vindt u straks begrijpelijke en zorgvuldig onderbouwde informatie over arbeidsomstandigheden, veiligheid, gezondheid en duurzame inzetbaarheid. De inhoud wordt stapsgewijs uitgebreid en gekoppeld aan diensten, wettelijke verplichtingen, sectoren en veelgestelde vragen." nextStep={{ href: '/advieswijzer', label: 'Verduidelijk uw vraag' }} />
}
