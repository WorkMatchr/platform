import { AuthShell } from '@/components/auth/auth-shell'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata = { title: 'Registreren | WorkMatchr' }
export default function RegisterPage() { return <AuthShell title="Persoonlijk account registreren" intro="Maak eerst Uw persoonlijke WorkMatchr-account aan. Organisatie-inrichting volgt in een volgende module."><RegisterForm /></AuthShell> }
