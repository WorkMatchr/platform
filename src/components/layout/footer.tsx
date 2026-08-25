import Link from 'next/link'
import { WorkMatchrLogo } from '@/components/branding/workmatchr-logo'
import { Container } from '@/components/layout/container'
import { publicFooterGroups, publicRoutes } from '@/content/public-routes'

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <Container className="grid gap-10 py-12 text-sm text-text-secondary lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Link href="/" aria-label="WorkMatchr, naar de homepage" className="inline-flex min-h-11 items-center rounded-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">
            <WorkMatchrLogo size="header" />
          </Link>
          <p className="mt-3 max-w-sm leading-6">Onafhankelijke digitale begeleiding bij arbo- en veiligheidsvragen.</p>
          <p className="mt-5 max-w-lg text-xs leading-5">
            De informatie op WorkMatchr is algemeen van aard en vervangt geen beoordeling van uw specifieke situatie door een bevoegde deskundige.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {publicFooterGroups.map((group) => (
            <nav key={group.title} aria-label={`${group.title} in de voettekst`}>
              <p className="font-semibold text-brand-dark">{group.title}</p>
              <ul className="mt-3 space-y-1">
                {group.links.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="inline-flex min-h-11 items-center rounded-control hover:text-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </Container>
      <div className="border-t border-border">
        <Container className="py-5 text-sm text-text-secondary">WorkMatchr © {new Date().getFullYear()}</Container>
      </div>
    </footer>
  )
}

export function CompactFooter() {
  return (
    <footer className="border-t border-border bg-surface text-sm text-text-secondary">
      <div className="mx-auto flex w-full max-w-[96rem] flex-wrap items-center justify-center gap-x-5 px-4 py-1 sm:px-6 lg:justify-between lg:px-8">
        <p className="shrink-0 py-2">WorkMatchr © {new Date().getFullYear()}</p>
        <nav aria-label="Juridische links in de voettekst">
          <ul className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-5">
            <li><Link href={publicRoutes.privacy} className="inline-flex min-h-11 items-center rounded-control hover:text-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">Privacy</Link></li>
            <li><Link href={publicRoutes.cookies} className="inline-flex min-h-11 items-center rounded-control hover:text-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">Cookies</Link></li>
            <li><Link href={publicRoutes.terms} className="inline-flex min-h-11 items-center rounded-control hover:text-brand-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">Algemene voorwaarden</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
