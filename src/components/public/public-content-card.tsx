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
}

export function PublicContentCard({ title, description, href, linkLabel = 'Lees meer', status, contentTypeLabel, headingLevel = 'h2' }: PublicContentCardProps) {
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
