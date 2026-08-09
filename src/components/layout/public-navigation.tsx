'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { publicNavigationItems, type PublicNavigationHref } from '@/content/public-routes'
import { DisclosureMenu } from '@/components/ui/disclosure-menu'

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

function NavigationLink({ href, label, pathname, mobile = false, primary = false }: { href: PublicNavigationHref; label: string; pathname: string | null; mobile?: boolean; primary?: boolean }) {
  const current = isPublicNavigationItemActive(pathname, href)
  return (
    <Link
      href={href}
      aria-current={current ? 'page' : undefined}
      className={primary
        ? `inline-flex min-h-11 items-center justify-center rounded-control bg-brand-primary px-4 font-semibold text-white hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${mobile ? 'w-full' : ''}`
        : mobile
        ? `flex min-h-11 items-center rounded-control px-3 ${current ? 'bg-brand-primary-subtle font-semibold text-brand-dark' : 'hover:bg-brand-primary-subtle'}`
        : `inline-flex min-h-11 items-center rounded-control border-b-2 px-1 ${current ? 'border-brand-primary font-semibold text-brand-dark' : 'border-transparent hover:text-brand-primary-hover'}`}
    >
      {label}
    </Link>
  )
}

export function PublicNavigation({
  authenticated = false,
}: {
  authenticated?: boolean
}) {
  const pathname = usePathname()
  const standardItems = publicNavigationItems.filter((item) => item.kind === 'standard')
  const primaryItems = publicNavigationItems.filter((item) => item.kind === 'primary')
  const authItems = authenticated
    ? []
    : publicNavigationItems.filter((item) => item.kind === 'auth')

  return (
    <>
      <div className="hidden items-center gap-5 xl:flex">
        <nav aria-label="Hoofdnavigatie">
          <ul className="flex items-center gap-3 text-sm font-medium text-text-secondary">
            {standardItems.map((item) => <li key={item.href}><NavigationLink {...item} pathname={pathname} /></li>)}
            {primaryItems.map((item) => <li key={item.href}><NavigationLink {...item} pathname={pathname} primary /></li>)}
            {authItems.map((item) => <li key={item.href}><NavigationLink {...item} pathname={pathname} /></li>)}
          </ul>
        </nav>
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
            {standardItems.map((item) => <li key={item.href}><NavigationLink {...item} pathname={pathname} mobile /></li>)}
            {primaryItems.map((item) => <li key={item.href}><NavigationLink {...item} pathname={pathname} mobile primary /></li>)}
            {authItems.map((item) => <li key={item.href}><NavigationLink {...item} pathname={pathname} mobile /></li>)}
          </ul>
        </nav>
      </DisclosureMenu>
    </>
  )
}
