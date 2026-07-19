import type { InternalHref } from '@/content/public-homepage'
import { Section } from '@/components/layout/section'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'

type PublicPlaceholderPageProps = {
  title: string
  description: string
  nextStep?: { href: InternalHref; label: string }
}

export function PublicPlaceholderPage({ title, description, nextStep }: PublicPlaceholderPageProps) {
  return (
    <Section containerSize="narrow">
      <Card className="shadow-none">
        <Badge variant="neutral">In ontwikkeling</Badge>
        <Heading as="h1" size="h1" className="mt-5">{title}</Heading>
        <Text size="lg" className="mt-5 max-w-2xl text-text-secondary">{description}</Text>
        <Text className="mt-5 max-w-2xl text-text-secondary">
          Tot die tijd kunt u via de beschikbare vervolgstap of de homepage verder binnen WorkMatchr.
        </Text>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {nextStep && <LinkButton href={nextStep.href}>{nextStep.label}</LinkButton>}
          <LinkButton href="/" variant="outline">Terug naar de homepage</LinkButton>
        </div>
      </Card>
    </Section>
  )
}
