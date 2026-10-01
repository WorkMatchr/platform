'use client'

import Link from '@/components/ui/navigation-link'
import { usePathname } from 'next/navigation'
import { useId } from 'react'
import { publicNavigationGroups, publicNavigationItems, type PublicNavigationHref, type PublicNavigationGroup } from '@/content/public-routes'
import { DisclosureMenu } from '@/components/ui/disclosure-menu'

function normalizePath(value: string) {
  const pathname = value.split(/[?#]/, 1)[0] || '/'
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  return withLeadingSlash === '/' ? withLeadingSlash : withLeadingSlash.replace(/\/+$/, '')
}

export function isPublicNavigationItemActive(pathname: string | null, href: PublicNavigationHref) {
  if (!pathname || href.includes('#')) return false
  const currentPath = normalizePath(pathname)
  const route = normalizePath(href)
  return route === '/' ? currentPath === route : currentPath === route || currentPath.startsWith(`${route}/`)
}

function NavigationLink({ href, label, description, activeHref }: { href: PublicNavigationHref; label: string; description?: string; activeHref?: string }) {
  const current = activeHref === href
  return (
    <Link href={href} aria-current={current ? 'page' : undefined}
      className={`flex min-h-11 flex-col justify-center rounded-control border-l-2 px-3 py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${current ? 'border-brand-primary bg-brand-primary-subtle text-brand-dark' : 'border-transparent text-text-secondary hover:bg-brand-primary-subtle'}`}>
      <span className="font-semibold">{label}</span>{description && ' '}
      {description && <span className="mt-1 text-xs font-normal leading-relaxed text-text-secondary">{description}</span>}
    </Link>
  )
}

function GroupLinks({ group, activeHref }: { group: PublicNavigationGroup; activeHref?: string }) {
  return <ul className="space-y-1">{group.items.map((item) => <li key={item.href}><NavigationLink {...item} activeHref={activeHref} /></li>)}</ul>
}

export function PublicNavigation({ authenticated = false }: { authenticated?: boolean }) {
  const pathname = usePathname()
  const id = useId()
  const activeHref = publicNavigationItems.filter(item => isPublicNavigationItemActive(pathname, item.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href
  const authItems = authenticated ? [] : publicNavigationItems.filter(item => item.kind === 'auth')
  const desktopNavigationClass = authenticated ? 'hidden items-center gap-5 xl:flex' : 'hidden items-center gap-5 lg:flex'
  const mobileNavigationClass = authenticated ? 'relative xl:hidden' : 'relative lg:hidden'

  return <>
    <div className={desktopNavigationClass}>
      <nav aria-label="Hoofdnavigatie">
        <ul className="flex items-center gap-3 text-sm font-medium">
          {publicNavigationGroups.map(group => {
            const active = group.items.some(item => item.href === activeHref)
            return <li key={group.key}>
              <DisclosureMenu ariaLabel={`${group.label}${active ? ' — Actuele sectie' : ''}`} className="relative"
                buttonClassName={`flex min-h-11 items-center gap-2 rounded-control border-b-2 px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${active ? 'border-brand-primary text-brand-dark' : 'border-transparent text-text-secondary hover:bg-brand-primary-subtle'}`}
                panelClassName="absolute right-0 z-30 mt-3 max-h-[calc(100vh-7rem)] w-80 overflow-y-auto rounded-card border border-border bg-surface p-3 shadow-card"
                trigger={<><span>{group.label}{active && <span className="sr-only"> — Actuele sectie</span>}</span><span aria-hidden="true">▾</span></>}>
                <GroupLinks group={group} activeHref={activeHref} />
              </DisclosureMenu>
            </li>
          })}
        </ul>
      </nav>
      {authItems.map(item => <NavigationLink key={item.href} {...item} activeHref={activeHref} />)}
    </div>
    <DisclosureMenu ariaLabel="Hoofdnavigatie openen of sluiten" className={mobileNavigationClass}
      buttonClassName="flex min-h-11 items-center rounded-control border border-border bg-surface px-4 text-sm font-semibold text-brand-dark"
      panelClassName={`absolute ${authenticated ? 'left-0 sm:left-auto sm:right-0' : 'right-0'} z-30 mt-3 max-h-[calc(100dvh-7rem)] w-[min(22rem,calc(100vw-2.5rem))] overflow-y-auto rounded-card border border-border bg-surface p-4 shadow-card`}
      trigger={<>Menu<span aria-hidden="true" className="ml-2">▾</span></>}>
      <nav aria-label="Mobiele hoofdnavigatie" className="space-y-4 text-sm">
        {publicNavigationGroups.map(group => <section key={group.key} aria-labelledby={`${id}-${group.key}`}>
          <h2 id={`${id}-${group.key}`} className="mb-2 border-b border-border pb-2 text-sm font-bold text-brand-dark">{group.label}</h2>
          <GroupLinks group={group} activeHref={activeHref} />
        </section>)}
      </nav>
      {authItems.length > 0 && <div className="mt-4 border-t border-border pt-3 text-sm">{authItems.map(item => <NavigationLink key={item.href} {...item} activeHref={activeHref} />)}</div>}
    </DisclosureMenu>
  </>
}