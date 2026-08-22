import type { Metadata } from 'next'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/auth-shell'
import { requireUser } from '@/lib/authorization'

export const metadata: Metadata = { title: 'Beveiliging | WorkMatchr', robots: { index: false, follow: false } }

export default async function AccountSecurityPage() {
  await requireUser('/account/beveiliging')

  return (
    <AuthShell title="Beveiliging" intro="Beheer de beveiliging van uw account.">
      <nav aria-label="Broodkruimel" className="mb-6 text-sm text-text-secondary"><Link href="/account" className="font-semibold text-brand-primary hover:underline">Account</Link><span aria-hidden="true"> › </span><span>Beveiliging</span></nav>
      <section className="rounded-card border border-border bg-surface p-5" aria-labelledby="wachtwoord-heading">
        <h2 id="wachtwoord-heading" className="font-semibold text-brand-dark">Wachtwoord</h2>
        <p className="mt-3 text-sm leading-6 text-text-secondary">Gebruik een sterk, uniek wachtwoord. U kunt via de herstelroute een nieuw wachtwoord instellen.</p>
        <Link href="/wachtwoord-vergeten" className="mt-5 inline-flex min-h-10 items-center rounded-control border border-brand-primary px-4 text-sm font-semibold text-brand-primary hover:bg-brand-primary-subtle">Wachtwoord wijzigen</Link>
      </section>
    </AuthShell>
  )
}
