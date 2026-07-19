import type { PublicOverviewItem } from '@/content/public-overviews'
import { PublicContentCard } from './public-content-card'

export function PublicOverviewGrid({ items }: { items: readonly PublicOverviewItem[] }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <PublicContentCard key={item.title} {...item} />)}</div>
}
