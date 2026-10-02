import type { Metadata } from 'next'
import { Section } from '@/components/layout/section'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { PublicLearningCatalog } from '@/components/public/public-learning-catalog'
import { ProcessSteps } from '@/components/public/process-steps'
import { KnowledgeCallToAction } from '@/components/public/knowledge-call-to-action'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'
import { publicLearning } from '@/content/public-learning'

const title = 'WorkMatchr-opleidingen: e-learning arbo | WorkMatchr'
const description = 'Online arbo-opleidingen over arbeidsveiligheid en gezond werken. Ontdek RI&E in de praktijk en onze opleidingen in ontwikkeling.'
export const metadata: Metadata = { title, description, alternates: { canonical: '/e-learning' }, openGraph: { title, description, url: '/e-learning' } }

export default function ElearningPage() {
  return <PublicPageLayout breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'E-learning' }]} eyebrow="WorkMatchr-opleidingen" title="E-learning voor veilig en gezond werken" description="Praktische online opleidingen die u straks in uw eigen tempo kunt volgen. RI&E in de praktijk is binnenkort beschikbaar. Onze overige opleidingen zijn in ontwikkeling. Deelnemen is nu nog niet mogelijk." heroActions={<LinkButton href="#aanbod">Bekijk het aanbod</LinkButton>}>
    <Section spacing="compact" aria-labelledby="how-it-works-title">
      <Heading as="h2" size="h2" id="how-it-works-title">Hoe werkt het?</Heading>
      <Text className="mt-4 text-text-secondary">Zo ziet leren via WorkMatchr er straks uit:</Text>
      <div className="mt-6"><ProcessSteps steps={[
        { title: 'Kies een opleiding', description: 'Bekijk het programma en ontdek welke opleiding aansluit bij uw werk.' },
        { title: 'Leer en oefen in uw eigen tempo', description: 'Volg online de hoofdstukken, werk met praktijkvoorbeelden en doe oefeningen.' },
        { title: 'Rond de opleiding af', description: 'RI&E in de praktijk sluit af met een eindtoets en certificaat van afronding. Voor de overige opleidingen wordt de toets- en certificaatvorm tijdens de ontwikkeling vastgesteld.' },
      ]} /></div>
    </Section>
    <Section spacing="compact" className="bg-surface" containerClassName="grid gap-6 md:grid-cols-2" aria-label="Leren als deelnemer of organisatie">
      <Card variant="subtle"><Heading as="h2" size="h2">Voor deelnemers</Heading><Text className="mt-4 text-text-secondary">Praktijkgerichte kennis voor uw dagelijkse werk. De toekomstige leeromgeving biedt interactieve oefeningen, het bewaren van voortgang en leren wanneer het u uitkomt.</Text></Card>
      <Card><Heading as="h2" size="h2">Voor organisaties</Heading><Text className="mt-4 text-text-secondary">Maak een gezamenlijke kennisbasis rond veilig en gezond werken. Voor RI&E in de praktijk is een pakket voor 5 deelnemers voorzien voor {publicLearning.teamPrice}. Centraal toegangsbeheer en het volgen van medewerkers zijn nog niet beschikbaar.</Text></Card>
    </Section>
    <Section id="aanbod" spacing="compact" aria-labelledby="offer-title">
      <Heading as="h2" size="h2" id="offer-title">Opleidingsaanbod</Heading>
      <Text className="mt-4 max-w-3xl text-text-secondary">Ontdek onze opleidingen in voorbereiding. RI&E in de praktijk is binnenkort beschikbaar; de overige opleidingen zijn in ontwikkeling. De aangekondigde prijzen betekenen niet dat deelname al mogelijk is.</Text>
      <PublicLearningCatalog />
    </Section>
    <Section spacing="compact"><KnowledgeCallToAction content={{ title: 'Ontwikkel kennis. Pas het toe in de praktijk.', description: 'Ontdek het programma, de toets en wat het certificaat betekent. Binnenkort beschikbaar.', primary: { label: 'Bekijk de opleiding', href: publicLearning.href }, secondary: { label: 'Bekijk onze diensten', href: '/diensten' } }} /></Section>
  </PublicPageLayout>
}
