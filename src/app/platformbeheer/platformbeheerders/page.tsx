import {
  changePlatformAdministratorAccessAction,
  changePlatformAdministratorRoleAction,
  invitePlatformAdministratorAction,
  resendPlatformAdministratorInvitationAction,
  revokePlatformAdministratorInvitationAction,
} from '@/app/platformbeheer/actions'
import {
  AdminPageHeader,
  AdminSection,
  AdminTable,
  StatusPill,
} from '@/components/platform-admin/platform-admin-ui'
import { listPlatformAdministrators } from '@/lib/platform-admin/platform-admin-invitation-service'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'

const platformRoleLabels = {
  OWNER: 'Platformeigenaar',
  ADMIN: 'Platformbeheerder',
  MEMBER: 'Platformauditor',
} as const

const membershipStatusLabels = {
  ACTIVE: 'Actief',
  INVITED: 'Uitgenodigd',
  SUSPENDED: 'Geblokkeerd',
  REMOVED: 'Ingetrokken',
} as const

const invitationStatusLabels = {
  PENDING: 'Uitgenodigd',
  ACCEPTED: 'Geaccepteerd',
  EXPIRED: 'Verlopen',
  REVOKED: 'Ingetrokken',
} as const

export default async function PlatformAdministratorsPage({
  searchParams,
}: {
  searchParams: Promise<{ resultaat?: string; fout?: string }>
}) {
  const feedback = await searchParams
  const administrator = await requirePlatformAdministrator(
    '/platformbeheer/platformbeheerders',
  )
  const data = await listPlatformAdministrators(administrator.id)
  const canManage = data.context.platformMembership.role === 'OWNER'
  const latestInvitationByUser = new Map(
    data.invitations.map((invitation) => [invitation.subjectUserId, invitation]),
  )

  return (
    <>
      <AdminPageHeader
        eyebrow="Governance"
        title="Platformbeheerders"
        description="Beheer platformtoegang met gescheiden rollen, een controleerbare uitnodigingsflow en bescherming van de laatste platformeigenaar."
      />

      {feedback.resultaat ? (
        <p
          role="status"
          className="rounded-control border border-success-border bg-success-subtle p-4"
        >
          De beheeractie is veilig verwerkt.
        </p>
      ) : null}
      {feedback.fout ? (
        <p
          role="alert"
          className="rounded-control border border-error-border bg-error-subtle p-4"
        >
          De beheeractie kon niet worden uitgevoerd. Controleer uw bevoegdheid, de
          status en de ingevulde reden.
        </p>
      ) : null}

      <AdminSection title="Actieve toegang en uitnodigingen">
        <AdminTable
          headers={[
            'Naam',
            'E-mailadres',
            'Platformrol',
            'Status',
            'Laatste activiteit',
            'Uitnodiging',
            'Acties',
          ]}
        >
          {data.memberships.map((membership) => {
            const invitation = latestInvitationByUser.get(membership.userId)
            const invitationExpired = Boolean(
              invitation?.status === 'PENDING' && invitation.expiresAt <= new Date(),
            )
            const canChangeSubject =
              canManage && membership.userId !== administrator.id
            return (
              <tr key={membership.id}>
                <td className="px-4 py-3 font-semibold">
                  {membership.user.displayName?.trim() || 'Naam niet ingevuld'}
                </td>
                <td className="break-all px-4 py-3 text-sm">
                  {membership.user.email}
                </td>
                <td className="px-4 py-3">
                  {platformRoleLabels[membership.role]}
                </td>
                <td className="px-4 py-3">
                  <StatusPill
                    tone={
                      membership.status === 'ACTIVE'
                        ? 'good'
                        : membership.status === 'SUSPENDED'
                          ? 'bad'
                          : 'warning'
                    }
                  >
                    {membershipStatusLabels[membership.status]}
                  </StatusPill>
                </td>
                <td className="px-4 py-3 text-sm">
                  {membership.user.sessions[0]?.updatedAt.toLocaleString('nl-NL') ??
                    'Nog niet ingelogd'}
                </td>
                <td className="px-4 py-3 text-sm">
                  {invitation ? (
                    <>
                      <span className="block">
                        {invitationExpired
                          ? invitationStatusLabels.EXPIRED
                          : invitationStatusLabels[invitation.status]}
                      </span>
                      {invitation.status === 'PENDING' ? (
                        <span className="text-xs text-text-secondary">
                          Geldig tot {invitation.expiresAt.toLocaleString('nl-NL')}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    'Niet van toepassing'
                  )}
                </td>
                <td className="min-w-72 px-4 py-3">
                  {canManage && membership.status === 'INVITED' && invitation?.status === 'PENDING' ? (
                    <div className="grid gap-3">
                      <form action={resendPlatformAdministratorInvitationAction}>
                        <input type="hidden" name="invitationId" value={invitation.id} />
                        <button className="font-semibold text-brand-primary underline" type="submit">
                          Opnieuw versturen
                        </button>
                      </form>
                      <form action={revokePlatformAdministratorInvitationAction} className="grid gap-2">
                        <input type="hidden" name="invitationId" value={invitation.id} />
                        <label className="grid gap-1 text-xs font-semibold">
                          Reden voor intrekken
                          <input className="rounded-control border border-border px-3 py-2 font-normal" name="reason" minLength={10} maxLength={500} required />
                        </label>
                        <button className="justify-self-start font-semibold text-error underline" type="submit">
                          Uitnodiging intrekken
                        </button>
                      </form>
                    </div>
                  ) : null}

                  {canChangeSubject && ['ACTIVE', 'SUSPENDED'].includes(membership.status) ? (
                    <div className="grid gap-4">
                      {membership.status === 'ACTIVE' ? (
                        <form action={changePlatformAdministratorRoleAction} className="grid gap-2">
                          <input type="hidden" name="subjectUserId" value={membership.userId} />
                          <label className="grid gap-1 text-xs font-semibold">
                            Platformrol
                            <select className="rounded-control border border-border px-3 py-2 font-normal" name="role" defaultValue={membership.role}>
                              {Object.entries(platformRoleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                          </label>
                          <label className="grid gap-1 text-xs font-semibold">
                            Reden
                            <input className="rounded-control border border-border px-3 py-2 font-normal" name="reason" minLength={10} maxLength={500} required />
                          </label>
                          <button className="justify-self-start font-semibold text-brand-primary underline" type="submit">Rol wijzigen</button>
                        </form>
                      ) : null}
                      <form action={changePlatformAdministratorAccessAction} className="grid gap-2">
                        <input type="hidden" name="subjectUserId" value={membership.userId} />
                        <label className="grid gap-1 text-xs font-semibold">
                          Toegangsactie
                          <select className="rounded-control border border-border px-3 py-2 font-normal" name="operation" defaultValue={membership.status === 'SUSPENDED' ? 'unblock' : 'block'}>
                            {membership.status === 'SUSPENDED' ? <option value="unblock">Deblokkeren</option> : <option value="block">Blokkeren</option>}
                            <option value="revoke">Toegang intrekken</option>
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-semibold">
                          Reden
                          <input className="rounded-control border border-border px-3 py-2 font-normal" name="reason" minLength={10} maxLength={500} required />
                        </label>
                        <button className="justify-self-start font-semibold text-error underline" type="submit">Toegangsactie uitvoeren</button>
                      </form>
                    </div>
                  ) : null}

                  {!canManage ? (
                    <span className="text-sm text-text-secondary">Alleen lezen</span>
                  ) : null}
                  {membership.userId === administrator.id ? (
                    <span className="text-sm text-text-secondary">Uw huidige account</span>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </AdminTable>
      </AdminSection>

      {canManage ? (
        <AdminSection
          title="Nieuwe beheerder uitnodigen"
          description="De rol wordt pas actief nadat de genodigde de beveiligde uitnodiging heeft geaccepteerd en het e-mailadres is bevestigd."
        >
          <form
            action={invitePlatformAdministratorAction}
            className="grid gap-4 rounded-card border border-border bg-surface p-5 md:grid-cols-2"
          >
            <label className="grid gap-1 text-sm font-semibold">
              Naam
              <input className="rounded-control border border-border px-3 py-2 font-normal" name="displayName" required maxLength={100} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              E-mailadres
              <input className="rounded-control border border-border px-3 py-2 font-normal" name="email" type="email" required maxLength={254} />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Platformrol
              <select className="rounded-control border border-border px-3 py-2 font-normal" name="role" defaultValue="ADMIN">
                {Object.entries(platformRoleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="flex items-start gap-2 text-sm md:col-span-2">
              <input className="mt-1" type="checkbox" name="ownerConfirmed" />
              <span>Ik bevestig dat een uitnodiging als platformeigenaar volledige beheerrechten geeft. Deze bevestiging is alleen vereist wanneer u die rol kiest.</span>
            </label>
            <button className="min-h-11 justify-self-start rounded-control bg-brand-primary px-5 font-semibold text-white hover:bg-brand-dark" type="submit">
              Uitnodiging versturen
            </button>
          </form>
        </AdminSection>
      ) : (
        <p className="mt-6 rounded-card border border-border bg-surface p-5 text-sm text-text-secondary">
          U kunt platformbeheerders en uitnodigingen bekijken, maar niet wijzigen.
        </p>
      )}
    </>
  )
}
