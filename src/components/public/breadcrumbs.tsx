import Link from 'next/link'
import type { InternalHref } from '@/content/public-homepage'

type Breadcrumb = { label: string; href?: InternalHref }

export function Breadcrumbs({ items }: { items: readonly Breadcrumb[] }) {
  return (
    <nav aria-label="Broodkruimelpad" className="text-body-sm text-text-secondary">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href ? <Link href={item.href} className="rounded-sm underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
