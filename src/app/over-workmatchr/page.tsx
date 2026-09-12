import type { Metadata } from 'next'
import { PublicPlaceholderPage } from '@/components/public/public-placeholder-page'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Over WorkMatchr',
  description: 'Waarom WorkMatchr organisaties eerst helpt begrijpen en daarna pas verbindt.',
  alternates: { canonical: publicRoutes.about },
  openGraph: { title: 'Over WorkMatchr', description: 'Waarom WorkMatchr organisaties eerst helpt begrijpen en daarna pas verbindt.', url: publicRoutes.about },
  robots: { index: false, follow: true },
}

export default function AboutPage() {
  return <PublicPlaceholderPage title="Meer over WorkMatchr volgt" description="WorkMatchr helpt u uw vraag te beschrijven, zelf een deskundigheid of onderwerp te kiezen en vervolgens een opdracht te publiceren. Hier leest u straks meer over de uitgangspunten van het platform." nextStep={{ href: '/advieswijzer', label: 'Start de Advieswijzer' }} />
}
