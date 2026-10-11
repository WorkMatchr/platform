'use client'

import type { ReactNode } from 'react'
import Link from '@/components/ui/navigation-link'
import { WorkMatchrLogo } from '@/components/branding/workmatchr-logo'
import { LogoutButton } from '@/components/auth/logout-button'
import styles from './workspace-shell.module.css'

export const workspaceFocus = 'rounded-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary'
export type WorkspaceChapter = { label: string; items: readonly { href: string; label: string }[] }

export function WorkspaceShell({ children, chapters, active, identity, homeHref, homeLabel, brandLabel, headerActions, sidebarExtra, banner, contentId, navigationLabel, footerLabel }: {
  children: ReactNode
  chapters: readonly WorkspaceChapter[]
  active?: { chapter: WorkspaceChapter; item: WorkspaceChapter['items'][number] }
  identity: ReactNode
  homeHref: string
  homeLabel: string
  brandLabel: ReactNode
  headerActions: ReactNode
  sidebarExtra?: ReactNode
  banner?: ReactNode
  contentId?: string
  navigationLabel: string
  footerLabel: string
}) {
  const chapter = active?.chapter ?? chapters[0]
  const focus = workspaceFocus
  return <div data-workspace-shell="v02" className="min-h-screen bg-background text-brand-dark lg:h-full lg:min-h-0 lg:overflow-y-auto">
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-[100rem] flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
        <Link href={homeHref} aria-label={homeLabel} className={`flex min-h-11 items-center gap-3 ${focus}`}>
          <WorkMatchrLogo size="header" priority />{brandLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-sm">{headerActions}<LogoutButton variant="ghost" /></div>
      </div>
    </header>
    {banner}
    <div className="mx-auto grid max-w-[100rem] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="min-w-0 self-start lg:sticky lg:top-4">
        <p className="mb-3 break-words px-3 text-sm text-text-secondary">{identity}</p>
        <nav aria-label={navigationLabel} className="grid gap-1 rounded-card border border-border bg-surface p-2 sm:grid-cols-2 lg:grid-cols-1">
          {chapters.map((entry) => <Link key={entry.label} href={entry.items[0].href} aria-current={entry.label === chapter.label ? 'location' : undefined} className={`flex min-h-11 items-center px-3 py-2 text-sm font-semibold ${focus} ${entry.label === chapter.label ? 'bg-brand-dark text-text-on-dark' : 'hover:bg-brand-primary-subtle'}`}>{entry.label}</Link>)}
        </nav>
        {sidebarExtra}
      </aside>
      <div className="min-w-0" id={contentId} role={contentId ? 'main' : undefined}>
        <div className="mb-4 border-b border-border pb-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">{chapter.label}</p>
          <nav aria-label={`Binnen ${chapter.label}`} className="flex flex-wrap gap-1">
            {chapter.items.map((item) => <Link key={item.href} href={item.href} aria-current={active?.item.href === item.href ? 'page' : undefined} className={`inline-flex min-h-10 items-center px-3 py-2 text-sm ${focus} ${active?.item.href === item.href ? 'bg-brand-primary-subtle font-semibold text-brand-dark' : 'text-text-secondary hover:bg-surface'}`}>{item.label}</Link>)}
          </nav>
        </div>
        <div className={styles.content}>{children}</div>
      </div>
    </div>
    <footer className="mx-auto flex max-w-[100rem] flex-wrap justify-between gap-3 border-t border-border px-6 py-3 text-xs text-text-secondary"><span>{footerLabel}</span><Link href="/privacy" className={focus}>Privacy</Link></footer>
  </div>
}
