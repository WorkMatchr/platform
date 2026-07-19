import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { publicFooterGroups } from '@/content/public-routes'

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <Container className="grid gap-10 py-12 text-sm text-text-secondary lg:grid-cols-[1.2fr_2fr]">
        <div>
          <Link href="/" className="inline-flex min-h-11 items-center rounded-control text-lg font-bold text-brand-dark">Work<span className="text-brand-primary">Matchr</span></Link>
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
