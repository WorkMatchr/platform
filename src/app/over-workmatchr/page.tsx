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
  return <PublicPlaceholderPage title="Meer over WorkMatchr volgt" description="Hier leest u straks waarom WorkMatchr organisaties eerst helpt hun vraag te begrijpen en pas daarna ondersteunt bij het vinden van passende deskundigheid. Zo ziet u welke uitgangspunten aan de begeleiding en verbinding ten grondslag liggen." nextStep={{ href: '/advieswijzer', label: 'Start de Advieswijzer' }} />
}
