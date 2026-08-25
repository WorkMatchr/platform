'use client'

import { AccordionNavigation } from '@/components/layout/accordion-navigation'
import { getPlatformAdminNavigationGroups } from '@/lib/platform-admin/platform-admin-navigation'
import type { PlatformMembershipRole } from '@/lib/platform-admin/platform-admin-policy'

export function isPlatformAdminRouteActive(pathname: string, href: string) {
  return href === '/platformbeheer'
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`)
}

export function PlatformAdminNavigationMenu({ membershipRole }: { membershipRole: PlatformMembershipRole }) {
  const navigationGroups = getPlatformAdminNavigationGroups(membershipRole)
  return (
    <AccordionNavigation
      ariaLabel="Platformbeheer"
      isRouteActive={isPlatformAdminRouteActive}
      groups={navigationGroups.map((group) => ({
        key: group.tone,
        label: group.label,
        links: group.items,
      }))}
    />
  )
}
