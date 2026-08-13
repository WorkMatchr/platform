import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/auth-shell'
import { TwoFactorChallengeForm } from '@/components/auth/two-factor-challenge-form'

export const metadata: Metadata = { title: 'Tweestapsverificatie | WorkMatchr', robots: { index: false, follow: false } }

export default async function TwoFactorChallengePage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const params = await searchParams
  return <AuthShell title="Tweestapsverificatie" intro="Vul de code uit uw authenticator-app in om veilig in te loggen."><TwoFactorChallengeForm returnTo={params.returnTo} /></AuthShell>
}
