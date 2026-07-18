import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'

const sourceConnectionString = process.env.DATABASE_URL
if (!sourceConnectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const sourceUrl = new URL(sourceConnectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) {
  throw new Error('De lifecycle-integratietest mag uitsluitend tegen lokale PostgreSQL draaien.')
}

const databaseName = `workmatchr_account_lifecycle_test_${process.pid}_${Date.now()}`
if (!/^workmatchr_account_lifecycle_test_[0-9_]+$/.test(databaseName)) throw new Error('Ongeldige testdatabasenaam.')
const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')
const testUrl = new URL(sourceUrl)
testUrl.pathname = `/${databaseName}`
testUrl.searchParams.set('schema', 'public')

const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar de actieve npm-CLI ontbreekt.')
const resolvedNpmExecPath: string = npmExecPath

function deploySchema() {
  const result = spawnSync(process.execPath, [resolvedNpmExecPath, 'run', 'db:deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    encoding: 'utf8',
    stdio: 'pipe',
  })
  if (result.status !== 0) {
    throw new Error(`Migraties in lifecycle-testdatabase mislukt:\n${result.stdout}\n${result.stderr}`)
  }
}

async function main() {
  delete process.env.RESEND_API_KEY
  delete process.env.AUTH_EMAIL_FROM
  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  const authLinks: string[] = []
  const originalConsoleInfo = console.info
  console.info = (...values: unknown[]) => {
    const message = values.map(String).join(' ')
    if (message.startsWith('[DEVELOPMENT-ONLY AUTH LINK]')) authLinks.push(message)
    else originalConsoleInfo(...values)
  }
  let prisma: Awaited<ReturnType<typeof import('../src/lib/prisma')['getPrisma']>> | null = null
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    deploySchema()
    process.env.DATABASE_URL = testUrl.toString()

    const [{ getPrisma }, lifecycle, owners, membershipPolicy, invitations, authModule, emailModule] = await Promise.all([
      import('../src/lib/prisma'),
      import('../src/lib/account-architecture/account-lifecycle-service'),
      import('../src/lib/account-architecture/owner-management-service'),
      import('../src/lib/account-architecture/tenant-membership-policy'),
      import('../src/lib/account-architecture/organization-invitation-service'),
      import('../src/lib/auth'),
      import('../src/lib/email'),
    ])
    prisma = getPrisma()

    const organization = await prisma.organization.create({
      data: { name: 'TEST-WM-Lifecycle', organizationType: 'CLIENT', status: 'ACTIVE' },
    })
    const secondOrganization = await prisma.organization.create({
      data: { name: 'TEST-WM-Andere tenant', organizationType: 'CLIENT', status: 'ACTIVE' },
    })
    const platformOrganization = await prisma.organization.create({
      data: {
        name: 'WorkMatchr Platform',
        organizationType: 'PLATFORM_OPERATOR',
        status: 'ACTIVE',
        systemKey: 'WORKMATCHR_PLATFORM',
      },
    })

    async function createUser(role: 'OWNER' | 'ADMIN' | 'MEMBER', suffix: string) {
      return prisma!.user.create({
        data: {
          email: `test-wm-lifecycle-${suffix}-${randomUUID()}@example.invalid`,
          displayName: `Test ${suffix}`,
          emailVerified: true,
          status: 'ACTIVE',
          memberships: { create: { organizationId: organization.id, role, status: 'ACTIVE' } },
        },
        include: { memberships: true },
      })
    }

    const owner = await createUser('OWNER', 'owner')
    const secondOwner = await createUser('OWNER', 'second-owner')
    const adminUser = await createUser('ADMIN', 'admin')
    const member = await createUser('MEMBER', 'member')
    const successor = await createUser('MEMBER', 'successor')
    const acceptedRoleNotification = {
      sendNotification: async () => ({
        accepted: true as const,
        transport: 'DEVELOPMENT_LOG' as const,
        status: 'DEVELOPMENT_ONLY' as const,
        messageId: 'development-only',
      }),
    }

    const roleTarget = await createUser('MEMBER', 'role-target')
    await prisma.session.create({
      data: { userId: roleTarget.id, token: `test-role-session-${randomUUID()}`, expiresAt: new Date(Date.now() + 60_000) },
    })
    const promoteKey = `test:role-promote:${randomUUID()}`
    const promoted = await owners.changeOrganizationUserRole({
      actorUserId: owner.id,
      organizationId: organization.id,
      successorUserId: roleTarget.id,
      expectedRole: 'MEMBER',
      newRole: 'ADMIN',
      reasonCode: 'TENANT_ROLE_CHANGED',
      idempotencyKey: promoteKey,
    }, acceptedRoleNotification)
    assert.equal(promoted.outcome, 'ROLE_CHANGED')
    assert.equal(promoted.notificationStatus, 'DEVELOPMENT_ONLY', JSON.stringify({
      notificationStatus: promoted.notificationStatus,
      notificationErrorCode: promoted.notificationErrorCode,
    }))
    assert.equal(await prisma.session.count({ where: { userId: roleTarget.id } }), 0)
    assert.equal((await prisma.organizationMembership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: roleTarget.id, organizationId: organization.id } },
    })).role, 'ADMIN')
    const promotedEvent = await prisma.organizationMembershipEvent.findUniqueOrThrow({
      where: { idempotencyKey: `${promoteKey}:membership` },
    })
    assert.equal(promotedEvent.previousRole, 'MEMBER')
    assert.equal(promotedEvent.newRole, 'ADMIN')
    assert.equal(await prisma.accountProvisioningEvent.count({
      where: { subjectUserId: roleTarget.id, reasonCode: 'ORGANIZATION_ROLE_NOTIFICATION_ACCEPTED' },
    }), 1)

    const duplicatePromotion = await owners.changeOrganizationUserRole({
      actorUserId: owner.id,
      organizationId: organization.id,
      successorUserId: roleTarget.id,
      expectedRole: 'MEMBER',
      newRole: 'ADMIN',
      reasonCode: 'TENANT_ROLE_CHANGED',
      idempotencyKey: promoteKey,
    })
    assert.equal(duplicatePromotion.outcome, 'ALREADY_ASSIGNED')
    assert.equal(await prisma.organizationMembershipEvent.count({
      where: { membershipId: promotedEvent.membershipId, eventType: 'ROLE_CHANGED' },
    }), 1)

    const demoteKey = `test:role-demote:${randomUUID()}`
    const demoted = await owners.changeOrganizationUserRole({
      actorUserId: owner.id,
      organizationId: organization.id,
      successorUserId: roleTarget.id,
      expectedRole: 'ADMIN',
      newRole: 'MEMBER',
      reasonCode: 'TENANT_ROLE_CHANGED',
      idempotencyKey: demoteKey,
    }, acceptedRoleNotification)
    assert.equal(demoted.outcome, 'ROLE_CHANGED')
    assert.equal((await prisma.organizationMembership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: roleTarget.id, organizationId: organization.id } },
    })).role, 'MEMBER')

    await assert.rejects(() => owners.changeOrganizationUserRole({
      actorUserId: adminUser.id, organizationId: organization.id, successorUserId: roleTarget.id,
      expectedRole: 'MEMBER', newRole: 'ADMIN', reasonCode: 'TENANT_ROLE_CHANGED',
      idempotencyKey: `test:role-admin-denied:${randomUUID()}`,
    }), (error: unknown) => error instanceof owners.OwnerManagementServiceError && error.code === 'FORBIDDEN')
    await assert.rejects(() => owners.changeOrganizationUserRole({
      actorUserId: member.id, organizationId: organization.id, successorUserId: roleTarget.id,
      expectedRole: 'MEMBER', newRole: 'ADMIN', reasonCode: 'TENANT_ROLE_CHANGED',
      idempotencyKey: `test:role-member-denied:${randomUUID()}`,
    }), (error: unknown) => error instanceof owners.OwnerManagementServiceError && error.code === 'FORBIDDEN')
    await assert.rejects(() => owners.changeOrganizationUserRole({
      actorUserId: owner.id, organizationId: organization.id, successorUserId: owner.id,
      expectedRole: 'MEMBER', newRole: 'ADMIN', reasonCode: 'TENANT_ROLE_CHANGED',
      idempotencyKey: `test:role-self-denied:${randomUUID()}`,
    }), (error: unknown) => error instanceof owners.OwnerManagementServiceError && error.code === 'FORBIDDEN')
    await assert.rejects(() => owners.changeOrganizationUserRole({
      actorUserId: owner.id, organizationId: organization.id, successorUserId: secondOwner.id,
      expectedRole: 'MEMBER', newRole: 'ADMIN', reasonCode: 'TENANT_ROLE_CHANGED',
      idempotencyKey: `test:role-owner-denied:${randomUUID()}`,
    }), (error: unknown) => error instanceof owners.OwnerManagementServiceError && error.code === 'FORBIDDEN')

    const outsideRoleTarget = await prisma.user.create({
      data: {
        email: `test-wm-role-other-${randomUUID()}@example.invalid`, displayName: 'Andere tenant rol',
        emailVerified: true, status: 'ACTIVE',
        memberships: { create: { organizationId: secondOrganization.id, role: 'MEMBER', status: 'ACTIVE' } },
      },
    })
    await assert.rejects(() => owners.changeOrganizationUserRole({
      actorUserId: owner.id, organizationId: organization.id, successorUserId: outsideRoleTarget.id,
      expectedRole: 'MEMBER', newRole: 'ADMIN', reasonCode: 'TENANT_ROLE_CHANGED',
      idempotencyKey: `test:role-tenant-denied:${randomUUID()}`,
    }), (error: unknown) => error instanceof owners.OwnerManagementServiceError && error.code === 'INVALID_TENANT')

    const protectedRoleTarget = await prisma.user.create({
      data: {
        email: `test-wm-role-protected-${randomUUID()}@example.invalid`, displayName: 'Beschermd account',
        emailVerified: true, status: 'ACTIVE', platformRole: 'ADMIN',
        memberships: { create: { organizationId: organization.id, role: 'MEMBER', status: 'ACTIVE' } },
      },
    })
    await assert.rejects(() => owners.changeOrganizationUserRole({
      actorUserId: owner.id, organizationId: organization.id, successorUserId: protectedRoleTarget.id,
      expectedRole: 'MEMBER', newRole: 'ADMIN', reasonCode: 'TENANT_ROLE_CHANGED',
      idempotencyKey: `test:role-protected-denied:${randomUUID()}`,
    }), (error: unknown) => error instanceof owners.OwnerManagementServiceError && error.code === 'PROTECTED_ACCOUNT')

    const deliveryFailureTarget = await createUser('MEMBER', 'role-delivery-failure')
    const failedRoleChange = await owners.changeOrganizationUserRole({
      actorUserId: owner.id, organizationId: organization.id, successorUserId: deliveryFailureTarget.id,
      expectedRole: 'MEMBER', newRole: 'ADMIN', reasonCode: 'TENANT_ROLE_CHANGED',
      idempotencyKey: `test:role-delivery-failed:${randomUUID()}`,
    }, {
      sendNotification: async () => {
        throw new emailModule.AuthEmailDeliveryError('EMAIL_DELIVERY_NOT_CONFIGURED', 'Niet geconfigureerd')
      },
    })
    assert.equal(failedRoleChange.outcome, 'ROLE_CHANGED')
    assert.equal(failedRoleChange.notificationStatus, 'FAILED')
    assert.equal(failedRoleChange.notificationErrorCode, 'EMAIL_DELIVERY_NOT_CONFIGURED')
    assert.equal((await prisma.organizationMembership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: deliveryFailureTarget.id, organizationId: organization.id } },
    })).role, 'ADMIN')
    const roleEventsBeforeResend = await prisma.organizationMembershipEvent.count({
      where: { userId: deliveryFailureTarget.id, eventType: 'ROLE_CHANGED' },
    })
    const resendRoleNotification = await owners.resendOrganizationRoleChangeNotification({
      actorUserId: owner.id, organizationId: organization.id, subjectUserId: deliveryFailureTarget.id,
      idempotencyKey: `test:role-notification-resend:${randomUUID()}`,
    }, {
      sendNotification: async () => ({
        accepted: true, transport: 'RESEND', status: 'ACCEPTED', messageId: 'test-role-message-id',
      }),
    })
    assert.equal(resendRoleNotification.notificationStatus, 'ACCEPTED')
    assert.equal(resendRoleNotification.notificationMessageId, 'test-role-message-id')
    assert.equal(await prisma.organizationMembershipEvent.count({
      where: { userId: deliveryFailureTarget.id, eventType: 'ROLE_CHANGED' },
    }), roleEventsBeforeResend)

    const providerFailureTarget = await createUser('MEMBER', 'role-provider-failure')
    const providerFailedRoleChange = await owners.changeOrganizationUserRole({
      actorUserId: owner.id, organizationId: organization.id, successorUserId: providerFailureTarget.id,
      expectedRole: 'MEMBER', newRole: 'ADMIN', reasonCode: 'TENANT_ROLE_CHANGED',
      idempotencyKey: `test:role-provider-failed:${randomUUID()}`,
    }, {
      sendNotification: async () => {
        throw new emailModule.AuthEmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE', 'Provider niet bereikbaar')
      },
    })
    assert.equal(providerFailedRoleChange.outcome, 'ROLE_CHANGED')
    assert.equal(providerFailedRoleChange.notificationStatus, 'FAILED')
    assert.equal(providerFailedRoleChange.notificationErrorCode, 'EMAIL_PROVIDER_UNAVAILABLE')
    assert.equal((await prisma.organizationMembership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: providerFailureTarget.id, organizationId: organization.id } },
    })).role, 'ADMIN')

    const concurrencyRoleTarget = await createUser('MEMBER', 'role-concurrency')
    const concurrentRoleChanges = await Promise.allSettled([
      owners.changeOrganizationUserRole({
        actorUserId: owner.id, organizationId: organization.id, successorUserId: concurrencyRoleTarget.id,
        expectedRole: 'MEMBER', newRole: 'ADMIN', reasonCode: 'TENANT_ROLE_CHANGED',
        idempotencyKey: `test:role-concurrency-a:${randomUUID()}`,
      }, acceptedRoleNotification),
      owners.changeOrganizationUserRole({
        actorUserId: owner.id, organizationId: organization.id, successorUserId: concurrencyRoleTarget.id,
        expectedRole: 'MEMBER', newRole: 'ADMIN', reasonCode: 'TENANT_ROLE_CHANGED',
        idempotencyKey: `test:role-concurrency-b:${randomUUID()}`,
      }, acceptedRoleNotification),
    ])
    assert.equal(concurrentRoleChanges.filter((result) => result.status === 'fulfilled').length, 1)
    assert.equal(await prisma.organizationMembershipEvent.count({
      where: { userId: concurrencyRoleTarget.id, eventType: 'ROLE_CHANGED' },
    }), 1)

    const ownerMemberEmail = `test-wm-invite-owner-member-${randomUUID()}@example.invalid`
    const ownerMemberInvite = await invitations.inviteOrganizationUser({
      actorUserId: owner.id, organizationId: organization.id, displayName: 'Uitgenodigd lid',
      email: ownerMemberEmail, role: 'MEMBER', idempotencyKey: `test:invite-owner-member:${randomUUID()}`,
    })
    assert.equal(ownerMemberInvite.status, 'CREATED')
    const invitedMember = await prisma.user.findUniqueOrThrow({
      where: { id: ownerMemberInvite.userId },
      include: { accounts: true, memberships: true, provisioningEventsAsSubject: true, membershipEventsAsSubject: true },
    })
    assert.equal(invitedMember.status, 'INVITED')
    assert.equal(invitedMember.platformRole, 'USER')
    assert.equal(invitedMember.createdByUserId, owner.id)
    assert.equal(invitedMember.memberships.length, 1)
    assert.equal(invitedMember.memberships[0]?.organizationId, organization.id)
    assert.equal(invitedMember.memberships[0]?.role, 'MEMBER')
    assert.equal(invitedMember.memberships[0]?.status, 'INVITED')
    assert.equal(invitedMember.accounts.length, 1)
    assert.equal(invitedMember.accounts[0]?.providerId, 'credential')
    assert(Boolean(invitedMember.accounts[0]?.password), 'Better Auth-credentialhash ontbreekt.')
    assert.equal(await prisma.session.count({ where: { userId: invitedMember.id } }), 0)
    assert.deepEqual(
      new Set(invitedMember.provisioningEventsAsSubject.map((event) => event.eventType)),
      new Set(['ACCOUNT_INVITED', 'ORGANIZATION_LINKED', 'ROLE_GRANTED']),
    )
    assert.deepEqual(
      new Set(invitedMember.membershipEventsAsSubject.map((event) => event.eventType)),
      new Set(['MEMBERSHIP_CREATED', 'INVITATION_SENT']),
    )
    const initialDeliveryEvent = invitedMember.membershipEventsAsSubject.find((event) => event.eventType === 'INVITATION_SENT')
    assert.equal((initialDeliveryEvent?.metadata as { deliveryStatus?: string })?.deliveryStatus, 'DEVELOPMENT_ONLY')
    assert.equal((initialDeliveryEvent?.metadata as { providerMessageId?: string })?.providerMessageId, 'development-only')
    assert.equal(await prisma.accountProvisioningEvent.count({
      where: { subjectUserId: invitedMember.id, reasonCode: 'ORGANIZATION_INVITATION_DELIVERY_ACCEPTED' },
    }), 1)

    const resend = await invitations.resendOrganizationInvitation({
      actorUserId: owner.id, organizationId: organization.id, subjectUserId: invitedMember.id,
      idempotencyKey: `test:resend-owner-member:${randomUUID()}`,
    })
    assert.equal(resend.status, 'RESENT')
    assert.equal(resend.userId, invitedMember.id)
    assert.equal(await prisma.user.count({ where: { email: ownerMemberEmail } }), 1)
    assert.equal(await prisma.organizationMembership.count({ where: { userId: invitedMember.id } }), 1)
    assert.equal(await prisma.organizationMembershipEvent.count({
      where: { membershipId: ownerMemberInvite.membershipId, eventType: 'INVITATION_SENT' },
    }), 2)
    assert.equal(await prisma.accountProvisioningEvent.count({
      where: { subjectUserId: invitedMember.id, reasonCode: 'ORGANIZATION_INVITATION_DELIVERY_ATTEMPTED' },
    }), 2)

    const ownerAdminEmail = `test-wm-invite-owner-admin-${randomUUID()}@example.invalid`
    const verificationLinkCount = authLinks.length
    const ownerAdminInvite = await invitations.inviteOrganizationUser({
      actorUserId: owner.id, organizationId: organization.id, displayName: 'Uitgenodigde beheerder',
      email: ownerAdminEmail, role: 'ADMIN',
      idempotencyKey: `test:invite-owner-admin:${randomUUID()}`,
    })
    assert.equal(ownerAdminInvite.status, 'CREATED')
    const verificationMessage = authLinks[verificationLinkCount]
    assert(verificationMessage, 'De Better Auth-verificatielink voor de uitnodiging ontbreekt.')
    const verificationUrl = new URL(verificationMessage.slice(verificationMessage.indexOf('http')))
    const verificationToken = verificationUrl.searchParams.get('token')
    assert(verificationToken, 'De Better Auth-verificatietoken ontbreekt.')
    await authModule.auth.api.verifyEmail({ query: { token: verificationToken } })
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: ownerAdminInvite.userId } })).status, 'ACTIVE')
    assert.equal((await prisma.organizationMembership.findUniqueOrThrow({
      where: { id: ownerAdminInvite.membershipId },
    })).status, 'ACTIVE')
    assert.equal(await prisma.accountProvisioningEvent.count({
      where: { subjectUserId: ownerAdminInvite.userId, eventType: 'INVITATION_ACCEPTED' },
    }), 1)
    assert.equal(await prisma.organizationMembershipEvent.count({
      where: { membershipId: ownerAdminInvite.membershipId, eventType: 'INVITATION_ACCEPTED' },
    }), 1)

    const resetLinkCount = authLinks.length
    await authModule.auth.api.requestPasswordReset({ body: { email: ownerAdminEmail, redirectTo: '/wachtwoord-herstellen' } })
    const resetMessage = authLinks[resetLinkCount]
    assert(resetMessage, 'De Better Auth-wachtwoordherstellink ontbreekt.')
    const resetUrl = new URL(resetMessage.slice(resetMessage.indexOf('http')))
    const resetToken = resetUrl.pathname.split('/').filter(Boolean).at(-1)
    assert(resetToken, 'De Better Auth-wachtwoordresettoken ontbreekt.')
    const invitedPassword = `Test-WM-${randomUUID()}!`
    await authModule.auth.api.resetPassword({ body: { token: resetToken, newPassword: invitedPassword } })
    const signIn = await authModule.auth.api.signInEmail({ body: { email: ownerAdminEmail, password: invitedPassword } })
    assert(signIn.token, 'De uitgenodigde gebruiker moet een eigen Better Auth-sessie kunnen starten.')
    assert.equal(await prisma.session.count({ where: { userId: ownerAdminInvite.userId } }), 1)

    const adminMemberInvite = await invitations.inviteOrganizationUser({
      actorUserId: adminUser.id, organizationId: organization.id, displayName: 'Door beheerder uitgenodigd lid',
      email: `test-wm-invite-admin-member-${randomUUID()}@example.invalid`, role: 'MEMBER',
      idempotencyKey: `test:invite-admin-member:${randomUUID()}`,
    })
    assert.equal(adminMemberInvite.status, 'CREATED')
    await assert.rejects(() => invitations.inviteOrganizationUser({
      actorUserId: adminUser.id, organizationId: organization.id, displayName: 'Niet toegestane beheerder',
      email: `test-wm-invite-admin-admin-${randomUUID()}@example.invalid`, role: 'ADMIN',
      idempotencyKey: `test:invite-admin-admin:${randomUUID()}`,
    }), (error: unknown) => error instanceof invitations.OrganizationInvitationServiceError && error.code === 'FORBIDDEN')
    await assert.rejects(() => invitations.inviteOrganizationUser({
      actorUserId: member.id, organizationId: organization.id, displayName: 'Niet toegestaan lid',
      email: `test-wm-invite-member-${randomUUID()}@example.invalid`, role: 'MEMBER',
      idempotencyKey: `test:invite-member:${randomUUID()}`,
    }), (error: unknown) => error instanceof invitations.OrganizationInvitationServiceError && error.code === 'FORBIDDEN')

    const otherTenantAccount = await prisma.user.create({
      data: {
        email: `test-wm-existing-other-tenant-${randomUUID()}@example.invalid`, displayName: 'Andere tenant',
        emailVerified: true, status: 'ACTIVE',
        memberships: { create: { organizationId: secondOrganization.id, role: 'MEMBER', status: 'ACTIVE' } },
      },
    })
    await assert.rejects(() => invitations.inviteOrganizationUser({
      actorUserId: owner.id, organizationId: organization.id, displayName: 'Andere tenant',
      email: otherTenantAccount.email, role: 'MEMBER', idempotencyKey: `test:invite-second-tenant:${randomUUID()}`,
    }), (error: unknown) => error instanceof invitations.OrganizationInvitationServiceError && error.code === 'CONFLICT')

    await prisma.session.create({
      data: { userId: member.id, token: `test-session-${randomUUID()}`, expiresAt: new Date(Date.now() + 60_000) },
    })
    await prisma.verification.create({
      data: {
        identifier: `reset-password:${randomUUID()}`,
        value: member.id,
        expiresAt: new Date(Date.now() + 60_000),
      },
    })

    const blockKey = `test:block:${randomUUID()}`
    assert.deepEqual(await lifecycle.blockAccount({
      actorUserId: owner.id,
      organizationId: organization.id,
      subjectUserId: member.id,
      reasonCode: 'SECURITY_CONCERN',
      idempotencyKey: blockKey,
    }), { outcome: 'BLOCKED' })
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: member.id } })).status, 'BLOCKED')
    assert.equal(await prisma.session.count({ where: { userId: member.id } }), 0)
    assert.equal(await prisma.verification.count({ where: { value: member.id } }), 0)
    assert.equal(await prisma.accountProvisioningEvent.count({ where: { idempotencyKey: blockKey } }), 1)
    assert.deepEqual(await lifecycle.blockAccount({
      actorUserId: owner.id,
      organizationId: organization.id,
      subjectUserId: member.id,
      reasonCode: 'SECURITY_CONCERN',
      idempotencyKey: blockKey,
    }), { outcome: 'ALREADY_BLOCKED' })
    assert.equal(await prisma.accountProvisioningEvent.count({ where: { idempotencyKey: blockKey } }), 1)

    assert.deepEqual(await lifecycle.unblockAccount({
      actorUserId: owner.id,
      organizationId: organization.id,
      subjectUserId: member.id,
      reasonCode: 'ACCOUNT_ACCESS_RESTORED',
      idempotencyKey: `test:unblock:${randomUUID()}`,
    }), { outcome: 'UNBLOCKED' })
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: member.id } })).status, 'ACTIVE')
    assert.equal(await prisma.session.count({ where: { userId: member.id } }), 0)

    await assert.rejects(() => lifecycle.blockAccount({
      actorUserId: member.id,
      organizationId: organization.id,
      subjectUserId: member.id,
      reasonCode: 'SECURITY_CONCERN',
      idempotencyKey: `test:self:${randomUUID()}`,
    }), (error: unknown) => error instanceof lifecycle.AccountLifecycleServiceError && error.code === 'SELF_BLOCK_FORBIDDEN')

    await assert.rejects(() => lifecycle.blockAccount({
      actorUserId: adminUser.id,
      organizationId: organization.id,
      subjectUserId: secondOwner.id,
      reasonCode: 'SECURITY_CONCERN',
      idempotencyKey: `test:admin-owner:${randomUUID()}`,
    }), (error: unknown) => error instanceof lifecycle.AccountLifecycleServiceError && error.code === 'FORBIDDEN')

    const outsider = await prisma.user.create({
      data: {
        email: `test-wm-outsider-${randomUUID()}@example.invalid`, displayName: 'Test outsider', emailVerified: true, status: 'ACTIVE',
        memberships: { create: { organizationId: secondOrganization.id, role: 'OWNER', status: 'ACTIVE' } },
      },
    })
    await assert.rejects(() => lifecycle.blockAccount({
      actorUserId: outsider.id,
      organizationId: organization.id,
      subjectUserId: member.id,
      reasonCode: 'SECURITY_CONCERN',
      idempotencyKey: `test:wrong-tenant:${randomUUID()}`,
    }), (error: unknown) => error instanceof lifecycle.AccountLifecycleServiceError && error.code === 'FORBIDDEN')

    await prisma.organizationMembership.update({
      where: { userId_organizationId: { userId: secondOwner.id, organizationId: organization.id } },
      data: { role: 'ADMIN' },
    })
    await assert.rejects(() => lifecycle.blockAccount({
      actorUserId: secondOwner.id,
      organizationId: organization.id,
      subjectUserId: owner.id,
      reasonCode: 'SECURITY_CONCERN',
      idempotencyKey: `test:last-owner:${randomUUID()}`,
    }), (error: unknown) => error instanceof lifecycle.AccountLifecycleServiceError && error.code === 'FORBIDDEN')
    await assert.rejects(() => lifecycle.blockAccount({
      actorUserId: owner.id,
      organizationId: organization.id,
      subjectUserId: owner.id,
      reasonCode: 'SECURITY_CONCERN',
      idempotencyKey: `test:last-owner-self:${randomUUID()}`,
    }), (error: unknown) => error instanceof lifecycle.AccountLifecycleServiceError && error.code === 'SELF_BLOCK_FORBIDDEN')

    const protectedAccount = await prisma.user.create({
      data: {
        email: `test-wm-platform-${randomUUID()}@example.invalid`, displayName: 'Test platformbeheerder', emailVerified: true,
        status: 'ACTIVE', platformRole: 'ADMIN',
        memberships: { create: { organizationId: organization.id, role: 'MEMBER', status: 'ACTIVE' } },
      },
    })
    await assert.rejects(() => lifecycle.blockAccount({
      actorUserId: owner.id,
      organizationId: organization.id,
      subjectUserId: protectedAccount.id,
      reasonCode: 'SECURITY_CONCERN',
      idempotencyKey: `test:protected:${randomUUID()}`,
    }), (error: unknown) => error instanceof lifecycle.AccountLifecycleServiceError && error.code === 'PROTECTED_ACCOUNT')

    const centralAdministrator = await prisma.user.create({
      data: {
        email: `test-wm-central-${randomUUID()}@example.invalid`, displayName: 'Test centraal beheer', emailVerified: true,
        status: 'ACTIVE', platformRole: 'ADMIN',
        memberships: { create: { organizationId: platformOrganization.id, role: 'OWNER', status: 'ACTIVE' } },
      },
    })
    await assert.rejects(() => invitations.inviteOrganizationUser({
      actorUserId: centralAdministrator.id, organizationId: platformOrganization.id,
      displayName: 'Niet toegestaan platformaccount',
      email: `test-wm-invite-platform-${randomUUID()}@example.invalid`, role: 'MEMBER',
      idempotencyKey: `test:invite-platform:${randomUUID()}`,
    }), (error: unknown) => error instanceof invitations.OrganizationInvitationServiceError && error.code === 'FORBIDDEN')
    assert.equal((await lifecycle.blockAccount({
      actorUserId: centralAdministrator.id,
      organizationId: organization.id,
      subjectUserId: member.id,
      reasonCode: 'ORGANIZATION_REQUEST',
      idempotencyKey: `test:central:${randomUUID()}`,
    })).outcome, 'BLOCKED')
    await lifecycle.unblockAccount({
      actorUserId: centralAdministrator.id,
      organizationId: organization.id,
      subjectUserId: member.id,
      reasonCode: 'ACCOUNT_ACCESS_RESTORED',
      idempotencyKey: `test:central-unblock:${randomUUID()}`,
    })

    assert.equal((await owners.addOrganizationOwner({
      actorUserId: owner.id,
      organizationId: organization.id,
      successorUserId: successor.id,
      reasonCode: 'OWNER_ADDED_BY_ORGANIZATION',
      idempotencyKey: `test:add-owner:${randomUUID()}`,
    })).outcome, 'OWNER_ADDED')
    assert.equal((await prisma.organizationMembership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: successor.id, organizationId: organization.id } },
    })).role, 'OWNER')

    assert.equal((await owners.transferOrganizationOwnership({
      actorUserId: owner.id,
      organizationId: organization.id,
      currentOwnerUserId: owner.id,
      successorUserId: successor.id,
      previousOwnerNewRole: 'ADMIN',
      reasonCode: 'OWNER_TRANSFERRED_BY_ORGANIZATION',
      idempotencyKey: `test:transfer-owner:${randomUUID()}`,
    })).outcome, 'OWNERSHIP_TRANSFERRED')
    assert.equal((await prisma.organizationMembership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: owner.id, organizationId: organization.id } },
    })).role, 'ADMIN')

    assert.equal((await owners.changeNonOwnerOrganizationRole({
      actorUserId: successor.id,
      organizationId: organization.id,
      successorUserId: adminUser.id,
      expectedRole: 'ADMIN',
      newRole: 'MEMBER',
      reasonCode: 'TENANT_ROLE_CHANGED',
      idempotencyKey: `test:role-change:${randomUUID()}`,
    })).outcome, 'ROLE_CHANGED')
    assert.equal((await prisma.organizationMembership.findUniqueOrThrow({
      where: { userId_organizationId: { userId: adminUser.id, organizationId: organization.id } },
    })).role, 'MEMBER')

    await assert.rejects(() => membershipPolicy.assertCanCreateTenantMembership(prisma!, member.id, secondOrganization.id))

    const concurrencySubject = await createUser('MEMBER', 'concurrency')
    const attempts = await Promise.allSettled([
      lifecycle.blockAccount({ actorUserId: successor.id, organizationId: organization.id, subjectUserId: concurrencySubject.id, reasonCode: 'SECURITY_CONCERN', idempotencyKey: `test:concurrency-a:${randomUUID()}` }),
      lifecycle.blockAccount({ actorUserId: successor.id, organizationId: organization.id, subjectUserId: concurrencySubject.id, reasonCode: 'SECURITY_CONCERN', idempotencyKey: `test:concurrency-b:${randomUUID()}` }),
    ])
    assert(attempts.some((attempt) => attempt.status === 'fulfilled'), 'Minimaal één gelijktijdige blokkade moet slagen.')
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: concurrencySubject.id } })).status, 'BLOCKED')
    assert.equal(await prisma.accountProvisioningEvent.count({
      where: { subjectUserId: concurrencySubject.id, eventType: 'ACCOUNT_BLOCKED' },
    }), 1)

    const rollbackSubject = await createUser('MEMBER', 'rollback')
    const conflictingKey = `test:rollback:${randomUUID()}`
    await prisma.accountProvisioningEvent.create({
      data: {
        eventType: 'ACCOUNT_BLOCKED', subjectUserId: member.id, reasonCode: 'TEST_CONFLICT', idempotencyKey: conflictingKey,
      },
    })
    await assert.rejects(() => lifecycle.blockAccount({
      actorUserId: successor.id,
      organizationId: organization.id,
      subjectUserId: rollbackSubject.id,
      reasonCode: 'SECURITY_CONCERN',
      idempotencyKey: conflictingKey,
    }))
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: rollbackSubject.id } })).status, 'ACTIVE')

    console.log('ADR-013 Fase 2B lifecycle-, autorisatie-, idempotentie- en concurrencytests zijn geslaagd.')
  } finally {
    console.info = originalConsoleInfo
    if (prisma) await prisma.$disconnect()
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
    await admin.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : 'Onbekende lifecycle-testfout.')
  process.exitCode = 1
})
