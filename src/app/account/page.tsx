import { AuthShell, StatusMessage } from '@/components/auth/auth-shell'
import { LogoutButton } from '@/components/auth/logout-button'
import { LinkButton } from '@/components/ui/link-button'
import { getActiveOrganizationContext } from '@/lib/organizations/organization-authorization'
import { canManageOrganization } from '@/lib/organizations/organization-policy'
import {
  getPlatformContext,
  PlatformAdminAccessError,
} from '@/lib/platform-admin/platform-admin-authorization'
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
  let isPlatformAdministrator = false
  if (context.user.platformRole === 'ADMIN') {
    try {
      await getPlatformContext(context.user.id)
      isPlatformAdministrator = true
    } catch (error) {
      if (!(error instanceof PlatformAdminAccessError)) throw error
    }
  }
  const model = buildAccountViewModel(context, isPlatformAdministrator)
  const hasOrganization = model.organizationCount > 0
  const manageableOrganization = Boolean(
    context.activeMembership && canManageOrganization(
      context.activeMembership.role,
      context.activeMembership.status,
      context.activeMembership.organization.status,
    ),
  )

  return (
    <AuthShell title={model.title} intro="Dit is uw persoonlijke WorkMatchr-account." wide>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)] lg:items-start">
        <section aria-labelledby="accountgegevens-heading">
          <h2 id="accountgegevens-heading" className="font-semibold text-brand-dark">Persoonlijk account</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label="E-mailadres" value={model.email} />
            <Detail label="Verificatiestatus" value={model.emailVerificationLabel} />
            <Detail label="Platformrol" value={model.platformRoleLabel} />
            <Detail label="Accounttype" value={model.accountTypeLabel} />
            <Detail label="Accountstatus" value={model.accountStatusLabel} />
          </dl>
          <p className="mt-4 text-sm leading-6 text-text-secondary">De platformrol staat los van uw rechten binnen een organisatie. Uw actuele organisatierol staat hieronder.</p>
          {model.activeOrganization ? (
            <section aria-labelledby="organisatiecontext-heading" className="mt-8 border-t border-border pt-7">
              <h2 id="organisatiecontext-heading" className="font-semibold text-brand-dark">Actieve organisatie</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <Detail label="Organisatienaam" value={model.activeOrganization.name} />
                <Detail label="Rol binnen organisatie" value={model.activeOrganization.roleLabel} />
                <Detail label="Organisatietype" value={model.activeOrganization.typeLabel} />
                <Detail label="Organisatiestatus" value={model.activeOrganization.statusLabel} />
              </dl>
            </section>
          ) : null}
        </section>

        <div className="grid gap-6">
          <section aria-labelledby="uw-organisatie-heading" className="rounded-card border border-border bg-surface p-5">
            <h2 id="uw-organisatie-heading" className="font-semibold text-brand-dark">Uw organisatie</h2>
            {model.isPlatformAdministrator ? (
              <><p className="mt-3 text-sm leading-6 text-text-secondary">Dit account is gekoppeld aan de beveiligde beheeromgeving van WorkMatchr.</p><div className="mt-5"><LinkButton href="/platformbeheer">Naar platformbeheer</LinkButton></div></>
            ) : hasOrganization ? (
              <><p className="mt-3 text-sm leading-6 text-text-secondary">Bekijk de gegevens van uw actieve organisatie of beheer deze als uw organisatierol dat toestaat.</p><div className="mt-5 flex flex-col gap-3 sm:flex-row">{manageableOrganization ? <LinkButton href="/organisatie/profiel">Profiel wijzigen</LinkButton> : null}{manageableOrganization ? <LinkButton href="/organisatie/gebruikers" variant="outline">Gebruikers beheren</LinkButton> : <LinkButton href="/organisatie" variant="outline">Naar uw organisatie</LinkButton>}</div></>
            ) : (
              <><StatusMessage>Maak uw organisatie aan om uw WorkMatchr-omgeving in te richten.</StatusMessage><div className="mt-5"><LinkButton href="/organisatie/nieuw">Maak uw organisatie aan</LinkButton></div></>
            )}
          </section>

          <section aria-labelledby="accountbeveiliging-heading" className="rounded-card border border-border bg-surface p-5">
            <h2 id="accountbeveiliging-heading" className="font-semibold text-brand-dark">Beveiliging</h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">Beheer uw wachtwoord en hersteltoegang voor uw persoonlijke account.</p>
            <div className="mt-5"><LinkButton href="/account/beveiliging" variant="outline">Accountbeveiliging</LinkButton></div>
          </section>
          {hasOrganization ? (
            <section aria-labelledby="arbo-wijzers-heading" className="rounded-card border border-border bg-surface p-5">
              <h2 id="arbo-wijzers-heading" className="font-semibold text-brand-dark">Mijn Arbo-wijzers</h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary">Bekijk afgeronde wijzers van uw organisatie en download eerdere rapporten opnieuw.</p>
              <div className="mt-5"><LinkButton href="/mijn-arbo-wijzers" variant="outline">Bekijk Mijn Arbo-wijzers</LinkButton></div>
            </section>
          ) : null}
          <div><LogoutButton /></div>
        </div>
      </div>
    </AuthShell>
  )
}
