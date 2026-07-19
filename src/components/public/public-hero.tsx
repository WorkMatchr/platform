import type { publicHomepageContent } from '@/content/public-homepage'
import { Section } from '@/components/layout/section'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'

type PublicHeroProps = {
  hero: typeof publicHomepageContent.hero
  process: typeof publicHomepageContent.process
}

export function PublicHero({ hero, process }: PublicHeroProps) {
  return (
    <Section className="overflow-hidden border-b border-border bg-brand-primary-subtle" containerClassName="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
      <div>
        <Badge className="mb-6">{hero.eyebrow}</Badge>
        <Heading as="h1" size="display" className="max-w-3xl text-brand-dark">{hero.title}</Heading>
        <Text size="lg" className="mt-6 max-w-2xl text-text-secondary">{hero.description}</Text>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <LinkButton href={hero.primaryAction.href}>{hero.primaryAction.label}</LinkButton>
          <LinkButton href={hero.secondaryAction.href} variant="outline">{hero.secondaryAction.label}</LinkButton>
        </div>
      </div>

      <Card className="relative shadow-none" aria-label="Proces van vraag naar specialist">
        <p className="text-sm font-semibold text-brand-primary-hover">Begrijpen gaat vóór verbinden</p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {process.map((label, index) => (
            <li key={label} className="flex min-h-24 items-center gap-3 rounded-control bg-surface-subtle p-4 sm:flex-col sm:items-start sm:justify-between">
              <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-dark text-sm font-bold text-text-on-dark">{index + 1}</span>
              <span className="font-semibold text-brand-dark">{label}</span>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm leading-6 text-text-secondary">
          Informatie en vraagverheldering komen vóór een eventuele vervolgstap naar dienstverlening.
        </p>
      </Card>
    </Section>
  )
}
