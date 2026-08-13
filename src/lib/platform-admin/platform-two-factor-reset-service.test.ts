import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  transaction: vi.fn(),
  actorFindFirst: vi.fn(),
  targetFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  factorFindMany: vi.fn(),
  factorDeleteMany: vi.fn(),
  sessionDeleteMany: vi.fn(),
  verificationFindMany: vi.fn(),
  verificationDeleteMany: vi.fn(),
  ownerCount: vi.fn(),
  rateFindUnique: vi.fn(),
  rateUpsert: vi.fn(),
  audit: vi.fn(),
  adminAudit: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('./platform-admin-authorization', () => ({ getPlatformOperatorContext: mocks.authorize }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ $transaction: mocks.transaction }) }))
vi.mock('@/lib/auth-two-factor-audit', () => ({ appendTwoFactorAuditEvent: mocks.audit }))
vi.mock('@/lib/email', () => ({
  AuthEmailDeliveryError: class AuthEmailDeliveryError extends Error { constructor(public code: string) { super(code) } },
  sendAuthEmail: mocks.sendEmail,
  twoFactorResetNotificationEmail: vi.fn(() => ({ kind: 'TWO_FACTOR_RESET_NOTIFICATION', to: 'target@example.invalid', subject: 'Uw tweestapsverificatie is gereset', text: 'veilig', html: '<p>veilig</p>' })),
}))

import { PlatformTwoFactorResetError, resetUserTwoFactor } from './platform-two-factor-reset-service'

const actorUserId = '11111111-1111-4111-8111-111111111111'
const targetUserId = '22222222-2222-4222-8222-222222222222'

function resetInput(overrides: Partial<Parameters<typeof resetUserTwoFactor>[0]> = {}) {
  return {
    actorUserId,
    targetUserId,
    reason: 'Identiteit is via een afzonderlijk kanaal gecontroleerd.',
    confirmed: true,
    idempotencyKey: '33333333-3333-4333-8333-333333333333',
    ...overrides,
  }
}

describe('platform 2FA-herstelservice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authorize.mockResolvedValue({ id: actorUserId, membershipRole: 'ADMIN' })
    mocks.actorFindFirst.mockResolvedValue({ id: actorUserId })
    mocks.targetFindUnique.mockResolvedValue({
      id: targetUserId,
      status: 'ACTIVE',
      twoFactorEnabled: true,
      memberships: [],
    })
    mocks.factorFindMany.mockResolvedValue([{ id: 'factor-1' }])
    mocks.verificationFindMany.mockResolvedValue([{ identifier: '2fa-pending' }, { identifier: 'trust-device-old' }])
    mocks.ownerCount.mockResolvedValue(2)
    mocks.rateFindUnique.mockResolvedValue(null)
    mocks.sendEmail.mockResolvedValue({ accepted: true, transport: 'RESEND', status: 'ACCEPTED', messageId: 'message-1' })
    mocks.transaction.mockImplementation(async (operation) => operation({
      user: { findFirst: mocks.actorFindFirst, findUnique: mocks.targetFindUnique, update: mocks.userUpdate },
      twoFactor: { findMany: mocks.factorFindMany, deleteMany: mocks.factorDeleteMany },
      session: { deleteMany: mocks.sessionDeleteMany },
      verification: { findMany: mocks.verificationFindMany, deleteMany: mocks.verificationDeleteMany },
      organizationMembership: { count: mocks.ownerCount },
      rateLimit: { findUnique: mocks.rateFindUnique, upsert: mocks.rateUpsert },
      adminActionLog: { create: mocks.adminAudit },
      accountProvisioningEvent: {},
    }))
  })

  it.each(['OWNER', 'ADMIN'])('laat een %s de reset transactioneel uitvoeren', async () => {
    await expect(resetUserTwoFactor(resetInput())).resolves.toEqual({ targetUserId, notification: 'SENT' })

    expect(mocks.userUpdate).toHaveBeenCalledWith({ where: { id: targetUserId }, data: { twoFactorEnabled: false } })
    expect(mocks.factorDeleteMany).toHaveBeenCalledWith({ where: { userId: targetUserId } })
    expect(mocks.sessionDeleteMany).toHaveBeenCalledWith({ where: { userId: targetUserId } })
    expect(mocks.verificationDeleteMany).toHaveBeenCalledWith({
      where: { identifier: { in: ['2fa-pending', '2fa-attempts-2fa-pending', 'trust-device-old'] } },
    })
    expect(mocks.audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      eventType: 'TWO_FACTOR_RESET', actorUserId, subjectUserId: targetUserId,
    }))
    expect(mocks.adminAudit).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'TWO_FACTOR_RESET', actorUserId, entityId: targetUserId }),
    }))
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1)
    expect(mocks.audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      eventType: 'TWO_FACTOR_RESET_NOTIFICATION_SENT', actorUserId, subjectUserId: targetUserId,
    }))
  })

  it('weigert een directe aanroep door auditor of gewone gebruiker', async () => {
    mocks.authorize.mockRejectedValue(new Error('FORBIDDEN'))
    await expect(resetUserTwoFactor(resetInput())).rejects.toThrow('FORBIDDEN')
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('vereist een reden en expliciete bevestiging', async () => {
    await expect(resetUserTwoFactor(resetInput({ reason: 'te kort' }))).rejects.toBeInstanceOf(PlatformTwoFactorResetError)
    await expect(resetUserTwoFactor(resetInput({ confirmed: false }))).rejects.toBeInstanceOf(PlatformTwoFactorResetError)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it('faalt gesloten voor een self-reset van de laatste actieve platformeigenaar', async () => {
    mocks.targetFindUnique.mockResolvedValue({
      id: actorUserId,
      status: 'ACTIVE',
      twoFactorEnabled: true,
      memberships: [{ id: 'membership-1', role: 'OWNER', organizationId: 'platform-organization' }],
    })
    mocks.ownerCount.mockResolvedValue(1)
    await expect(resetUserTwoFactor(resetInput({ targetUserId: actorUserId }))).rejects.toMatchObject({ code: 'SELF_RESET_LAST_OWNER' })
    expect(mocks.factorDeleteMany).not.toHaveBeenCalled()
  })

  it('heeft een eigen server-side begrenzing', async () => {
    mocks.rateFindUnique.mockResolvedValue({ count: 5, lastRequest: BigInt(Date.now()) })
    await expect(resetUserTwoFactor(resetInput())).rejects.toMatchObject({ code: 'RATE_LIMITED' })
    expect(mocks.factorDeleteMany).not.toHaveBeenCalled()
  })

  it('behoudt de reset wanneer de securitymail niet kan worden bezorgd en legt dat veilig vast', async () => {
    mocks.sendEmail.mockRejectedValue(new Error('provider unavailable'))

    await expect(resetUserTwoFactor(resetInput())).resolves.toEqual({ targetUserId, notification: 'FAILED' })
    expect(mocks.userUpdate).toHaveBeenCalledWith({ where: { id: targetUserId }, data: { twoFactorEnabled: false } })
    expect(mocks.factorDeleteMany).toHaveBeenCalledWith({ where: { userId: targetUserId } })
    expect(mocks.audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      eventType: 'TWO_FACTOR_RESET_NOTIFICATION_FAILED',
      metadata: expect.objectContaining({ failureCode: 'EMAIL_DELIVERY_UNKNOWN' }),
    }))
  })

  it('neemt nooit TOTP-secrets of herstelcodes op in de herstelservice-audit', () => {
    const source = readFileSync('src/lib/platform-admin/platform-two-factor-reset-service.ts', 'utf8')
    const migration = readFileSync('prisma/migrations/20260813100000_add_two_factor_reset_notification_audit/migration.sql', 'utf8')
    expect(source).not.toMatch(/totpURI|backupCodes|recoveryCodes|twoFactor\.secret/i)
    expect(source).not.toContain('adminCommunication')
    expect(migration).toContain("ADD VALUE IF NOT EXISTS 'TWO_FACTOR_RESET_NOTIFICATION_SENT'")
    expect(migration).toContain("ADD VALUE IF NOT EXISTS 'TWO_FACTOR_RESET_NOTIFICATION_FAILED'")
  })
})
