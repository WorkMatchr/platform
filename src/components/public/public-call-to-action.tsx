import type { InternalHref } from '@/content/public-homepage'
import { Section } from '@/components/layout/section'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'

type PublicCallToActionProps = {
  title: string
  description: string
  primaryAction: { href: InternalHref; label: string }
  secondaryAction: { href: InternalHref; label: string }
}

export function PublicCallToAction({ title, description, primaryAction, secondaryAction }: PublicCallToActionProps) {
  return (
    <Section className="border-y border-brand-dark bg-brand-dark" containerSize="narrow" containerClassName="text-center">
      <Heading className="text-text-on-dark">{title}</Heading>
      <Text size="lg" className="mx-auto mt-5 max-w-2xl text-text-on-dark-muted">{description}</Text>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <LinkButton href={primaryAction.href}>{primaryAction.label}</LinkButton>
        <LinkButton href={secondaryAction.href} variant="outline" className="border-text-on-dark text-text-on-dark hover:bg-text-on-dark hover:text-brand-dark">
          {secondaryAction.label}
        </LinkButton>
      </div>
    </Section>
  )
}
