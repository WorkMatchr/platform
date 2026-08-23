import Link from 'next/link'
import type { ReactNode } from 'react'
import { LogoutButton } from '@/components/auth/logout-button'
import { WorkMatchrLogo } from '@/components/branding/workmatchr-logo'
import { getPlatformAdminNavigationGroups } from '@/lib/platform-admin/platform-admin-navigation'
import type { PlatformMembershipRole } from '@/lib/platform-admin/platform-admin-policy'
import type { TestAccountOption } from '@/lib/test-impersonation/test-impersonation-service'
import { TestAccountSwitcher } from './test-account-switcher'

export function PlatformAdminShell({
  children,
  displayName,
  membershipRole,
  testAccountSwitcher,
}: {
  children: ReactNode
  displayName: string
  membershipRole: PlatformMembershipRole
  testAccountSwitcher: {
    accounts: TestAccountOption[] | null
    unavailableReason: string | null
  } | null
}) {
  const navigationGroups = getPlatformAdminNavigationGroups(membershipRole)
  return (
    <div className="flex min-h-screen flex-col bg-background lg:h-full lg:min-h-0 lg:overflow-hidden">
      <header className="shrink-0 border-b border-border bg-surface">
        <div className="mx-auto flex min-h-16 w-full max-w-[96rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/platformbeheer"
            className="inline-flex min-h-11 items-center gap-3 rounded-control text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            aria-label="WorkMatchr Platformbeheer, naar het beheerdashboard"
          >
            <WorkMatchrLogo size="header" priority />
            <span className="font-semibold text-text-secondary">Platformbeheer</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className="inline-flex min-h-10 items-center rounded-control px-3 text-sm font-semibold text-brand-dark hover:bg-brand-primary-subtle focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              Account
            </Link>
            <LogoutButton variant="ghost" />
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-[96rem] flex-1 gap-6 px-4 py-6 sm:px-6 lg:min-h-0 lg:grid-cols-[15rem_minmax(0,1fr)] lg:overflow-hidden lg:px-8">
        <aside className="self-start rounded-card border border-border bg-surface p-3 lg:min-h-0 lg:self-stretch lg:overflow-y-auto lg:overscroll-contain">
          <div className="border-b border-border px-3 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">Platformbeheer</p>
            <p className="mt-1 truncate text-sm text-text-secondary">{displayName}</p>
          </div>
          {testAccountSwitcher ? (
            <TestAccountSwitcher
              accounts={testAccountSwitcher.accounts}
              unavailableReason={testAccountSwitcher.unavailableReason}
            />
          ) : null}
          <nav className="mt-3" aria-label="Platformbeheer">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {navigationGroups.map((group) => (
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
        <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
          {children}
        </div>
      </div>
      <footer className="shrink-0 border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[96rem] flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm text-text-secondary sm:px-6 lg:px-8">
          <span className="flex items-center gap-2 text-brand-dark">
            <WorkMatchrLogo size="header" />
            <span className="font-semibold text-text-secondary">Platformbeheer</span>
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <Link className="rounded-control hover:text-brand-primary-hover" href="/privacy">
              Privacy
            </Link>
            <span>Beveiliging</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
