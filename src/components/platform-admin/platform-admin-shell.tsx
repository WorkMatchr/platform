import Link from 'next/link'
import type { ReactNode } from 'react'
import { platformAdminNavigationGroups } from '@/lib/platform-admin/platform-admin-navigation'

export function PlatformAdminShell({ children, displayName }: { children: ReactNode; displayName: string }) {
  return (
    <div className="bg-background">
      <div className="mx-auto grid w-full max-w-[96rem] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-8">
        <aside className="self-start rounded-card border border-border bg-surface p-3 lg:sticky lg:top-4">
          <div className="border-b border-border px-3 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Platformbeheer</p>
            <p className="mt-1 truncate text-sm text-text-secondary">{displayName}</p>
          </div>
          <nav className="mt-3" aria-label="Platformbeheer">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {platformAdminNavigationGroups.map((group) => (
                <section aria-labelledby={`navigation-${group.label.replaceAll(' ', '-').toLowerCase()}`} key={group.label}>
                  <h2
                    className="px-3 text-xs font-semibold uppercase tracking-wide text-text-secondary"
                    id={`navigation-${group.label.replaceAll(' ', '-').toLowerCase()}`}
                  >
                    {group.label}
                  </h2>
                  <ul className="mt-1 grid gap-1">
                    {group.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="flex min-h-10 items-center rounded-control px-3 text-sm font-semibold text-brand-dark hover:bg-brand-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </nav>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  )
}
