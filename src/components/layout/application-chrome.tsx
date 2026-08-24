'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { AccountNavigationMenu } from './account-navigation-menu'
import type { HeaderViewModel } from './header-model'
import { organizationRoleLabels } from '@/lib/presentation/platform-labels'

const authenticatedWorkspacePrefixes = [
  '/aanbiedersdossier',
  '/aanvragen',
  '/account',
  '/adviesdossiers',
  '/berichten',
  '/credits',
  '/dashboard',
  '/hulpvragen',
  '/marktplaats',
  '/mijn-arbo-wijzers',
  '/notificaties',
  '/offertes',
  '/opdrachten',
  '/organisatie',
  '/professional',
  '/uitnodigingen',
] as const

export function usesAuthenticatedWorkspace(pathname: string) {
  return authenticatedWorkspacePrefixes.some((prefix) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export function ApplicationChrome({
  banner,
  children,
  footer,
  header,
  headerModel,
}: {
  banner: ReactNode
  children: ReactNode
  footer: ReactNode
  header: ReactNode
  headerModel: HeaderViewModel
}) {
  const pathname = usePathname()
  const usesPlatformChrome =
    pathname === '/platformbeheer' || pathname.startsWith('/platformbeheer/')
  const usesAccountChrome = headerModel.authenticated &&
    !headerModel.isPlatformAdministrator &&
    usesAuthenticatedWorkspace(pathname)

  if (usesAccountChrome) {
    return (
      <div className="flex min-h-screen flex-col bg-background lg:h-dvh lg:min-h-0 lg:overflow-hidden">
        <div className="shrink-0">{header}</div>
        <div className="shrink-0">{banner}</div>
        <main
          id="main-content"
          className="mx-auto grid w-full max-w-[96rem] flex-1 gap-6 px-4 py-6 sm:px-6 lg:min-h-0 lg:grid-cols-[15rem_minmax(0,1fr)] lg:overflow-hidden lg:px-8"
        >
          <aside className="hidden self-start rounded-card border border-border bg-surface p-3 lg:block lg:min-h-0 lg:self-stretch lg:overflow-y-auto lg:overscroll-contain">
            <div className="border-b border-border px-3 pb-4">
              <p className="truncate text-sm font-semibold text-brand-dark">{headerModel.displayName}</p>
              {headerModel.activeOrganization ? (
                <>
                  <p className="mt-1 truncate text-sm text-text-secondary">{headerModel.activeOrganization.name}</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {organizationRoleLabels[headerModel.activeOrganization.role]}
                  </p>
                </>
              ) : null}
            </div>
            <AccountNavigationMenu groups={headerModel.navigationGroups} />
          </aside>
          <div className="min-w-0 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            {children}
          </div>
        </main>
        <div className="shrink-0">{footer}</div>
      </div>
    )
  }

  return (
    <div
      className={
        usesPlatformChrome
          ? 'flex min-h-screen flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden'
          : 'flex min-h-screen flex-col'
      }
    >
      {usesPlatformChrome ? null : header}
      {usesPlatformChrome ? <div className="shrink-0">{banner}</div> : banner}
      <main
        id="main-content"
        className={usesPlatformChrome ? 'flex-1 lg:min-h-0 lg:overflow-hidden' : 'flex-1'}
      >
        {children}
      </main>
      {usesPlatformChrome ? null : footer}
    </div>
  )
}
