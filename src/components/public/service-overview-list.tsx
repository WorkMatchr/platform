import Link from 'next/link'
import type { InternalHref } from '@/content/public-homepage'
import type { PublicOverviewItem } from '@/content/public-overviews'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

type LinkedServiceOverviewItem = PublicOverviewItem & {
  href: InternalHref
}

export function ServiceOverviewList({ items }: { items: readonly LinkedServiceOverviewItem[] }) {
  return (
    <ul className="grid gap-3 lg:grid-cols-2" data-overview-density="compact">
      {items.map((item) => (
        <li key={item.title} className="min-w-0">
          <Link
            href={item.href}
            className="group flex h-full min-h-11 min-w-0 flex-col rounded-card border border-border bg-surface p-5 shadow-none transition-colors duration-normal hover:border-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary sm:flex-row sm:items-center sm:gap-6"
          >
            <div className="min-w-0 flex-1">
              {item.status && <Text size="sm" className="font-semibold text-brand-primary">{item.status}</Text>}
              <Heading as="h2" size="h3" className={`${item.status ? 'mt-1 ' : ''}break-words`}>
                {item.title}
              </Heading>
              <Text size="sm" className="mt-2 text-text-secondary">{item.description}</Text>
            </div>
            <span className="mt-3 inline-flex shrink-0 items-center self-start font-semibold text-brand-primary-hover sm:mt-0 sm:self-center">
              Bekijk dienst<span aria-hidden="true" className="ml-2">→</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
