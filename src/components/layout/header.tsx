import Link from 'next/link'
import { AccountNavigationMenu } from '@/components/layout/account-navigation-menu'
import { Container } from '@/components/layout/container'
import { DisclosureMenu } from '@/components/ui/disclosure-menu'
import { getOptionalActiveOrganizationContext } from '@/lib/organizations/organization-authorization'
import {
  getPlatformContext,
  PlatformAdminAccessError,
} from '@/lib/platform-admin/platform-admin-authorization'
import { organizationRoleLabels } from '@/lib/presentation/platform-labels'
import { PublicNavigation } from './public-navigation'
import { buildHeaderViewModel, type HeaderViewModel } from './header-model'
import { HeaderBrandLink } from './header-brand-link'

function PublicHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <Container className="flex min-h-20 items-center justify-between gap-5 py-4">
        <HeaderBrandLink />
        <PublicNavigation />
      </Container>
    </header>
  )
}

function DashboardHeader({ model }: { model: HeaderViewModel }) {
  return (
    <header className="border-b border-border bg-surface">
      <Container className="flex min-h-20 items-center justify-between gap-5 py-4">
        <HeaderBrandLink />
        <div className="flex min-w-0 items-center gap-2">
          {model.isPlatformAdministrator ? (
            <Link
              href="/platformbeheer"
              className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand-dark hover:bg-brand-primary-subtle"
            >
              Platformbeheer
            </Link>
          ) : (
            <PublicNavigation authenticated />
          )}
          {!model.isPlatformAdministrator && (
            <DisclosureMenu
            ariaLabel="Accountmenu openen of sluiten"
            className="relative shrink-0 lg:hidden"
            buttonClassName="flex min-h-11 items-center rounded-control border border-border bg-surface px-3 text-sm font-semibold text-brand-dark sm:px-4"
            panelClassName="absolute right-0 z-30 mt-3 max-h-[calc(100vh-7rem)] w-[min(18rem,calc(100vw-2.5rem))] overflow-y-auto rounded-card border border-border bg-surface p-3 shadow-card"
            trigger={
              <span>
                <span className="block">
                  {model.displayName} <span aria-hidden="true">&#9662;</span>
                </span>
                {model.activeOrganization && (
                  <span className="hidden max-w-48 truncate text-xs font-normal text-text-secondary sm:block">
                    {model.activeOrganization.name}
                  </span>
                )}
              </span>
            }
          >
            {model.activeOrganization && (
              <p className="border-b border-border px-3 pb-3 text-xs text-text-secondary">
                Actieve organisatie
                <br />
                <span className="font-semibold text-brand-dark">{model.activeOrganization.name}</span>
                <br />
                {organizationRoleLabels[model.activeOrganization.role]}
              </p>
            )}
            <AccountNavigationMenu groups={model.navigationGroups} />
          </DisclosureMenu>
          )}
          {!model.isPlatformAdministrator && (
            <Link
              href="/dashboard"
              className="hidden min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand-dark hover:bg-brand-primary-subtle lg:inline-flex"
            >
              Mijn omgeving
            </Link>
          )}
          {model.isPlatformAdministrator && (
            <Link
              href="/account"
              className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand-dark hover:bg-brand-primary-subtle"
            >
              Account
            </Link>
          )}
        </div>
      </Container>
    </header>
  )
}

export async function getHeaderViewModel() {
  const context = await getOptionalActiveOrganizationContext()
  let isPlatformAdministrator = false
  if (context?.user.platformRole === 'ADMIN') {
    try {
      await getPlatformContext(context.user.id)
      isPlatformAdministrator = true
    } catch (error) {
      if (!(error instanceof PlatformAdminAccessError)) throw error
    }
  }
  return buildHeaderViewModel(context, isPlatformAdministrator)
}

export async function Header({ model }: { model?: HeaderViewModel } = {}) {
  const resolvedModel = model ?? await getHeaderViewModel()
  return resolvedModel.authenticated ? <DashboardHeader model={resolvedModel} /> : <PublicHeader />
}
