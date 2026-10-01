import type { Metadata } from 'next'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { LinkButton } from '@/components/ui/link-button'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Voor Arbo-professionals | WorkMatchr',
  description: 'Maak uw expertise zichtbaar met een professioneel profiel en bekijk passende opdrachten via WorkMatchr.',
  alternates: { canonical: publicRoutes.professionals },
  openGraph: { title: 'Voor Arbo-professionals | WorkMatchr', description: 'WorkMatchr brengt vraag en professionele expertise bij elkaar.', url: publicRoutes.professionals },
}

export default function ProfessionalsPage() {
  return <PublicPageLayout compactHero breadcrumbs={[{ label: 'Home', href: publicRoutes.home }, { label: 'Voor professionals' }]}
    eyebrow="Voor professionals" title="Breng uw expertise bij passende opdrachten"
    description="WorkMatchr brengt Arbo- en veiligheidsvragen van organisaties samen met professionele expertise. Maak uw profiel compleet en bekijk welke opdrachten bij uw deskundigheid passen."
    heroActions={<LinkButton href="/registreren?accountType=PROFESSIONAL">Meld je aan als professional</LinkButton>}>
    <Section spacing="compact">
      <Heading as="h2" size="h2">Van professioneel profiel naar relevante opdrachten</Heading>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card><Heading as="h3" size="h3">Maak uw profiel compleet</Heading><Text className="mt-3 text-text-secondary">Leg de deskundigheid, kwalificaties en het werkgebied van uw professionele organisatie vast in uw dienstverlenersprofiel.</Text></Card>
        <Card><Heading as="h3" size="h3">Maak uw expertise zichtbaar</Heading><Text className="mt-3 text-text-secondary">Uw profiel helpt WorkMatchr om vraag en expertise bij elkaar te brengen. Deskundigheid wordt gecontroleerd voordat deze voor passende opdrachten wordt gebruikt.</Text></Card>
        <Card><Heading as="h3" size="h3">Reageer op relevante opdrachten</Heading><Text className="mt-3 text-text-secondary">Bekijk opdrachten die aansluiten op de gecontroleerde deskundigheid en het werkgebied van uw organisatie. Bij beschikbare opdrachten kunt u uw interesse tonen.</Text></Card>
      </div>
      <Text className="mt-6 max-w-3xl text-text-secondary">Welke opdrachten beschikbaar zijn, hangt af van de vragen van opdrachtgevers en uw profiel. Aanmelden geeft geen garantie op opdrachten. Voor gebruik richt u na registratie uw organisatie en profiel in.</Text>
    </Section>
  </PublicPageLayout>
}
