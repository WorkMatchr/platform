import type { Metadata } from 'next'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { LinkButton } from '@/components/ui/link-button'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Voor opdrachtgevers | WorkMatchr',
  description: 'Maak uw Arbo- of veiligheidsvraag concreet en vind passende professionele ondersteuning via WorkMatchr.',
  alternates: { canonical: publicRoutes.clients },
  openGraph: { title: 'Voor opdrachtgevers | WorkMatchr', description: 'Van hulpvraag naar passende professional.', url: publicRoutes.clients },
}

export default function ClientsPage() {
  return <PublicPageLayout compactHero breadcrumbs={[{ label: 'Home', href: publicRoutes.home }, { label: 'Voor opdrachtgevers' }]}
    eyebrow="Voor opdrachtgevers" title="Van hulpvraag naar passende professional"
    description="Heeft u een vraag over arbo of veiligheid? WorkMatchr helpt u uw hulpvraag concreet te maken en passende professionele ondersteuning te vinden."
    heroActions={<><LinkButton href={publicRoutes.adviceGuide}>Start de Advieswijzer</LinkButton><LinkButton href={publicRoutes.services} variant="outline">Bekijk diensten</LinkButton></>}>
    <Section spacing="compact">
      <Heading as="h2" size="h2">Eerst uw vraag, daarna de juiste ondersteuning</Heading>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card><Heading as="h3" size="h3">Beschrijf uw situatie</Heading><Text className="mt-3 text-text-secondary">Begin bij wat er speelt in uw organisatie. U hoeft vooraf nog niet te weten welke deskundigheid u nodig heeft.</Text></Card>
        <Card><Heading as="h3" size="h3">Maak uw hulpvraag concreet</Heading><Text className="mt-3 text-text-secondary">De Advieswijzer helpt u uw vraag te beschrijven en een deskundigheid of onderwerp te kiezen. Van daaruit kunt u verder naar een opdracht.</Text></Card>
        <Card><Heading as="h3" size="h3">Vind professionele ondersteuning</Heading><Text className="mt-3 text-text-secondary">Via WorkMatchr brengt u uw opdracht onder de aandacht van passende professionals. U houdt zelf de regie over uw keuze.</Text></Card>
      </div>
      <Text className="mt-6 max-w-3xl text-text-secondary">WorkMatchr brengt vraag en expertise bij elkaar. De definitieve aanpak, prijs en planning spreekt u af met de professional.</Text>
    </Section>
  </PublicPageLayout>
}
