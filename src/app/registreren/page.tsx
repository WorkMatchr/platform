import { AuthShell } from '@/components/auth/auth-shell'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata = { title: 'Registreren | WorkMatchr' }
export default function RegisterPage() { return <AuthShell title="Account registreren" intro="Kies hoe u WorkMatchr gebruikt en maak daarna uw persoonlijke account aan."><RegisterForm /></AuthShell> }
