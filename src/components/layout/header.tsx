import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { LinkButton } from '@/components/ui/link-button'

const navigation = [
  { href: '/', label: 'Home' },
  { href: '#hoe-werkt-het', label: 'Hoe werkt het?' },
  { href: '#voor-opdrachtgevers', label: 'Voor opdrachtgevers' },
  { href: '#voor-aanbieders', label: 'Voor aanbieders' },
]

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

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <Container className="flex min-h-20 items-center justify-between gap-5 py-4">
        <BrandLink />

        <div className="hidden items-center gap-7 lg:flex">
          <nav aria-label="Hoofdnavigatie">
            <ul className="flex items-center gap-5 text-sm font-medium text-text-secondary">
              {navigation.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center rounded-control px-1 transition-colors duration-normal hover:text-brand-primary-hover"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/inloggen"
                  className="inline-flex min-h-11 items-center rounded-control px-1 transition-colors duration-normal hover:text-brand-primary-hover"
                >
                  Inloggen
                </Link>
              </li>
            </ul>
          </nav>
          <LinkButton href="#intake">Start Uw intake</LinkButton>
        </div>

        <details className="group relative lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-control border border-border bg-surface px-4 text-sm font-semibold text-brand-dark marker:content-none">
            Menu
            <span aria-hidden="true" className="ml-2 text-lg leading-none group-open:rotate-45">
              +
            </span>
          </summary>
          <div className="absolute right-0 z-20 mt-3 w-[min(20rem,calc(100vw-2.5rem))] rounded-card border border-border bg-surface p-4 shadow-card">
            <nav aria-label="Mobiele hoofdnavigatie">
              <ul className="space-y-1 text-sm font-medium text-text-secondary">
                {navigation.map((item) => (
                  <li key={item.label}>
                    <Link className="flex min-h-11 items-center rounded-control px-3 hover:bg-brand-primary-subtle" href={item.href}>
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link className="flex min-h-11 items-center rounded-control px-3 hover:bg-brand-primary-subtle" href="/inloggen">
                    Inloggen
                  </Link>
                </li>
              </ul>
              <LinkButton href="#intake" className="mt-3 w-full">
                Start Uw intake
              </LinkButton>
            </nav>
          </div>
        </details>
      </Container>
    </header>
  )
}
