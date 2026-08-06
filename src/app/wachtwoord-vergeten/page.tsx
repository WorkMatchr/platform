import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth/auth-shell'
import { EmailRequestForm } from '@/components/auth/email-request-form'

export const metadata: Metadata = { title: 'Wachtwoord vergeten | WorkMatchr' }

export default function ForgotPasswordPage() { return <AuthShell title="Wachtwoord vergeten" intro="Vraag een veilige link aan om een nieuw wachtwoord in te stellen."><EmailRequestForm mode="reset" /></AuthShell> }
