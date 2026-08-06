import Link from 'next/link'
import { LogoutButton } from '@/components/auth/logout-button'
import { Container } from '@/components/layout/container'
import { DisclosureMenu } from '@/components/ui/disclosure-menu'
import { getOptionalActiveOrganizationContext } from '@/lib/organizations/organization-authorization'
import {
  getPlatformAdministratorContext,
  PlatformAdminAccessError,
} from '@/lib/platform-admin/platform-admin-authorization'
import { organizationRoleLabels } from '@/lib/presentation/platform-labels'
import { PublicNavigation } from './public-navigation'
import { buildHeaderViewModel, type HeaderViewModel } from './header-model'

function BrandLink() {
  return (
    <Link
      href="/"
      className="rounded-control text-xl font-bold tracking-tight text-brand-dark"
      aria-label="WorkMatchr, naar de homepage"
    >
      Work<span className="text-brand-primary">Matchr</span>
    </Link>
  )
}

function PublicHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <Container className="flex min-h-20 items-center justify-between gap-5 py-4">
        <BrandLink />
        <PublicNavigation />
      </Container>
    </header>
  )
}

function DashboardHeader({ model }: { model: HeaderViewModel }) {
  return (
    <header className="border-b border-border bg-surface">
      <Container className="flex min-h-20 items-center justify-between gap-5 py-4">
        <BrandLink />
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
          <DisclosureMenu
            ariaLabel="Gebruikersmenu openen of sluiten"
            className="relative shrink-0"
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
            <div className="mt-1 divide-y divide-border">
              {model.navigationGroups.map((group) => {
                const headingId = `user-navigation-${group.key}`
                return (
                  <nav className="py-2" aria-labelledby={headingId} key={group.key}>
                    <h2
                      className="px-3 pb-1 text-xs font-semibold tracking-wide text-text-secondary"
                      id={headingId}
                    >
                      {group.label}
                    </h2>
                    <ul className="space-y-1">
                      {group.links.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand-dark hover:bg-brand-primary-subtle"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                      {group.key === 'personal' && (
                        <li>
                          <LogoutButton className="w-full justify-start px-3" variant="ghost" />
                        </li>
                      )}
                    </ul>
                  </nav>
                )
              })}
            </div>
          </DisclosureMenu>
        </div>
      </Container>
    </header>
  )
}

export async function Header() {
  const context = await getOptionalActiveOrganizationContext()
  let isPlatformAdministrator = false
  if (context?.user.platformRole === 'ADMIN') {
    try {
      await getPlatformAdministratorContext(context.user.id)
      isPlatformAdministrator = true
    } catch (error) {
      if (!(error instanceof PlatformAdminAccessError)) throw error
    }
  }
  const model = buildHeaderViewModel(context, isPlatformAdministrator)
  return model.authenticated ? <DashboardHeader model={model} /> : <PublicHeader />
}
