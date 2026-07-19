import type { Metadata } from 'next'
import { publicHomepageContent } from '@/content/public-homepage'
import { legalOverview, sectorOverview, serviceOverview } from '@/content/public-overviews'
import { getKnowledgeArticleBySlug } from '@/content/knowledge/articles'
import { Section } from '@/components/layout/section'
import { ProcessSteps } from '@/components/public/process-steps'
import { PublicCallToAction } from '@/components/public/public-call-to-action'
import { PublicContentCard } from '@/components/public/public-content-card'
import { PublicHero } from '@/components/public/public-hero'
import { PublicStatusNotice } from '@/components/public/public-status-notice'
import { SituationGrid } from '@/components/public/situation-grid'
import { TrustPrinciples } from '@/components/public/trust-principles'
import { Badge } from '@/components/ui/badge'
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

const rieQuestionArticle = getKnowledgeArticleBySlug('moet-ik-een-rie-hebben')!

export default function HomePage() {
  const content = publicHomepageContent
  const featuredServices = serviceOverview.slice(0, 3)
  const featuredLegalTopic = legalOverview[0]

  return (
    <>
      <PublicHero hero={content.hero} process={content.process} />

      <Section
        id="situaties"
        tabIndex={-1}
        aria-labelledby="situations-title"
        className="scroll-mt-24 focus:outline-none"
      >
        <div className="max-w-3xl">
          <Badge variant="neutral">Begin bij uw situatie</Badge>
          <Heading id="situations-title" className="mt-4">Waar loopt u tegenaan?</Heading>
          <Text size="lg" className="mt-5 text-text-secondary">
            Kies wat het dichtst bij uw vraag komt. U hoeft nog niet te weten welke dienst of deskundige u nodig heeft.
          </Text>
        </div>
        <div className="mt-10"><SituationGrid situations={content.situations} /></div>
      </Section>

      <Section className="border-y border-border bg-surface">
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
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {featuredServices.map((service) => (
            <PublicContentCard key={service.title} {...service} headingLevel="h3" linkLabel={`Bekijk ${service.title}`} />
          ))}
        </div>
      </Section>

      <Section id="hoe-workmatchr-helpt" aria-labelledby="process-title" className="scroll-mt-24">
        <div className="max-w-3xl">
          <Badge variant="neutral">Hoe WorkMatchr helpt</Badge>
          <Heading id="process-title" className="mt-4">Van vraag naar een passende vervolgstap</Heading>
          <Text size="lg" className="mt-5 text-text-secondary">
            WorkMatchr helpt u informatie en mogelijke oplossingen te ordenen. De publieke homepage selecteert niet automatisch een aanbieder.
          </Text>
        </div>
        <div className="mt-10"><ProcessSteps steps={content.steps} /></div>
      </Section>

      <Section className="border-y border-border bg-surface-subtle">
        <div className="grid items-start gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="max-w-xl">
            <Badge>Wettelijke verplichtingen</Badge>
            <Heading className="mt-4">Wat moet uw organisatie regelen?</Heading>
            <Text size="lg" className="mt-5 text-text-secondary">
              Welke verplichtingen gelden, hangt af van uw organisatie, werkzaamheden en risico’s.
            </Text>
            <div className="mt-7"><LinkButton href="/wettelijke-verplichtingen" variant="outline">Bekijk alle verplichtingen</LinkButton></div>
          </div>
          <div className="space-y-5">
            <PublicContentCard {...featuredLegalTopic} headingLevel="h3" linkLabel="Lees de wettelijke context" />
            <PublicStatusNotice title="Algemene informatie" description="Deze informatie helpt u gerichte vragen te stellen, maar vormt geen individueel juridisch advies voor uw organisatie." headingLevel="h3" />
          </div>
        </div>
      </Section>

      <Section>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="neutral">Uitgelichte kennis</Badge>
            <Heading className="mt-4">Een onderbouwd antwoord op uw vraag</Heading>
            <Text size="lg" className="mt-5 text-text-secondary">
              Het kenniscentrum groeit stap voor stap. We publiceren alleen onderwerpen die zorgvuldig zijn onderbouwd.
            </Text>
          </div>
          <LinkButton href="/kenniscentrum" variant="outline">Naar het kenniscentrum</LinkButton>
        </div>
        <div className="mt-10 max-w-2xl">
          <PublicContentCard
            title={rieQuestionArticle.title}
            description={rieQuestionArticle.summary}
            href="/kenniscentrum/moet-ik-een-rie-hebben"
            linkLabel="Lees de uitleg"
            status="Gepubliceerd · bronnen gecontroleerd"
            headingLevel="h3"
          />
        </div>
      </Section>

      <Section className="border-y border-border bg-surface">
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
              <PublicContentCard {...sector} headingLevel="h3" linkLabel={`Bekijk ${sector.title}`} />
            </li>
          ))}
        </ul>
      </Section>

      <Section className="border-y border-border bg-brand-primary-subtle">
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
