import { siteConfig } from '@/config/site'

export function breadcrumbData(items: readonly { label: string; href?: string }[]) {
  return JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1,
      name: item.label, ...(item.href ? { item: new URL(item.href, siteConfig.url).toString() } : {}) }))
  }).replace(/</g, '\\u003c')
}
