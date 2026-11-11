import { AssignmentEmailPreference } from '@/components/account/assignment-email-preference'
import { getPrisma } from '@/lib/prisma'
import { AuthShell } from '@/components/auth/auth-shell'
import { LinkButton } from '@/components/ui/link-button'
import { getActiveOrganizationContext } from '@/lib/organizations/organization-authorization'
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
  const preference = context.user.accountType === 'PROFESSIONAL' ? await getPrisma().user.findUnique({ where: { id: context.user.id }, select: { assignmentEmailEnabled: true } }) : null
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
  return (
    <AuthShell title={model.title} intro="Beheer uw persoonlijke gegevens, meldingsvoorkeuren en accountbeveiliging." wide>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)] lg:items-start">
        <section aria-labelledby="accountgegevens-heading">
          {preference && <AssignmentEmailPreference enabled={preference.assignmentEmailEnabled} />}
          <h2 id="accountgegevens-heading" className="font-semibold text-brand-dark">Mijn account</h2>
          <a href="/account/academy-aankopen" className="underline">Academy-aankopen en herroeping</a>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label="E-mailadres" value={model.email} />
            <Detail label="Verificatiestatus" value={model.emailVerificationLabel} />
            <Detail label="Platformrol" value={model.platformRoleLabel} />
            <Detail label="Accounttype" value={model.accountTypeLabel} />
            <Detail label="Accountstatus" value={model.accountStatusLabel} />
          </dl>
          <p className="mt-4 text-sm leading-6 text-text-secondary">Uw rechten binnen een organisatie beheert u via Organisatie.</p>
        </section>

        <div className="grid gap-6">

          <section aria-labelledby="accountbeveiliging-heading" className="rounded-card border border-border bg-surface p-5">
            <h2 id="accountbeveiliging-heading" className="font-semibold text-brand-dark">Beveiliging</h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">Beheer uw wachtwoord en hersteltoegang voor uw persoonlijke account.</p>
            <div className="mt-5"><LinkButton href="/account/beveiliging" variant="outline">Accountbeveiliging</LinkButton></div>
          </section>
        </div>
      </div>
    </AuthShell>
  )
}
