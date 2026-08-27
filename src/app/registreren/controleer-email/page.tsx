import Link from 'next/link'
import type { Metadata } from 'next'
import { AuthShell, StatusMessage } from '@/components/auth/auth-shell'
import { getSafeReturnUrl } from '@/lib/safe-redirect'

export const metadata: Metadata = { title: 'Controleer uw e-mail | WorkMatchr' }

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const returnTo = getSafeReturnUrl((await searchParams).returnTo, '/dashboard')
  return <AuthShell title="Controleer uw e-mail" intro="Uw registratie is ontvangen."><StatusMessage>Als registratie mogelijk was, ontvangt u een bericht om uw e-mailadres te bevestigen.</StatusMessage><p className="mt-5 text-sm"><Link className="underline" href={`/verifieer-email?returnTo=${encodeURIComponent(returnTo)}`}>Geen bericht ontvangen?</Link></p></AuthShell>
}
