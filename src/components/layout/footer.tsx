import Link from 'next/link'
import { Container } from '@/components/layout/container'

const footerLinks = [
  { href: '#privacy', label: 'Privacy' },
  { href: '#algemene-voorwaarden', label: 'Algemene voorwaarden' },
  { href: '#contact', label: 'Contact' },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <Container className="flex flex-col gap-5 py-8 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-semibold text-brand-dark">WorkMatchr</span> © {new Date().getFullYear()}
        </p>
        <nav aria-label="Voettekstnavigatie">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-control transition-colors duration-normal hover:text-brand-primary-hover"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </footer>
  )
}
