import Link from 'next/link'
import type { Metadata } from 'next'
import { ActivateAccountForm } from '@/components/auth/activate-account-form'
import { AuthShell, StatusMessage } from '@/components/auth/auth-shell'
import { getInvitationActivationView } from '@/lib/account-architecture/invitation-activation-query'

export const metadata: Metadata = { title: 'Account activeren | WorkMatchr' }

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams
  const activation = !error && token ? await getInvitationActivationView(token) : null

  return (
    <AuthShell
      title="Account activeren"
      intro="Welkom bij WorkMatchr. Kies een persoonlijk wachtwoord om uw account te activeren."
    >
      {activation && token ? (
        <>
          <p className="mb-6 text-text-secondary">
            U bent uitgenodigd door: <strong className="text-text-primary">{activation.organizationName}</strong>
          </p>
          <ActivateAccountForm token={token} email={activation.email} />
        </>
      ) : (
        <>
          <StatusMessage error>
            Deze activatielink is ongeldig of verlopen. Vraag uw organisatie om de uitnodiging opnieuw te verzenden.
          </StatusMessage>
          <Link className="mt-5 inline-block font-semibold underline" href="/inloggen">
            Naar inloggen
          </Link>
        </>
      )}
    </AuthShell>
  )
}
