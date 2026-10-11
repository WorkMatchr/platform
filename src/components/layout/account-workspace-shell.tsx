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
  const chapters = model.navigationGroups.filter(group => group.links.length).map(group => ({ label: group.label, items: group.links }))
  const active = chapters.flatMap(chapter => chapter.items.map(item => ({ chapter, item })))
    .filter(({ item }) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.item.href.length - a.item.href.length)[0]
  return <div data-account-shell="v02" data-account-layout="shared" className="lg:h-dvh lg:overflow-hidden">
    <WorkspaceShell chapters={chapters} active={active}
      identity={<>{model.displayName}{model.activeOrganization ? <><br />{model.activeOrganization.name}<br />{organizationRoleLabels[model.activeOrganization.role]}</> : null}</>}
      homeHref="/" homeLabel="WorkMatchr, naar de homepage" brandLabel={<span className="text-sm font-semibold">Mijn omgeving</span>}
      headerActions={<Link href="/dashboard" className={`inline-flex min-h-10 items-center ${workspaceFocus}`}>Mijn omgeving</Link>}
      navigationLabel="Accounthoofdstukken" footerLabel="WorkMatchr · Beveiligde accountomgeving"
      banner={banner} contentId="main-content"
    ><div className={styles.content}>{children}</div></WorkspaceShell>
  </div>
}
