import { AuthShell } from '@/components/auth/auth-shell'
import { RegisterForm } from '@/components/auth/register-form'
import { getSafeReturnUrl } from '@/lib/safe-redirect'

export const metadata = { title: 'Registreren | WorkMatchr' }
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const returnTo = getSafeReturnUrl((await searchParams).returnTo, '/dashboard')
  return <AuthShell title="Account registreren" intro="Kies hoe u WorkMatchr gebruikt en maak daarna uw persoonlijke account aan."><RegisterForm returnTo={returnTo} /></AuthShell>
}
