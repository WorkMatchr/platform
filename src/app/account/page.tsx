import { AuthShell, StatusMessage } from '@/components/auth/auth-shell'
import { LogoutButton } from '@/components/auth/logout-button'
import { OrganizationSwitcher } from '@/components/organizations/organization-switcher'
import { LinkButton } from '@/components/ui/link-button'
import { getActiveOrganizationContext } from '@/lib/organizations/organization-authorization'
import { buildAccountViewModel } from './account-view-model'

export const metadata = { title: 'Uw account | WorkMatchr' }

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm font-semibold text-text-secondary">{label}</dt>
      <dd className="mt-1 break-words font-medium text-text-primary [overflow-wrap:anywhere]">{value}</dd>
    </div>
  )
}

export default async function AccountPage() {
  const context = await getActiveOrganizationContext()
  const model = buildAccountViewModel(context)
  const hasOrganization = model.organizationCount > 0

  return (
    <AuthShell title={model.title} intro="Dit is Uw persoonlijke WorkMatchr-account." wide>
      <section aria-labelledby="accountgegevens-heading">
        <h2 id="accountgegevens-heading" className="font-semibold text-brand-dark">
          Persoonlijk account
        </h2>
        <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
          <Detail label="E-mailadres" value={model.email} />
          <Detail label="Verificatiestatus" value={model.emailVerificationLabel} />
          <Detail label="Platformrol" value={model.platformRoleLabel} />
          <Detail label="Accountstatus" value={model.accountStatusLabel} />
        </dl>
        <p className="mt-4 text-sm text-text-secondary">
          De platformrol staat los van Uw rechten binnen een organisatie. Uw actuele organisatierol staat hieronder.
        </p>
      </section>

      <section aria-labelledby="organisatiecontext-heading" className="mt-8 border-t border-border pt-7">
        <h2 id="organisatiecontext-heading" className="font-semibold text-brand-dark">
          Actieve organisatie
        </h2>
        {model.activeOrganization ? (
          <>
            <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
              <Detail label="Organisatienaam" value={model.activeOrganization.name} />
              <Detail label="Rol binnen actieve organisatie" value={model.activeOrganization.roleLabel} />
              <Detail label="Organisatietype" value={model.activeOrganization.typeLabel} />
              <Detail label="Organisatiestatus" value={model.activeOrganization.statusLabel} />
            </dl>
            {model.organizationCount > 1 && (
              <div className="mt-6">
                <OrganizationSwitcher
                  activeOrganizationId={model.activeOrganization.id}
                  organizations={model.organizations}
                />
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-text-secondary">Er is nog geen actieve organisatie.</p>
        )}
      </section>

      <div className="mt-7">
        <StatusMessage>
          {hasOrganization
            ? `U heeft toegang tot ${model.organizationCount === 1 ? 'één organisatie' : `${model.organizationCount} organisaties`}.`
            : 'Maak Uw organisatie aan om Uw WorkMatchr-omgeving in te richten.'}
        </StatusMessage>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <LinkButton href={hasOrganization ? '/organisatie' : '/organisatie/nieuw'}>
          {hasOrganization ? 'Naar Uw organisatie' : 'Maak Uw organisatie aan'}
        </LinkButton>
        {hasOrganization && (
          <LinkButton href="/organisatie/nieuw" variant="outline">
            Organisatie toevoegen
          </LinkButton>
        )}
      </div>
      <div className="mt-7">
        <LogoutButton />
      </div>
    </AuthShell>
  )
}
