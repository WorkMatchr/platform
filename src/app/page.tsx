import { ProcessVisual } from '@/components/illustrations/process-visual'
import { Section } from '@/components/layout/section'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { IconContainer } from '@/components/ui/icon-container'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'

const questionExamples = [
  'Ik zoek een hogere veiligheidskundige.',
  'Onze RI&E is verlopen.',
  'We groeien snel. Wat moeten wij regelen?',
  'Wij willen een PMO organiseren.',
  'We zoeken ondersteuning bij ziekteverzuim.',
]

const situations = [
  {
    title: 'Uw organisatie groeit',
    description: 'Nieuwe medewerkers, locaties of werkzaamheden brengen andere arboverplichtingen met zich mee.',
  },
  {
    title: 'Uw RI&E ontbreekt of is verlopen',
    description: 'U wilt weten wat nodig is om risico’s opnieuw zorgvuldig in kaart te brengen.',
  },
  {
    title: 'Ziekteverzuim vraagt aandacht',
    description: 'U zoekt passende ondersteuning, maar weet nog niet welke dienstverlening daarbij hoort.',
  },
  {
    title: 'U zoekt specifieke deskundigheid',
    description: 'Bijvoorbeeld een bedrijfsarts, arbodienst, PMO of hogere veiligheidskundige.',
  },
]

const steps = [
  ['01', 'Beschrijf Uw situatie', 'Vertel in gewone woorden wat er binnen Uw organisatie speelt.'],
  ['02', 'Wij verduidelijken de hulpvraag', 'De intake stelt gerichte vragen die nodig zijn om Uw situatie te begrijpen.'],
  ['03', 'Wij selecteren maximaal drie passende specialisten', 'De selectie sluit aan op de oplossing die bij Uw vraag past.'],
  ['04', 'U kiest zelf', 'U vergelijkt de passende aanbieders en houdt zelf de regie over Uw keuze.'],
] as const

const trustReasons = [
  'De selectie is onafhankelijk en inhoudelijk.',
  'Er zijn geen betaalde voorkeursposities.',
  'U ontvangt maximaal drie relevante aanbieders.',
  'U bepaalt zelf met wie U verdergaat.',
  'Een menselijke beheerder kan later bij uitzonderingen ingrijpen.',
  'WorkMatchr richt zich specifiek op arbo en veiligheid.',
]

const audiences = [
  {
    id: 'voor-opdrachtgevers',
    label: 'Voor opdrachtgevers',
    title: 'Van situatie naar een overzichtelijke keuze',
    points: ['Beschrijf Uw situatie', 'Doorloop een gerichte intake', 'Ontvang een overzichtelijke selectie', 'Kies zelf'],
    cta: 'Start Uw hulpvraag',
    href: '/hulpvragen/nieuw',
  },
  {
    id: 'voor-aanbieders',
    label: 'Voor aanbieders',
    title: 'Alleen opdrachten die bij Uw expertise passen',
    points: ['Alleen relevante opdrachten', 'Objectieve selectie', 'Geen betaalde voorkeurspositie', 'Credits volgen in een latere module'],
    cta: 'Lees meer voor aanbieders',
    href: '#voor-aanbieders',
  },
] as const

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm leading-6 text-text-secondary">
      <span aria-hidden="true" className="mt-1 inline-grid size-5 shrink-0 place-items-center rounded-full bg-success/10 font-bold text-success">
        ✓
      </span>
      <span>{children}</span>
    </li>
  )
}

export default function HomePage() {
  return (
    <>
      <Section
        id="intake"
        className="scroll-mt-8 overflow-hidden border-b border-border bg-brand-primary-subtle"
        containerClassName="grid items-center gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16"
      >
        <div>
          <Badge className="mb-6">Digitale arbo-adviseur in ontwikkeling</Badge>
          <Heading as="h1" size="display" className="max-w-3xl text-brand-dark">
            Waarmee kunnen wij U helpen?
          </Heading>
          <Text size="lg" className="mt-6 max-w-2xl text-text-secondary">
            Vertel ons waar Uw organisatie tegenaan loopt. WorkMatchr helpt U eerst de juiste oplossing te
            bepalen en brengt U daarna onafhankelijk in contact met maximaal drie passende specialisten.
          </Text>

          <div className="mt-9 rounded-card border border-border bg-surface p-4 shadow-card sm:p-5">
            <label htmlFor="intake-question" className="block text-sm font-semibold text-brand-dark">
              Beschrijf kort Uw vraag of situatie
            </label>
            <textarea
              id="intake-question"
              name="intake-question"
              rows={4}
              placeholder="Bijvoorbeeld: Onze RI&E is verlopen. Wat moeten wij regelen?"
              className="mt-3 min-h-32 w-full resize-y rounded-control border border-border bg-surface px-4 py-3 text-base text-text-primary placeholder:text-text-secondary/80 focus:border-focus"
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Text size="sm" className="text-text-secondary">
                De intake is beschikbaar na inloggen. De invoer hierboven is een voorbeeld.
              </Text>
              <LinkButton href="/hulpvragen/nieuw" className="shrink-0">
                Start Uw intake
              </LinkButton>
            </div>
          </div>

          <div className="mt-5" aria-labelledby="vraagvoorbeelden">
            <p id="vraagvoorbeelden" className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
              U kunt bijvoorbeeld beginnen met
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {questionExamples.map((example) => (
                <li key={example} className="rounded-pill border border-border bg-surface/80 px-3 py-1.5 text-xs text-text-secondary">
                  {example}
                </li>
              ))}
            </ul>
          </div>

          <ul className="mt-7 grid gap-3 sm:grid-cols-3" aria-label="Belangrijkste uitgangspunten">
            <CheckItem>Volledig onafhankelijk</CheckItem>
            <CheckItem>Maximaal drie passende specialisten</CheckItem>
            <CheckItem>Geen betaalde voorkeursposities</CheckItem>
          </ul>
        </div>

        <div className="mx-auto w-full max-w-xl lg:max-w-none">
          <ProcessVisual />
        </div>
      </Section>

      <Section>
        <div className="max-w-3xl">
          <Badge variant="neutral">Begin bij Uw situatie</Badge>
          <Heading className="mt-4">U hoeft niet vooraf te weten welke specialist U nodig heeft</Heading>
          <Text size="lg" className="mt-5 text-text-secondary">
            Een organisatie heeft vaak eerst een probleem, verplichting of veranderende situatie. WorkMatchr
            helpt straks bepalen welke oplossing en deskundigheid daarbij passen.
          </Text>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {situations.map((situation) => (
            <Card key={situation.title} variant="subtle" className="shadow-none">
              <Heading as="h3" size="h3">
                {situation.title}
              </Heading>
              <Text className="mt-3 text-text-secondary">{situation.description}</Text>
            </Card>
          ))}
        </div>
      </Section>

      <Section id="hoe-werkt-het" className="scroll-mt-8 border-y border-border bg-surface">
        <div className="max-w-3xl">
          <Badge>Hoe WorkMatchr werkt</Badge>
          <Heading className="mt-4">Eerst begrijpen, daarna gericht selecteren</Heading>
          <Text className="mt-5 text-text-secondary">
            Versie 1 gebruikt vaste, gevalideerde vragen om Uw situatie te verduidelijken. Er wordt geen AI of
            matchinglogica gebruikt.
          </Text>
        </div>
        <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(([number, title, description]) => (
            <li key={number}>
              <Card className="h-full shadow-none">
                <IconContainer className="font-bold">{number}</IconContainer>
                <Heading as="h3" size="h3" className="mt-5">
                  {title}
                </Heading>
                <Text className="mt-3 text-text-secondary">{description}</Text>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <Badge variant="success">Vertrouwen door duidelijke keuzes</Badge>
            <Heading className="mt-4">Waarom organisaties WorkMatchr kunnen vertrouwen</Heading>
            <Text className="mt-5 text-text-secondary">
              De uitgangspunten zijn controleerbaar en blijven leidend wanneer het platform verder wordt gebouwd.
            </Text>
          </div>
          <Card variant="subtle" className="shadow-none">
            <ul className="grid gap-4 sm:grid-cols-2">
              {trustReasons.map((reason) => (
                <CheckItem key={reason}>{reason}</CheckItem>
              ))}
            </ul>
          </Card>
        </div>
      </Section>

      <Section className="border-y border-border bg-surface" containerClassName="grid gap-6 md:grid-cols-2">
        {audiences.map((audience) => (
          <Card key={audience.id} id={audience.id} className="scroll-mt-8 shadow-none">
            <Badge variant="neutral">{audience.label}</Badge>
            <Heading as="h2" size="h3" className="mt-5">
              {audience.title}
            </Heading>
            <ul className="mt-5 space-y-3">
              {audience.points.map((point) => (
                <CheckItem key={point}>{point}</CheckItem>
              ))}
            </ul>
            <LinkButton href={audience.href} variant="outline" className="mt-7">
              {audience.cta}
            </LinkButton>
          </Card>
        ))}
      </Section>

      <Section className="bg-brand-primary-subtle" containerSize="narrow" containerClassName="text-center">
        <Badge>Gericht verder</Badge>
        <Heading className="mt-4">Van hulpvraag naar de juiste specialist</Heading>
        <Text size="lg" className="mx-auto mt-5 max-w-2xl text-text-secondary">
          Vertel ons waar Uw organisatie tegenaan loopt. Wij helpen U gericht verder.
        </Text>
        <LinkButton href="/hulpvragen/nieuw" className="mt-8">
          Start Uw intake
        </LinkButton>
      </Section>
    </>
  )
}
