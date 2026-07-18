import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('ADR-013 Fase 2B gebruikersbeheerinterface', () => {
  it('biedt uitsluitend herstelbaar blokkeren en deblokkeren met een bevestigingsdialoog', async () => {
    const [page, dialog] = await Promise.all([
      readFile('src/app/organisatie/gebruikers/page.tsx', 'utf8'),
      readFile('src/components/organizations/account-lifecycle-dialog.tsx', 'utf8'),
    ])
    expect(page).toContain('Gebruikers beheren')
    expect(page).toContain('Blokkeren is herstelbaar')
    expect(dialog).toContain('<dialog')
    expect(dialog).toContain('Alle actieve sessies worden ingetrokken')
    expect(dialog).toContain('Oude sessies worden niet hersteld')
    expect(dialog).toContain('required')
    expect(page).not.toMatch(/Definitief verwijderen.*Button|Anonimiseren.*Button|Membership beëindigen.*Button/)
  })

  it('toont geen vage disabled beheeractie voor last-OWNER of self-block', async () => {
    const source = await readFile('src/lib/account-architecture/account-management-query-service.ts', 'utf8')
    expect(source).toContain('U kunt uw eigen account niet blokkeren.')
    expect(source).toContain('De laatste actieve eigenaar is beschermd.')
    expect(source).toContain('canBlock')
  })

  it('houdt platformorganisatie en MIGRATION_TEMP buiten normaal tenantbeheer', async () => {
    const [query, action] = await Promise.all([
      readFile('src/lib/account-architecture/account-management-query-service.ts', 'utf8'),
      readFile('src/lib/account-architecture/account-lifecycle-service.ts', 'utf8'),
    ])
    expect(query).toContain("migrationClassification !== 'MIGRATION_TEMP'")
    expect(query).toContain('normalTenantOrganizationWhere')
    expect(action).toContain("'PROTECTED_ACCOUNT'")
    expect(action).toContain("'MIGRATION_TEMP'")
  })

  it('biedt een toegankelijke uitnodiging voor MEMBER en optioneel ADMIN, maar nooit OWNER', async () => {
    const [page, form, actions] = await Promise.all([
      readFile('src/app/organisatie/gebruikers/page.tsx', 'utf8'),
      readFile('src/components/organizations/organization-invitation-form.tsx', 'utf8'),
      readFile('src/app/organisatie/gebruikers/actions.ts', 'utf8'),
    ])
    expect(page).toContain('Gebruiker uitnodigen')
    expect(form).toContain('Uitnodiging versturen')
    expect(form).toContain('<option value="MEMBER">')
    expect(form).toContain('canInviteAdmin && <option value="ADMIN">')
    expect(form).not.toContain('<option value="OWNER">')
    expect(form).toContain('[aria-invalid="true"]')
    expect(actions).toContain('requireOrganizationMembership')
    expect(actions).toContain('organizationInvitationSchema.safeParse')
  })

  it('biedt een server-side begrensde resendactie met een zichtbare foutmelding', async () => {
    const [page, action, button, query] = await Promise.all([
      readFile('src/app/organisatie/gebruikers/page.tsx', 'utf8'),
      readFile('src/app/organisatie/gebruikers/actions.ts', 'utf8'),
      readFile('src/components/organizations/invitation-resend-button.tsx', 'utf8'),
      readFile('src/lib/account-architecture/account-management-query-service.ts', 'utf8'),
    ])
    expect(page).toContain('account.canResendInvitation')
    expect(action).toContain('resendOrganizationInvitation')
    expect(button).toContain('Uitnodiging opnieuw versturen')
    expect(button).toContain("role={state.error ? 'alert' : 'status'}")
    expect(query).toContain('membership.user.createdByUserId === actorUserId')
    expect(query).toContain("membership.status === 'INVITED'")
    expect(page).toContain("account.invitationDeliveryStatus === 'ACCEPTED'")
    expect(page).toContain("account.invitationDeliveryStatus === 'FAILED'")
    expect(page).toContain('De uitnodigingsmail is niet verzonden. Probeer opnieuw.')
  })

  it('biedt rolwijziging alleen via het server-side read-model en geen verwijderactie', async () => {
    const [page, dialog, actions, query] = await Promise.all([
      readFile('src/app/organisatie/gebruikers/page.tsx', 'utf8'),
      readFile('src/components/organizations/organization-role-dialog.tsx', 'utf8'),
      readFile('src/app/organisatie/gebruikers/actions.ts', 'utf8'),
      readFile('src/lib/account-architecture/account-management-query-service.ts', 'utf8'),
    ])
    expect(page).toContain('account.canChangeRole')
    expect(dialog).toContain('Rol wijzigen')
    expect(dialog).toContain('beheerrechten direct')
    expect(dialog).toContain('Alle actieve sessies worden direct beëindigd')
    expect(dialog).toContain('required')
    expect(actions).toContain('changeOrganizationUserRole')
    expect(query).toContain("actorMembership?.role === 'OWNER'")
    expect(query).toContain('!self')
    expect(page).not.toContain('Gebruiker verwijderen')
  })
})
