import type { Metadata } from 'next'
import { publicHomepageContent } from '@/content/public-homepage'
import { knowledgeOverview, legalOverview, sectorOverview, serviceOverview } from '@/content/public-overviews'
import { Section } from '@/components/layout/section'
import { KnowledgeCarousel } from '@/components/public/knowledge-carousel'
import { ProcessSteps } from '@/components/public/process-steps'
import { ObligationCarousel } from '@/components/public/obligation-carousel'
import { PublicCallToAction } from '@/components/public/public-call-to-action'
import { PublicContentCard } from '@/components/public/public-content-card'
import { PublicHero } from '@/components/public/public-hero'
import { SituationGrid } from '@/components/public/situation-grid'
import { TrustPrinciples } from '@/components/public/trust-principles'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'

export const metadata: Metadata = {
  title: 'Waarmee kunnen wij u helpen? | WorkMatchr',
  description:
    'Verduidelijk uw vraag over arbeidsomstandigheden, veiligheid of gezondheid en vind relevante kennis, verplichtingen en dienstverlening.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Waarmee kunnen wij u helpen? | WorkMatchr',
    description:
      'Begin bij uw situatie en vind relevante kennis, wettelijke context en passende arbo- en veiligheidsdienstverlening.',
    url: '/',
    type: 'website',
  },
}

export default function HomePage() {
  const content = publicHomepageContent
  const featuredServices = serviceOverview.slice(0, 3)
  const obligationCarouselItems = legalOverview.filter((topic) => topic.href !== undefined)
  const knowledgeCarouselItems = knowledgeOverview.filter((article) => article.href !== undefined)

  return (
    <>
      <PublicHero hero={content.hero} />

      <Section spacing="compact" id="hoe-workmatchr-helpt" aria-labelledby="process-title" className="scroll-mt-24">
        <div className="max-w-3xl">
          <Badge variant="neutral">Hoe WorkMatchr helpt</Badge>
          <Heading id="process-title" className="mt-4">Van vraag naar een passende vervolgstap</Heading>
          <Text size="lg" className="mt-4 text-text-secondary">
            WorkMatchr helpt u informatie en mogelijke oplossingen te ordenen. De publieke homepage selecteert niet automatisch een aanbieder.
          </Text>
        </div>
        <div className="mt-8"><ProcessSteps steps={content.steps} /></div>
      </Section>

      <Section spacing="compact" className="border-y border-border bg-surface-subtle">
        <div className="grid items-stretch gap-6 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col rounded-card border border-border bg-surface p-5 sm:p-6">
            <Badge>Wettelijke verplichtingen</Badge>
            <Heading className="mt-4">Wat moet uw organisatie regelen?</Heading>
            <Text className="mt-3 text-text-secondary">
              Welke verplichtingen gelden, hangt af van uw organisatie, werkzaamheden en risico’s.
            </Text>
            <div className="mt-4">
              <ObligationCarousel items={obligationCarouselItems} />
            </div>
            <div className="mt-auto pt-4"><LinkButton href="/wettelijke-verplichtingen" variant="outline">Bekijk alle verplichtingen</LinkButton></div>
          </div>

          <div className="flex min-w-0 flex-col rounded-card border border-border bg-surface p-5 sm:p-6">
            <Badge variant="neutral">Kenniscentrum</Badge>
            <Heading className="mt-4">Een onderbouwd antwoord op uw vraag</Heading>
            <Text className="mt-3 text-text-secondary">
              In het kenniscentrum vindt u betrouwbare, herleidbare algemene vakinformatie die zorgvuldig wordt uitgebreid.
            </Text>
            <div className="mt-4">
              <KnowledgeCarousel items={knowledgeCarouselItems} />
            </div>
            <div className="mt-auto pt-4"><LinkButton href="/kenniscentrum" variant="outline">Ga naar het kenniscentrum</LinkButton></div>
          </div>
        </div>
      </Section>

      <Section
        id="situaties"
        tabIndex={-1}
        aria-labelledby="situations-title"
        className="scroll-mt-24 focus:outline-none"
        spacing="compact"
      >
        <div className="max-w-3xl">
          <Badge variant="neutral">Begin bij uw situatie</Badge>
          <Heading id="situations-title" className="mt-4">Waar loopt u tegenaan?</Heading>
          <Text size="lg" className="mt-5 text-text-secondary">
            Kies wat het dichtst bij uw vraag komt. U hoeft nog niet te weten welke dienst of deskundige u nodig heeft.
          </Text>
        </div>
        <div className="mt-8"><SituationGrid situations={content.situations} /></div>
        <Card className="mt-6 flex flex-col gap-4 !p-5 shadow-none sm:flex-row sm:items-center sm:justify-between sm:!p-6">
          <div className="max-w-3xl">
            <Heading as="h3" size="h3">{content.adviceGuideEntry.title}</Heading>
            <Text className="mt-2 text-text-secondary">{content.adviceGuideEntry.description}</Text>
          </div>
          <LinkButton href={content.adviceGuideEntry.href} className="shrink-0">
            {content.adviceGuideEntry.label}
          </LinkButton>
        </Card>
      </Section>

      <Section spacing="compact" className="border-y border-border bg-surface">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge>Gericht zoeken</Badge>
            <Heading className="mt-4">Weet u al welke ondersteuning u zoekt?</Heading>
            <Text size="lg" className="mt-5 text-text-secondary">
              Bekijk beschikbare dienstverlening of oriënteer u op onderwerpen die nog inhoudelijk worden uitgebreid.
            </Text>
          </div>
          <LinkButton href="/diensten" variant="outline">Bekijk alle diensten</LinkButton>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {featuredServices.map((service) => (
            <PublicContentCard key={service.title} {...service} headingLevel="h3" linkLabel={`Bekijk ${service.title}`} />
          ))}
        </div>
      </Section>

      <Section spacing="compact" className="border-y border-border bg-surface">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge>Sectoren</Badge>
            <Heading className="mt-4">Werk en risico’s verschillen per sector</Heading>
            <Text size="lg" className="mt-5 text-text-secondary">
              Bekijk welke aandachtspunten vaak spelen in verschillende werkomgevingen. Uw werkzaamheden en organisatiecontext blijven altijd bepalend.
            </Text>
          </div>
          <LinkButton href="/sectoren" variant="outline">Bekijk het sectoroverzicht</LinkButton>
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sectorOverview.map((sector) => (
            <li key={sector.title}>
              <PublicContentCard {...sector} headingLevel="h3" linkLabel={`Bekijk ${sector.title}`} compact />
            </li>
          ))}
        </ul>
      </Section>

      <Section spacing="compact" className="border-y border-border bg-brand-primary-subtle">
        <div className="max-w-3xl">
          <Badge variant="success">Onze werkwijze</Badge>
          <Heading className="mt-4">Begrijpen en onderbouwen vóór verbinden</Heading>
        </div>
        <div className="mt-10"><TrustPrinciples principles={content.principles} /></div>
      </Section>

      <PublicCallToAction {...content.closing} />
    </>
  )
}
