import { AuthShell } from '@/components/auth/auth-shell'
import { LoginForm } from '@/components/auth/login-form'

export const metadata = { title: 'Inloggen | WorkMatchr' }
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; toegang?: string }> }) { const params = await searchParams; return <AuthShell title="Inloggen" intro="Log veilig in op Uw persoonlijke WorkMatchr-account."><LoginForm returnTo={params.returnTo} accessDenied={params.toegang === 'geweigerd'} /></AuthShell> }
