import type { Metadata } from 'next'
import Link from 'next/link'
import { publicHomepageContent } from '@/content/public-homepage'
import { Section } from '@/components/layout/section'
import { KnowledgeCategoryCard } from '@/components/public/knowledge-category-card'
import { ProcessSteps } from '@/components/public/process-steps'
import { PublicCallToAction } from '@/components/public/public-call-to-action'
import { PublicHero } from '@/components/public/public-hero'
import { SectorPreviewCard } from '@/components/public/sector-preview-card'
import { SituationGrid } from '@/components/public/situation-grid'
import { TrustPrinciples } from '@/components/public/trust-principles'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'

export const metadata: Metadata = {
  title: 'WorkMatchr | Uw digitale arbo-adviseur',
  description:
    'WorkMatchr helpt organisaties hun arbo- en veiligheidsvraag te begrijpen, relevante verplichtingen te herkennen en passende specialisten te vinden.',
  alternates: { canonical: '/' },
}

export default function HomePage() {
  const content = publicHomepageContent

  return (
    <>
      <PublicHero hero={content.hero} process={content.process} />

      <Section spacing="compact" className="border-b border-border bg-surface">
        <Card variant="subtle" className="grid items-center gap-6 shadow-none md:grid-cols-[1fr_auto]">
          <div>
            <Heading as="h2" size="h3">{content.uncertainty.title}</Heading>
            <Text className="mt-3 max-w-3xl text-text-secondary">{content.uncertainty.description}</Text>
          </div>
          <LinkButton href={content.uncertainty.action.href}>{content.uncertainty.action.label}</LinkButton>
        </Card>
      </Section>

      <Section id="herkenbare-situaties" className="scroll-mt-24">
        <div className="max-w-3xl">
          <Badge variant="neutral">Begin bij Uw situatie</Badge>
          <Heading className="mt-4">Herkent U Uw situatie?</Heading>
          <Text size="lg" className="mt-5 text-text-secondary">
            Kies wat het dichtst bij Uw vraag komt. U hoeft nog niet te weten welke dienst of deskundige U nodig heeft.
          </Text>
        </div>
        <div className="mt-10"><SituationGrid situations={content.situations} /></div>
      </Section>

      <Section id="hoe-workmatchr-werkt" className="scroll-mt-24 border-y border-border bg-surface">
        <div className="max-w-3xl">
          <Badge>Hoe WorkMatchr werkt</Badge>
          <Heading className="mt-4">Eerst begrijpen. Daarna verbinden.</Heading>
          <Text size="lg" className="mt-5 text-text-secondary">
            Onafhankelijke vraagverheldering komt vóór matching. Een eventuele verbinding met aanbieders is een vervolgstap en nooit het startpunt.
          </Text>
        </div>
        <div className="mt-10"><ProcessSteps steps={content.steps} /></div>
        <Text size="sm" className="mt-6 max-w-4xl text-text-secondary">
          Algemene uitleg is geen garantie dat een specifieke oplossing in Uw situatie juridisch verplicht of inhoudelijk passend is. Laat Uw situatie waar nodig beoordelen door een bevoegde deskundige.
        </Text>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Badge variant="neutral">Veelgestelde vragen</Badge>
            <Heading className="mt-4">Veelgestelde vragen van werkgevers</Heading>
            <Text className="mt-5 text-text-secondary">Onderwerpen waar werkgevers vaak vragen over hebben.</Text>
          </div>
          <Card className="shadow-none">
            <ul className="divide-y divide-border">
              {content.frequentlyAsked.map((item) => (
                <li key={item.title}>
                  <Link href={item.href} className="flex min-h-14 items-center justify-between gap-4 rounded-control py-3 font-semibold text-brand-dark hover:text-brand-primary-hover">
                    {item.title}<span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section className="border-y border-border bg-surface">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge>Zelf verder lezen</Badge>
            <Heading className="mt-4">Betrouwbare uitleg voor Uw organisatie</Heading>
            <Text size="lg" className="mt-5 text-text-secondary">
              In het kenniscentrum vindt U begrijpelijke informatie over arbeidsomstandigheden, veiligheid, gezondheid en duurzame inzetbaarheid.
            </Text>
          </div>
          <LinkButton href="/kenniscentrum" variant="outline">Naar het kenniscentrum</LinkButton>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {content.knowledgeCategories.map((category) => <KnowledgeCategoryCard key={category.title} {...category} />)}
        </div>
      </Section>

      <Section>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge variant="neutral">Sectoren</Badge>
            <Heading className="mt-4">Informatie passend bij Uw sector</Heading>
            <Text size="lg" className="mt-5 text-text-secondary">Elke sector kent een eigen context. De sectorinformatie wordt in een latere module inhoudelijk uitgebreid.</Text>
          </div>
          <LinkButton href="/sectoren" variant="outline">Bekijk alle sectoren</LinkButton>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {content.sectors.map((sector) => <SectorPreviewCard key={sector.title} {...sector} />)}
        </div>
      </Section>

      <Section className="border-y border-border bg-brand-primary-subtle">
        <div className="max-w-3xl">
          <Badge variant="success">Waarom WorkMatchr</Badge>
          <Heading className="mt-4">Begeleiding vanuit Uw vraag</Heading>
        </div>
        <div className="mt-10"><TrustPrinciples principles={content.principles} /></div>
      </Section>

      <PublicCallToAction {...content.closing} />
    </>
  )
}
