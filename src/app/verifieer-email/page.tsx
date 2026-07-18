import Link from 'next/link'
import { AuthShell, StatusMessage } from '@/components/auth/auth-shell'
import { EmailRequestForm } from '@/components/auth/email-request-form'

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const params = await searchParams
  const invitation = params.status === 'uitnodiging'
  return (
    <AuthShell title="E-mailadres bevestigen" intro="Een bevestigd e-mailadres is verplicht om in te loggen.">
      {params.status === 'geslaagd' || invitation ? (
        <>
          <StatusMessage>
            {invitation
              ? 'Uw e-mailadres is bevestigd. Stel nu via de beveiligde herstelroute Uw eigen wachtwoord in.'
              : 'Uw e-mailadres is bevestigd. U kunt nu inloggen.'}
          </StatusMessage>
          <Link className="mt-5 inline-block font-semibold underline" href={invitation ? '/wachtwoord-vergeten' : '/inloggen'}>
            {invitation ? 'Eigen wachtwoord instellen' : 'Naar inloggen'}
          </Link>
        </>
      ) : (
        <>
          <EmailRequestForm mode="verification" />
          {params.error && <p className="mt-4 text-sm text-error">De verificatielink is ongeldig of verlopen.</p>}
        </>
      )}
    </AuthShell>
  )
}
