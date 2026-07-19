import type { Metadata } from 'next'
import { PublicPlaceholderPage } from '@/components/public/public-placeholder-page'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Cookies | WorkMatchr',
  description: 'Status van de cookie-informatie van WorkMatchr.',
  alternates: { canonical: publicRoutes.cookies },
  openGraph: { title: 'Cookies | WorkMatchr', description: 'Status van de cookie-informatie van WorkMatchr.', url: publicRoutes.cookies },
  robots: { index: false, follow: true },
}

export default function CookiesPage() {
  return <PublicPlaceholderPage title="Cookie-informatie wordt voorbereid" description="Hier leest u straks welke cookies WorkMatchr gebruikt, voor welk doel en welke keuzes u daarbij heeft. WorkMatchr gebruikt op dit moment geen analytics of tracking voor interacties op deze publieke pagina’s." />
}
