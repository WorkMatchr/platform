import type { Metadata } from 'next'
import { PublicPlaceholderPage } from '@/components/public/public-placeholder-page'

export const metadata: Metadata = { title: 'Sectoren | WorkMatchr', description: 'Sectorgerichte informatie over arbeidsomstandigheden en veiligheid.' }

export default function SectorsPage() {
  return <PublicPlaceholderPage title="Informatie voor uw sector wordt voorbereid" description="Hier vindt u straks algemene aandachtspunten voor arbeidsomstandigheden en veiligheid binnen verschillende sectoren. De informatie helpt u relevante vragen voor uw eigen organisatie te herkennen, zonder sectorspecifieke conclusies voor uw situatie te trekken." nextStep={{ href: '/advieswijzer', label: 'Start bij uw situatie' }} />
}
