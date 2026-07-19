'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { publicNavigation } from '@/content/public-homepage'
import { DisclosureMenu } from '@/components/ui/disclosure-menu'
import { LinkButton } from '@/components/ui/link-button'

function isCurrent(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  const route = href.split('#')[0]
  return route.length > 1 && (pathname === route || pathname.startsWith(`${route}/`))
}

function NavigationLink({ href, label, pathname, mobile = false }: { href: string; label: string; pathname: string | null; mobile?: boolean }) {
  const current = isCurrent(pathname, href)
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={mobile
        ? `flex min-h-11 items-center rounded-control px-3 ${current ? 'bg-brand-primary-subtle font-semibold text-brand-dark' : 'hover:bg-brand-primary-subtle'}`
        : `inline-flex min-h-11 items-center rounded-control border-b-2 px-1 ${current ? 'border-brand-primary font-semibold text-brand-dark' : 'border-transparent hover:text-brand-primary-hover'}`}
    >
      {label}
    </Link>
  )
}

export function PublicNavigation() {
  const pathname = usePathname()

  return (
    <>
      <div className="hidden items-center gap-5 xl:flex">
        <nav aria-label="Hoofdnavigatie">
          <ul className="flex items-center gap-3 text-sm font-medium text-text-secondary">
            {publicNavigation.map((item) => <li key={item.href}><NavigationLink {...item} pathname={pathname} /></li>)}
            <li><NavigationLink href="/inloggen" label="Inloggen" pathname={pathname} /></li>
          </ul>
        </nav>
        <LinkButton href="/advieswijzer" className="shrink-0">Start de Advieswijzer</LinkButton>
      </div>
      <DisclosureMenu
        ariaLabel="Hoofdnavigatie openen of sluiten"
        className="relative xl:hidden"
        buttonClassName="flex min-h-11 items-center rounded-control border border-border bg-surface px-4 text-sm font-semibold text-brand-dark"
        panelClassName="absolute right-0 z-30 mt-3 max-h-[calc(100vh-7rem)] w-[min(22rem,calc(100vw-2.5rem))] overflow-y-auto rounded-card border border-border bg-surface p-4 shadow-card"
        trigger={<>Menu<span aria-hidden="true" className="ml-2">&#9662;</span></>}
      >
        <nav aria-label="Mobiele hoofdnavigatie">
          <ul className="space-y-1 text-sm font-medium">
            {publicNavigation.map((item) => <li key={item.href}><NavigationLink {...item} pathname={pathname} mobile /></li>)}
            <li><NavigationLink href="/inloggen" label="Inloggen" pathname={pathname} mobile /></li>
          </ul>
          <LinkButton href="/advieswijzer" className="mt-3 w-full">Start de Advieswijzer</LinkButton>
        </nav>
      </DisclosureMenu>
    </>
  )
}
