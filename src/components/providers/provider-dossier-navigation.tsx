'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DisclosureMenu } from '@/components/ui/disclosure-menu'

export type ProviderNavigationItem = {
  label: string
  href: string
  matchPaths?: string[]
  status: 'Gereed' | 'Actie nodig' | 'Verlopen' | 'Niet gestart'
}

export function isProviderNavigationItemCurrent(item: ProviderNavigationItem, pathname: string) {
  const paths = item.matchPaths ?? [item.href]
  return paths.some((path) =>
    path === '/aanbiedersdossier' ? pathname === path : pathname === path || pathname.startsWith(`${path}/`),
  )
}

export function ProviderDossierNavigation({ items }: { items: ProviderNavigationItem[] }) {
  const pathname = usePathname()
  const list = (
    <ul className="space-y-2">
      {items.map((item) => {
        const current = isProviderNavigationItemCurrent(item, pathname)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? 'page' : undefined}
              className={`block rounded-control border px-4 py-3 transition-colors ${current ? 'border-brand-primary bg-brand-primary-subtle text-brand-dark' : 'border-border bg-surface hover:border-brand-primary'}`}
            >
              <span className="block font-semibold">{item.label}</span>
              <span className="mt-1 block text-sm text-text-secondary">Status: {item.status}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <>
      <nav className="hidden lg:block" aria-label="Onderdelen dienstverlenersprofiel">{list}</nav>
      <DisclosureMenu
        ariaLabel="Onderdelen van het dienstverlenersprofiel openen of sluiten"
        className="rounded-card border border-border bg-surface p-4 lg:hidden"
        buttonClassName="flex min-h-11 w-full items-center justify-between font-semibold text-brand-dark"
        panelClassName="mt-4"
        trigger={<><span>Dossieronderdelen</span><span aria-hidden="true">&#9662;</span></>}
      >
        <nav aria-label="Mobiele onderdelen dienstverlenersprofiel">{list}</nav>
      </DisclosureMenu>
    </>
  )
}
