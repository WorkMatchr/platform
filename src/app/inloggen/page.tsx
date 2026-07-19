import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/auth-shell'
import { LoginForm } from '@/components/auth/login-form'
import { publicRoutes } from '@/content/public-routes'

export const metadata: Metadata = {
  title: 'Inloggen | WorkMatchr',
  alternates: { canonical: publicRoutes.login },
  robots: { index: false, follow: false },
}
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; toegang?: string }> }) { const params = await searchParams; return <AuthShell title="Inloggen" intro="Log veilig in op uw persoonlijke WorkMatchr-account."><LoginForm returnTo={params.returnTo} accessDenied={params.toegang === 'geweigerd'} /></AuthShell> }
