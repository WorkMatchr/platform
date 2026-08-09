import type { Metadata } from 'next'
import { Section } from '@/components/layout/section'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Contact | WorkMatchr',
  description: 'Vind de juiste contactroute voor vragen over WorkMatchr, opdrachten, kennis, ondersteuning en privacy.',
  alternates: { canonical: publicRoutes.contact },
  openGraph: {
    title: 'Contact | WorkMatchr',
    description: 'Vind de juiste contactroute voor uw vraag.',
    url: publicRoutes.contact,
  },
}

const contactOptions = [
  {
    title: 'Algemene vragen',
    description: 'Heeft u een algemene vraag over WorkMatchr of weet u niet waar uw vraag thuishoort? Stuur ons dan een e-mail.',
    action: { label: 'Stuur een e-mail', href: 'mailto:contact@workmatchr.nl?subject=Algemene%20vraag' },
  },
  {
    title: 'Voor opdrachtgevers',
    description: 'Wilt u uw situatie verduidelijken of weten welke ondersteuning passend kan zijn? Begin bij uw vraag.',
    action: { label: 'Stel uw vraag', href: publicRoutes.adviceGuide },
  },
  {
    title: 'Voor professionals',
    description: 'Wilt u WorkMatchr gebruiken als professional of heeft u een vraag over uw dienstverlenersprofiel?',
    action: { label: 'Naar registratie', href: '/registreren?accountType=PROFESSIONAL' },
  },
  {
    title: 'Vragen over opdrachten',
    description: 'Heeft u een vraag over een bestaande opdracht? Log in en open de betreffende opdracht, zodat u vanuit de juiste context verder kunt.',
    action: { label: 'Naar mijn opdrachten', href: '/inloggen?returnTo=%2Fopdrachten' },
  },
  {
    title: 'Kenniscentrum',
    description: 'Zoekt u algemene vakinformatie over gezond en veilig werken, wettelijke verplichtingen of deskundigheid?',
    action: { label: 'Bekijk het kenniscentrum', href: publicRoutes.knowledge },
  },
  {
    title: 'Technische ondersteuning',
    description: 'Werkt een pagina of functie niet zoals verwacht? Vermeld de route, het tijdstip en wat u probeerde te doen. Deel geen wachtwoorden of gevoelige gegevens.',
    action: { label: 'Meld een technisch probleem', href: 'mailto:contact@workmatchr.nl?subject=Technische%20ondersteuning' },
  },
] as const

export default function ContactPage() {
  return (
    <PublicPageLayout
      breadcrumbs={[{ label: 'Home', href: publicRoutes.home }, { label: 'Contact' }]}
      eyebrow="Contact"
      title="Waar kunnen wij u mee helpen?"
      description="Kies de route die het beste bij uw vraag past. Zo komt uw vraag direct in de juiste context terecht."
      compactHero
    >
      <Section spacing="compact" containerClassName="space-y-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-contact-layout="responsive">
          {contactOptions.map((option) => (
            <Card key={option.title} className="flex h-full min-w-0 flex-col !p-5 shadow-none sm:!p-6">
              <Heading as="h2" size="h3" className="break-words">{option.title}</Heading>
              <Text className="mt-2 flex-1 text-text-secondary">{option.description}</Text>
              <LinkButton href={option.action.href} className="mt-4 w-full sm:w-fit">{option.action.label}</LinkButton>
            </Card>
          ))}
        </div>

        <Card variant="subtle" className="!p-5 shadow-none sm:!p-6">
          <Heading as="h2" size="h3">Privacy en klachten</Heading>
          <Text className="mt-2 max-w-3xl text-text-secondary">
            Heeft uw vraag betrekking op privacy, de verwerking van persoonsgegevens of een klacht? Lees eerst onze privacy-informatie of neem rechtstreeks contact op. Deel per e-mail alleen gegevens die nodig zijn om uw melding te behandelen.
          </Text>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkButton href={publicRoutes.privacy} variant="outline" className="w-full sm:w-auto">Lees de privacy-informatie</LinkButton>
            <LinkButton href="mailto:contact@workmatchr.nl?subject=Privacy%20of%20klacht" className="w-full sm:w-auto">Meld een privacyvraag of klacht</LinkButton>
          </div>
        </Card>
      </Section>
    </PublicPageLayout>
  )
}
