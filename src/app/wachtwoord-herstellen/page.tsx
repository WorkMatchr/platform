import { AuthShell } from '@/components/auth/auth-shell'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; return <AuthShell title="Wachtwoord herstellen" intro="Kies een nieuw wachtwoord van minimaal 12 tekens."><ResetPasswordForm token={token} /></AuthShell> }
