import Link from 'next/link'
import { AuthShell, StatusMessage } from '@/components/auth/auth-shell'
import { EmailRequestForm } from '@/components/auth/email-request-form'

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) { const params = await searchParams; return <AuthShell title="E-mailadres bevestigen" intro="Een bevestigd e-mailadres is verplicht om in te loggen.">{params.status === 'geslaagd' ? <><StatusMessage>Uw e-mailadres is bevestigd. U kunt nu inloggen.</StatusMessage><Link className="mt-5 inline-block font-semibold underline" href="/inloggen">Naar inloggen</Link></> : <><EmailRequestForm mode="verification" />{params.error && <p className="mt-4 text-sm text-error">De verificatielink is ongeldig of verlopen.</p>}</>}</AuthShell> }
