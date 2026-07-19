'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { publicNavigationItems, type PublicNavigationHref } from '@/content/public-routes'
import { DisclosureMenu } from '@/components/ui/disclosure-menu'
import { LinkButton } from '@/components/ui/link-button'

function normalizePath(value: string) {
  const pathname = value.split(/[?#]/, 1)[0] || '/'
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  return withLeadingSlash === '/' ? withLeadingSlash : withLeadingSlash.replace(/\/+$/, '')
}

export function isPublicNavigationItemActive(pathname: string | null, href: PublicNavigationHref) {
  if (!pathname) return false
  if (href.includes('#')) return false

  const currentPath = normalizePath(pathname)
  const route = normalizePath(href)
  if (route === '/') return currentPath === route

  return currentPath === route || currentPath.startsWith(`${route}/`)
}

function NavigationLink({ href, label, pathname, mobile = false }: { href: PublicNavigationHref; label: string; pathname: string | null; mobile?: boolean }) {
  const current = isPublicNavigationItemActive(pathname, href)
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
  const primaryItem = publicNavigationItems.find((item) => item.kind === 'primary')!
  const standardItems = publicNavigationItems.filter((item) => item.kind === 'standard')
  const authItems = publicNavigationItems.filter((item) => item.kind === 'auth')

  return (
    <>
      <div className="hidden items-center gap-5 xl:flex">
        <nav aria-label="Hoofdnavigatie">
          <ul className="flex items-center gap-3 text-sm font-medium text-text-secondary">
            {standardItems.map((item) => <li key={item.href}><NavigationLink {...item} pathname={pathname} /></li>)}
            {authItems.map((item) => <li key={item.href}><NavigationLink {...item} pathname={pathname} /></li>)}
          </ul>
        </nav>
        <LinkButton href={primaryItem.href} className="shrink-0">{primaryItem.label}</LinkButton>
      </div>
      <DisclosureMenu
        ariaLabel="Hoofdnavigatie openen of sluiten"
        className="relative xl:hidden"
        buttonClassName="flex min-h-11 items-center rounded-control border border-border bg-surface px-4 text-sm font-semibold text-brand-dark"
        panelClassName="absolute right-0 z-30 mt-3 max-h-[calc(100vh-7rem)] w-[min(22rem,calc(100vw-2.5rem))] overflow-y-auto rounded-card border border-border bg-surface p-4 shadow-card"
        trigger={<>Menu<span aria-hidden="true" className="ml-2">&#9662;</span></>}
      >
        <nav aria-label="Mobiele hoofdnavigatie">
          <LinkButton href={primaryItem.href} className="mb-3 w-full">{primaryItem.label}</LinkButton>
          <ul className="space-y-1 text-sm font-medium">
            {standardItems.map((item) => <li key={item.href}><NavigationLink {...item} pathname={pathname} mobile /></li>)}
            {authItems.map((item) => <li key={item.href}><NavigationLink {...item} pathname={pathname} mobile /></li>)}
          </ul>
        </nav>
      </DisclosureMenu>
    </>
  )
}
