import type { Metadata } from 'next'
import { AuthShell, StatusMessage } from '@/components/auth/auth-shell'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Privacy | WorkMatchr',
  description: 'Status van de privacy-informatie van WorkMatchr.',
  alternates: { canonical: publicRoutes.privacy },
  openGraph: { title: 'Privacy | WorkMatchr', description: 'Status van de privacy-informatie van WorkMatchr.', url: publicRoutes.privacy },
  robots: { index: false, follow: true },
}

export default function PrivacyPage() { return <AuthShell title="De privacyverklaring wordt voorbereid" intro="Hier leest u straks welke persoonsgegevens WorkMatchr verwerkt, waarom dat nodig is en welke rechten u heeft."><StatusMessage>De definitieve privacyverklaring is nog niet gepubliceerd. WorkMatchr verwerkt voor een persoonlijk account alleen de gegevens die nodig zijn om het account veilig te gebruiken.</StatusMessage></AuthShell> }
