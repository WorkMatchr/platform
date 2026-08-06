import Link from 'next/link'
import type { InternalHref } from '@/content/public-homepage'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

type PublicContentCardProps = {
  title: string
  description: string
  href?: InternalHref
  linkLabel?: string
  status?: string
  contentTypeLabel?: string
  headingLevel?: 'h2' | 'h3'
  compact?: boolean
}

export function PublicContentCard({ title, description, href, linkLabel = 'Lees meer', status, contentTypeLabel, headingLevel = 'h2', compact = false }: PublicContentCardProps) {
  if (compact && href) {
    return (
      <Link
        href={href}
        className="group block h-full rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary"
      >
        <Card className="flex h-full min-w-0 items-start gap-4 !p-4 shadow-none transition-colors duration-normal group-hover:border-brand-primary sm:!p-5">
          <div className="min-w-0 flex-1">
            <Heading as={headingLevel} size="h3" className="break-words">{title}</Heading>
            <Text size="sm" className="mt-2 text-text-secondary">{description}</Text>
          </div>
          <span aria-hidden="true" className="shrink-0 pt-0.5 font-semibold text-brand-primary">→</span>
        </Card>
      </Link>
    )
  }
  if (compact) {
    return (
      <Card className="flex h-full min-w-0 items-start gap-4 !p-4 shadow-none sm:!p-5">
        <div className="min-w-0 flex-1">
          <Heading as={headingLevel} size="h3" className="break-words">{title}</Heading>
          <Text size="sm" className="mt-2 text-text-secondary">{description}</Text>
        </div>
      </Card>
    )
  }
  return (
    <Card className="flex h-full min-w-0 flex-col shadow-none">
      {contentTypeLabel && <Text size="sm" className="font-semibold text-brand-primary">{contentTypeLabel}</Text>}
      {status && <Text size="sm" className="font-semibold text-brand-primary">{status}</Text>}
      <Heading as={headingLevel} size="h3" className={`${status || contentTypeLabel ? 'mt-2 ' : ''}break-words`}>{title}</Heading>
      <Text className="mt-3 flex-1 text-text-secondary">{description}</Text>
      {href && <Link href={href} className="mt-6 w-fit rounded-sm font-semibold text-brand-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">{linkLabel}<span aria-hidden="true"> →</span></Link>}
    </Card>
  )
}
