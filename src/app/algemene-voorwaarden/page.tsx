import type { Metadata } from 'next'
import { AuthShell, StatusMessage } from '@/components/auth/auth-shell'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Algemene voorwaarden | WorkMatchr',
  description: 'Status van de algemene voorwaarden van WorkMatchr.',
  alternates: { canonical: publicRoutes.terms },
  openGraph: { title: 'Algemene voorwaarden | WorkMatchr', description: 'Status van de algemene voorwaarden van WorkMatchr.', url: publicRoutes.terms },
  robots: { index: false, follow: true },
}

export default function TermsPage() { return <AuthShell title="De algemene voorwaarden worden voorbereid" intro="Hier leest u straks welke afspraken gelden voor het gebruik van WorkMatchr en de dienstverlening via het platform."><StatusMessage>De definitieve algemene voorwaarden zijn nog niet gepubliceerd. Deze pagina bevat daarom nog geen juridisch geldende voorwaarden.</StatusMessage></AuthShell> }
