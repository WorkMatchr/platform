import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import {
  blockOrganizationAccountAction,
  changeOrganizationRoleAction,
  inviteOrganizationUserAction,
  resendOrganizationInvitationAction,
  resendOrganizationRoleNotificationAction,
  unblockOrganizationAccountAction,
} from './actions'
import { AccountLifecycleDialog } from '@/components/organizations/account-lifecycle-dialog'
import { OrganizationInvitationForm } from '@/components/organizations/organization-invitation-form'
import { InvitationResendButton } from '@/components/organizations/invitation-resend-button'
import { OrganizationRoleDialog } from '@/components/organizations/organization-role-dialog'
import { RoleNotificationResendButton } from '@/components/organizations/role-notification-resend-button'
import { Section } from '@/components/layout/section'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { AccountManagementQueryError, getOrganizationAccountManagement } from '@/lib/account-architecture/account-management-query-service'

export const metadata: Metadata = { title: 'Gebruikers beheren | WorkMatchr' }

const roleLabels = { OWNER: 'Eigenaar', ADMIN: 'Beheerder', MEMBER: 'Lid' } as const
const accountStatusLabels = {
  INVITED: 'Activatie open',
  ACTIVE: 'Actief',
  BLOCKED: 'Geblokkeerd',
  ARCHIVED: 'Gearchiveerd',
  DELETION_PENDING: 'Verwijdering in behandeling',
  ANONYMIZED: 'Geanonimiseerd',
} as const

const resultNotices: Record<string, { message: string; tone: 'success' | 'warning' | 'error' }> = {
  geblokkeerd: { message: 'Het account is geblokkeerd en alle actieve sessies zijn ingetrokken.', tone: 'success' },
  gedeblokkeerd: { message: 'Het account is gedeblokkeerd. De gebruiker moet opnieuw inloggen.', tone: 'success' },
  uitgenodigd: { message: 'De gebruiker is uitgenodigd en ontvangt een bericht om het eigen account te activeren.', tone: 'success' },
  'opnieuw-uitgenodigd': { message: 'Het verificatiebericht voor de bestaande uitnodiging is opnieuw verstuurd.', tone: 'success' },
  'rol-gewijzigd-mail-verzonden': {
    message: 'De rol is gewijzigd, alle sessies zijn beëindigd en de e-mailprovider heeft de notificatie geaccepteerd.',
    tone: 'success',
  },
  'rol-gewijzigd-mail-test': {
    message: 'De rol is gewijzigd en alle sessies zijn beëindigd. De notificatie is alleen via de lokale testafhandeling verwerkt.',
    tone: 'warning',
  },
  'rol-gewijzigd-mail-mislukt': {
    message: 'De rol is gewijzigd en alle sessies zijn beëindigd, maar de notificatiemail kon niet worden verzonden.',
    tone: 'error',
  },
  'rolmail-opnieuw-verzonden': { message: 'De e-mailprovider heeft de opnieuw verstuurde rolnotificatie geaccepteerd.', tone: 'success' },
  'rolmail-opnieuw-test': { message: 'De rolnotificatie is alleen via de lokale testafhandeling verwerkt.', tone: 'warning' },
  'rolmail-opnieuw-mislukt': { message: 'De rolnotificatie kon nog niet worden verzonden.', tone: 'error' },
}

export default async function OrganizationUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const context = await requireOrganizationMembership(undefined, '/organisatie/gebruikers')
  let model
  try {
    model = await getOrganizationAccountManagement(context.user.id, context.activeMembership.organization.id)
  } catch (error) {
    if (error instanceof AccountManagementQueryError) redirect('/organisatie?toegang=alleen-lezen')
    throw error
  }
  const query = await searchParams
  const resultKey = typeof query.resultaat === 'string' ? query.resultaat : ''
  const notice = resultNotices[resultKey]
  const noticeClassName = notice?.tone === 'error'
    ? 'bg-error/10 text-error'
    : notice?.tone === 'warning'
      ? 'bg-warning/10 text-brand-dark'
      : 'bg-success/10 text-success'

  return (
    <Section spacing="compact">
      <Heading as="h1" size="h2">Gebruikers beheren</Heading>
      <p className="mt-3 max-w-3xl text-text-secondary">
        Beheer de toegang tot {model.organization.name}. Blokkeren is herstelbaar en verwijdert geen historie of organisatiegegevens.
      </p>
      {notice && (
        <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mt-5 rounded-control p-3 ${noticeClassName}`}>
          {notice.message}
        </p>
      )}
      {model.canInviteMember && (
        <Card className="mt-8">
          <h2 className="text-xl font-bold text-brand-dark">Gebruiker uitnodigen</h2>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            Iedere gebruiker krijgt een eigen account en e-mailadres voor uitsluitend deze organisatie.
          </p>
          <OrganizationInvitationForm
            action={inviteOrganizationUserAction}
            idempotencyKey={`invite:${randomUUID()}`}
            canInviteAdmin={model.canInviteAdmin}
          />
        </Card>
      )}
      <div className="mt-8 grid gap-5">
        {model.accounts.map((account) => (
          <Card key={account.userId} className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-brand-dark">{account.displayName}</h2>
                <Badge variant={account.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>{accountStatusLabels[account.accountStatus]}</Badge>
              </div>
              <p className="mt-1 break-all text-sm text-text-secondary">{account.email}</p>
              <p className="mt-2 text-sm">Rol: <span className="font-semibold">{roleLabels[account.role]}</span></p>
              {account.invitationDeliveryStatus === 'ACCEPTED' && (
                <p className="mt-2 text-sm text-success">De e-mailprovider heeft de uitnodiging geaccepteerd.</p>
              )}
              {account.invitationDeliveryStatus === 'FAILED' && (
                <p role="status" className="mt-2 text-sm text-error">De uitnodigingsmail is niet verzonden. Probeer opnieuw.</p>
              )}
              {account.invitationDeliveryStatus === 'UNKNOWN' && (
                <p className="mt-2 text-sm text-text-secondary">De bezorgstatus van deze bestaande uitnodiging is niet geregistreerd.</p>
              )}
              {account.roleNotificationStatus === 'ACCEPTED' && (
                <p className="mt-2 text-sm text-success">De laatste rolwijzigingsnotificatie is door de e-mailprovider geaccepteerd.</p>
              )}
              {account.roleNotificationStatus === 'FAILED' && (
                <p role="status" className="mt-2 text-sm text-error">De rol is gewijzigd, maar de notificatiemail is niet verzonden.</p>
              )}
              {account.roleNotificationStatus === 'UNKNOWN' && (
                <p role="status" className="mt-2 text-sm text-text-secondary">De bezorgstatus van de laatste rolnotificatie is niet geregistreerd.</p>
              )}
              {account.actionExplanation && <p className="mt-3 text-sm text-text-secondary">{account.actionExplanation}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
              {account.canChangeRole && account.role !== 'OWNER' && (
                <OrganizationRoleDialog
                  action={changeOrganizationRoleAction}
                  displayName={account.displayName}
                  organizationId={model.organization.id}
                  subjectUserId={account.userId}
                  currentRole={account.role}
                  idempotencyKey={`role-change:${randomUUID()}`}
                />
              )}
              {account.canBlock && (
                <AccountLifecycleDialog
                  mode="block"
                  displayName={account.displayName}
                  organizationId={model.organization.id}
                  subjectUserId={account.userId}
                  idempotencyKey={`block:${randomUUID()}`}
                  action={blockOrganizationAccountAction}
                />
              )}
              {account.canUnblock && (
                <AccountLifecycleDialog
                  mode="unblock"
                  displayName={account.displayName}
                  organizationId={model.organization.id}
                  subjectUserId={account.userId}
                  idempotencyKey={`unblock:${randomUUID()}`}
                  action={unblockOrganizationAccountAction}
                />
              )}
              {account.canResendInvitation && (
                <InvitationResendButton
                  action={resendOrganizationInvitationAction}
                  organizationId={model.organization.id}
                  subjectUserId={account.userId}
                  idempotencyKey={`resend-invitation:${randomUUID()}`}
                />
              )}
              {account.canResendRoleNotification && (
                <RoleNotificationResendButton
                  action={resendOrganizationRoleNotificationAction}
                  organizationId={model.organization.id}
                  subjectUserId={account.userId}
                  idempotencyKey={`role-notification-resend:${randomUUID()}`}
                />
              )}
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-7 text-sm text-text-secondary">
        Definitief verwijderen, anonimiseren en beëindigen van lidmaatschappen zijn in deze fase niet beschikbaar.
      </p>
    </Section>
  )
}
