'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'

export type AccordionNavigationGroup = {
  key: string
  label: string
  links: readonly { href: string; label: string }[]
}

export function isNavigationRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AccordionNavigation({
  ariaLabel,
  groups,
  isRouteActive = isNavigationRouteActive,
  renderGroupAction,
}: {
  ariaLabel: string
  groups: readonly AccordionNavigationGroup[]
  isRouteActive?: (pathname: string, href: string) => boolean
  renderGroupAction?: (group: AccordionNavigationGroup) => ReactNode
}) {
  const pathname = usePathname()
  const activeHref = groups
    .flatMap((group) => group.links)
    .filter((item) => isRouteActive(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href
  const activeGroupKey = groups.find((group) =>
    group.links.some((item) => item.href === activeHref),
  )?.key
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({})

  return (
    <nav className="mt-3" aria-label={ariaLabel}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {groups.map((group, index) => {
          const overrideKey = `${pathname}:${group.key}`
          const isOpen = groupOverrides[overrideKey] ?? group.key === activeGroupKey
          const toneClass = index % 2 === 0
            ? 'border-sky-200 bg-sky-50'
            : 'border-slate-200 bg-slate-50'

          return (
            <details
              className="group overflow-hidden rounded-control border border-border bg-surface"
              key={group.key}
              open={isOpen}
              onToggle={(event) => {
                const nextOpen = event.currentTarget.open
                setGroupOverrides((current) => current[overrideKey] === nextOpen
                  ? current
                  : { ...current, [overrideKey]: nextOpen })
              }}
            >
              <summary
                className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 border-l-4 px-3 text-sm font-semibold text-brand-dark marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-primary [&::-webkit-details-marker]:hidden ${toneClass}`}
              >
                <span>{group.label}</span>
                <svg aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none">
                  <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                </svg>
              </summary>
              <ul className="grid gap-1 p-2">
                {group.links.map((item) => {
                  const active = item.href === activeHref
                  return (
                    <li key={item.href}>
                      <Link
                        aria-current={active ? 'page' : undefined}
                        href={item.href}
                        className={`flex min-h-10 items-center rounded-control border-l-4 px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${active ? 'border-brand-primary bg-brand-primary-subtle text-brand-dark' : 'border-transparent text-brand-dark hover:bg-brand-primary-subtle'}`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
                {renderGroupAction?.(group)}
              </ul>
            </details>
          )
        })}
      </div>
    </nav>
  )
}
