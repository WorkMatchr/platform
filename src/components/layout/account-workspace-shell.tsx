'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import Link from '@/components/ui/navigation-link'
import { organizationRoleLabels } from '@/lib/presentation/platform-labels'
import type { HeaderViewModel } from './header-model'
import { WorkspaceShell, workspaceFocus } from './workspace-shell'
import styles from './account-workspace-content.module.css'

export function AccountWorkspaceShell({ model, banner, children }: { model: HeaderViewModel; banner: ReactNode; children: ReactNode }) {
  const pathname = usePathname()
  const providerDossier = pathname === '/aanbiedersdossier' || pathname.startsWith('/aanbiedersdossier/')
  const moveOrganizationToSidebar = Boolean(providerDossier && model.activeOrganization)
  const chapters = model.navigationGroups.filter(group => group.links.length).map(group => ({
    label: group.label,
    items: providerDossier && group.key === 'organization'
      ? group.links.filter(link => link.href !== '/aanbiedersdossier/diensten-en-ervaring')
      : group.links,
  }))
  const active = chapters.flatMap(chapter => chapter.items.map(item => ({ chapter, item, exact: pathname === item.href })))
    .filter(({ item }) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.item.href.length - a.item.href.length)[0]
  return <div data-account-shell="v02" data-account-layout="shared" data-workspace-theme={model.workspaceTheme} className="lg:h-dvh lg:overflow-hidden">
    <WorkspaceShell chapters={chapters} active={active}
      identity={<>{model.displayName}{!moveOrganizationToSidebar && model.activeOrganization ? <><br />{model.activeOrganization.name}<br />{organizationRoleLabels[model.activeOrganization.role]}</> : null}</>}
      sidebarExtra={moveOrganizationToSidebar && model.activeOrganization ? <div className="mt-4 rounded-card border border-border bg-surface p-4" aria-label="Mijn organisatie"><p className="text-sm font-semibold text-text-secondary">Mijn organisatie</p><p className="mt-2 break-words font-bold text-brand-dark">{model.activeOrganization.name}</p><p className="mt-1 text-sm text-text-secondary">{organizationRoleLabels[model.activeOrganization.role]}</p></div> : null}
      homeHref="/" homeLabel="WorkMatchr, naar de homepage" brandLabel={<span className="text-sm font-semibold">Mijn omgeving</span>}
      headerActions={<Link href="/dashboard" className={`inline-flex min-h-10 items-center ${workspaceFocus}`}>Mijn omgeving</Link>}
      navigationLabel="Accounthoofdstukken" footerLabel="WorkMatchr · Beveiligde accountomgeving"
      banner={banner} contentId="main-content"
    ><div className={styles.content}>{children}</div></WorkspaceShell>
  </div>
}
