import type { Metadata } from 'next'
import { PublicPlaceholderPage } from '@/components/public/public-placeholder-page'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Contact | WorkMatchr',
  description: 'Contactinformatie van WorkMatchr.',
  alternates: { canonical: publicRoutes.contact },
  openGraph: { title: 'Contact | WorkMatchr', description: 'Contactinformatie van WorkMatchr.', url: publicRoutes.contact },
  robots: { index: false, follow: true },
}

export default function ContactPage() {
  return <PublicPlaceholderPage title="De contactpagina wordt voorbereid" description="Hier vindt u straks de contactmogelijkheden van WorkMatchr en uitleg over waar u met verschillende vragen terechtkunt. Op dit moment verzamelt deze pagina nog geen contactgegevens of berichten." />
}
