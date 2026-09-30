import type { Metadata } from 'next'
import { Section } from '@/components/layout/section'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { PublicContentCard } from '@/components/public/public-content-card'
import { ProcessSteps } from '@/components/public/process-steps'
import { KnowledgeCallToAction } from '@/components/public/knowledge-call-to-action'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'

const title = 'E-learning arbo: veilig en gezond werken | WorkMatchr'
const description = 'Ontdek praktische e-learning over arbeidsveiligheid en gezond werken. Lees meer over onze online arbo-opleidingen in ontwikkeling.'
const loginHref = '/inloggen'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/e-learning' },
  openGraph: { title, description, url: '/e-learning' },
}

export default function ElearningPage() {
  return (
    <PublicPageLayout
      breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'E-learning' }]}
      eyebrow="E-learning & opleidingen"
      title="E-learning voor veilig en gezond werken"
      description="Praktische online opleidingen die deelnemers straks in hun eigen tempo kunnen volgen via WorkMatchr. Het aanbod en de leeromgeving zijn in ontwikkeling en nog niet beschikbaar."
      heroActions={<><LinkButton href="#aanbod">Bekijk het aanbod</LinkButton><LinkButton href={loginHref} variant="outline">Inloggen</LinkButton></>}
    >
      <Section spacing="compact" aria-labelledby="how-it-works-title">
        <Heading as="h2" size="h2" id="how-it-works-title">Hoe werkt het?</Heading>
        <Text className="mt-4 text-text-secondary">Zo willen we het leren via WorkMatchr mogelijk maken:</Text>
        <div className="mt-6"><ProcessSteps steps={[
          { title: 'Kies een opleiding', description: 'Bekijk het aanbod en kies een onderwerp dat aansluit bij uw praktijk.' },
          { title: 'Volg de hoofdstukken en oefeningen', description: 'Neem de inhoud zelfstandig door en pas uw kennis toe in interactieve oefeningen.' },
          { title: 'Houd uw voortgang bij', description: 'Rond de opleiding af en ga later verder waar u gebleven bent. Het bewaren van voortgang en cursusafronding zijn nog niet beschikbaar.' },
        ]} /></div>
      </Section>
      <Section spacing="compact" className="bg-surface" containerClassName="grid gap-6 md:grid-cols-2" aria-label="Leren als deelnemer of organisatie">
        <Card variant="subtle">
          <Heading as="h2" size="h2">Voor deelnemers</Heading>
          <Text className="mt-4 text-text-secondary">We werken aan een eigen leeromgeving waarin u uw voortgang kunt bewaren, interactieve oefeningen kunt doen en kunt leren wanneer het u uitkomt. Deze mogelijkheden zijn nog niet beschikbaar.</Text>
        </Card>
        <Card>
          <Heading as="h2" size="h2">Voor organisaties</Heading>
          <Text className="mt-4 text-text-secondary">Het toekomstige aanbod is ook bedoeld voor medewerkers die willen leren over veilig en gezond werken.</Text>
          <Text className="mt-4 text-text-secondary">Medewerkers centraal toegang geven, opleidingen voor uw organisatie beschikbaar maken en hun voortgang als organisatie volgen is nog niet beschikbaar. We onderzoeken welke ondersteuning organisaties hierbij nodig hebben.</Text>
        </Card>
      </Section>
      <Section id="aanbod" spacing="compact" aria-labelledby="offer-title">
        <Heading as="h2" size="h2" id="offer-title">Opleidingsaanbod</Heading>
        <Text className="mt-4 max-w-3xl text-text-secondary">We werken aan praktische online arbo-opleidingen. Er zijn op dit moment nog geen opleidingen beschikbaar via deze website. Uitbreiding van het aanbod volgt.</Text>
        {/* Public catalog integration point: replace this editorial preview only when a
            public read flow exists. Do not expose user-scoped Learning queries or seed answers. */}
        <div className="mt-6 max-w-3xl">
          <PublicContentCard
            headingLevel="h3"
            title="RI&E in de praktijk"
            status="In ontwikkeling"
            description="Praktijkgerichte kennis over arbeidsveiligheid, arbo en gezond werken. Hier verschijnt later het opleidingsaanbod, waaronder informatie over een RI&E-opleiding."
          />
        </div>
      </Section>
      <Section spacing="compact">
        <KnowledgeCallToAction content={{
          title: 'Ontwikkel kennis. Pas het toe in de praktijk.',
          description: 'Bekijk wat er in ontwikkeling is. Heeft u al een WorkMatchr-account? Dan kunt u inloggen op uw account.',
          primary: { label: 'Bekijk het aanbod', href: '/e-learning#aanbod' },
          secondary: { label: 'Inloggen', href: loginHref },
        }} />
      </Section>
    </PublicPageLayout>
  )
}
