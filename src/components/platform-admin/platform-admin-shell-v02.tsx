'use client'

import { usePathname } from 'next/navigation'
import type { ComponentProps } from 'react'
import Link from '@/components/ui/navigation-link'
import { WorkspaceShell, workspaceFocus as focus } from '@/components/layout/workspace-shell'
import { getPlatformAdminActiveItem, getPlatformAdminChapters } from '@/lib/platform-admin/platform-admin-navigation-v02'
import type { PlatformAdminShell } from './platform-admin-shell'
import { TestAccountSwitcher } from './test-account-switcher'

export function PlatformAdminShellV02({ children, displayName, membershipRole, testAccountSwitcher }: ComponentProps<typeof PlatformAdminShell>) {
  const pathname = usePathname()
  return <WorkspaceShell
    chapters={getPlatformAdminChapters(membershipRole)}
    active={getPlatformAdminActiveItem(pathname, membershipRole)}
    identity={displayName}
    homeHref="/platformbeheer"
    homeLabel="WorkMatchr Platformbeheer, naar het beheeroverzicht"
    brandLabel={<span className="text-sm font-semibold">Platformbeheer <span className="text-text-secondary">v0.2</span></span>}
    headerActions={<><a href="/platformbeheer/v01" className={`inline-flex min-h-10 items-center underline ${focus}`}>Vergelijk met v0.1</a><Link href="/account" className={`inline-flex min-h-10 items-center ${focus}`}>Account</Link></>}
    navigationLabel="Beheerhoofdstukken"
    footerLabel="WorkMatchr · Beveiligde beheeromgeving"
    sidebarExtra={testAccountSwitcher ? <details className="mt-3 rounded-card border border-border bg-surface p-3 text-sm"><summary className={`cursor-pointer ${focus}`}>Testaccountwisselaar</summary><TestAccountSwitcher {...testAccountSwitcher} /></details> : null}
  >{children}</WorkspaceShell>
}
