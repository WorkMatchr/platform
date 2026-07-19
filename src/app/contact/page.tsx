import type { Metadata } from 'next'
import { PublicPlaceholderPage } from '@/components/public/public-placeholder-page'

export const metadata: Metadata = { title: 'Contact | WorkMatchr', description: 'Contactinformatie van WorkMatchr.' }

export default function ContactPage() {
  return <PublicPlaceholderPage title="De contactpagina wordt voorbereid" description="Hier vindt u straks de contactmogelijkheden van WorkMatchr en uitleg over waar u met verschillende vragen terechtkunt. Op dit moment verzamelt deze pagina nog geen contactgegevens of berichten." />
}
