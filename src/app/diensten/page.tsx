import type { Metadata } from 'next'
import { PublicPlaceholderPage } from '@/components/public/public-placeholder-page'

export const metadata: Metadata = { title: 'Diensten | WorkMatchr', description: 'Informatie over arbo- en veiligheidsdienstverlening via WorkMatchr.' }

export default function ServicesPage() {
  return <PublicPlaceholderPage title="Informatie over diensten wordt voorbereid" description="Hier vindt u straks begrijpelijke uitleg over arbo- en veiligheidsdiensten, wanneer deze relevant kunnen zijn en welke deskundigheid daarbij past. Zo kunt u zich oriënteren zonder vooraf al een specialist te hoeven kiezen." nextStep={{ href: '/advieswijzer', label: 'Start bij uw vraag' }} />
}
