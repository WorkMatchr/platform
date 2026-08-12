import Image from 'next/image'

import type { publicHomepageContent } from '@/content/public-homepage'
import { Section } from '@/components/layout/section'
import { Badge } from '@/components/ui/badge'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'

type PublicHeroProps = {
  hero: typeof publicHomepageContent.hero
}

export function PublicHero({ hero }: PublicHeroProps) {
  return (
    <Section spacing="compact" className="overflow-hidden border-b border-border bg-brand-primary-subtle" containerClassName="grid items-center gap-12 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12">
      <div>
        <Badge className="mb-6">{hero.eyebrow}</Badge>
        <Heading as="h1" size="display" className="max-w-3xl text-brand-dark">{hero.title}</Heading>
        <Text size="lg" className="mt-6 max-w-2xl text-text-secondary">{hero.description}</Text>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <LinkButton href={hero.primaryAction.href}>{hero.primaryAction.label}</LinkButton>
          <LinkButton href={hero.secondaryAction.href} variant="outline">{hero.secondaryAction.label}</LinkButton>
        </div>
      </div>

      <div className="min-w-0">
        <Image
          src="/images/hero-begrijpen-en-verbinden.png"
          alt="Van een duidelijke hulpvraag via betrouwbare kennis naar een passende deskundige"
          width={1536}
          height={1024}
          priority
          sizes="(min-width: 1024px) 52vw, 100vw"
          className="h-auto w-full rounded-card object-contain"
        />
      </div>
    </Section>
  )
}
