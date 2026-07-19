import Link from 'next/link'
import { LogoutButton } from '@/components/auth/logout-button'
import { Container } from '@/components/layout/container'
import { DisclosureMenu } from '@/components/ui/disclosure-menu'
import { getOptionalActiveOrganizationContext } from '@/lib/organizations/organization-authorization'
import { PublicNavigation } from './public-navigation'
import { buildHeaderViewModel, type HeaderViewModel } from './header-model'

const roleLabels = { OWNER: 'Eigenaar', ADMIN: 'Beheerder', MEMBER: 'Lid' } as const

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
        <nav className="hidden lg:block" aria-label="Dashboardnavigatie">
          <ul className="flex items-center gap-2">
            {model.primaryLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-text-secondary hover:bg-brand-primary-subtle hover:text-brand-dark"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <DisclosureMenu
          ariaLabel="Gebruikersmenu openen of sluiten"
          className="relative"
          buttonClassName="flex min-h-11 items-center rounded-control border border-border bg-surface px-4 text-sm font-semibold text-brand-dark"
          panelClassName="absolute right-0 z-30 mt-3 w-64 rounded-card border border-border bg-surface p-3 shadow-card"
          trigger={
            <span>
              <span className="block">
                {model.displayName} <span aria-hidden="true">&#9662;</span>
              </span>
              {model.activeOrganization && (
                <span className="block max-w-48 truncate text-xs font-normal text-text-secondary">
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
                {roleLabels[model.activeOrganization.role]}
              </p>
            )}
            {model.primaryLinks.length > 0 && (
              <nav className="mt-2 border-b border-border pb-2 lg:hidden" aria-label="Mobiele dashboardnavigatie">
                <ul className="space-y-1">
                  {model.primaryLinks.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand-dark hover:bg-brand-primary-subtle"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
            <nav className="mt-2" aria-label="Gebruikersmenu">
              <ul className="space-y-1">
                {model.menuLinks.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand-dark hover:bg-brand-primary-subtle"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <LogoutButton className="w-full justify-start px-3" variant="ghost" />
                </li>
              </ul>
            </nav>
        </DisclosureMenu>
      </Container>
    </header>
  )
}

export async function Header() {
  const context = await getOptionalActiveOrganizationContext()
  const model = buildHeaderViewModel(context)
  return model.authenticated ? <DashboardHeader model={model} /> : <PublicHeader />
}
