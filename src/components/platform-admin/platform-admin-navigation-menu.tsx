'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { getPlatformAdminNavigationGroups } from '@/lib/platform-admin/platform-admin-navigation'
import type { PlatformMembershipRole } from '@/lib/platform-admin/platform-admin-policy'

const groupToneClasses = {
  daily: 'border-sky-200 bg-sky-50',
  reviews: 'border-blue-200 bg-blue-50',
  insight: 'border-cyan-200 bg-cyan-50',
  finance: 'border-indigo-200 bg-indigo-50',
  system: 'border-slate-200 bg-slate-50',
} as const

type NavigationGroup = {
  label: string
  tone: keyof typeof groupToneClasses
  items: readonly { href: string; label: string }[]
}

export function isPlatformAdminRouteActive(pathname: string, href: string) {
  return href === '/platformbeheer'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`)
}

export function PlatformAdminNavigationMenu({ membershipRole }: { membershipRole: PlatformMembershipRole }) {
  const pathname = usePathname()
  const navigationGroups = getPlatformAdminNavigationGroups(membershipRole) as readonly NavigationGroup[]
  const activeHref = navigationGroups
    .flatMap((group) => group.items)
    .filter((item) => isPlatformAdminRouteActive(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href
  const activeGroup = navigationGroups.find((group) =>
    group.items.some((item) => item.href === activeHref),
  )?.label
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({})

  return (
    <nav className="mt-3" aria-label="Platformbeheer">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {navigationGroups.map((group) => {
          const overrideKey = `${pathname}:${group.label}`
          const isOpen = groupOverrides[overrideKey] ?? group.label === activeGroup
          return (
            <details
              className="group overflow-hidden rounded-control border border-border bg-surface"
              key={group.label}
              open={isOpen}
              onToggle={(event) => {
                const nextOpen = event.currentTarget.open
                setGroupOverrides((current) => current[overrideKey] === nextOpen
                  ? current
                  : { ...current, [overrideKey]: nextOpen })
              }}
            >
              <summary
                className={`flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 border-l-4 px-3 text-sm font-semibold text-brand-dark marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-primary [&::-webkit-details-marker]:hidden ${groupToneClasses[group.tone]}`}
              >
                <span>{group.label}</span>
                <svg aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 20 20" fill="none">
                  <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" />
                </svg>
              </summary>
              <ul className="grid gap-1 p-2">
                {group.items.map((item) => {
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
              </ul>
            </details>
          )
        })}
      </div>
    </nav>
  )
}
