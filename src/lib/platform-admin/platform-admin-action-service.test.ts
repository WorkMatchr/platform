import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  userFindUnique: vi.fn(),
  organizationFindFirst: vi.fn(),
  providerFindUnique: vi.fn(),
  assignmentFindUnique: vi.fn(),
  auditCreate: vi.fn(),
  communicationCreate: vi.fn(),
  deliveryAttemptCount: vi.fn(),
  deliveryAttemptCreate: vi.fn(),
  transaction: vi.fn(),
  sendAuthEmail: vi.fn(),
  activation: vi.fn(),
  verification: vi.fn(),
  passwordReset: vi.fn(),
  capture: vi.fn(),
  cockpit: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('./platform-admin-authorization', () => ({ getPlatformAdministratorContext: mocks.authorize }))
vi.mock('./platform-admin-query-service', () => ({ getPlatformAdminActionCandidates: mocks.cockpit }))
vi.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    user: { findUnique: mocks.userFindUnique },
    organization: { findFirst: mocks.organizationFindFirst },
    providerProfile: { findUnique: mocks.providerFindUnique },
    assignment: { findUnique: mocks.assignmentFindUnique },
    adminActionLog: { create: mocks.auditCreate },
    $transaction: mocks.transaction,
  }),
}))
vi.mock('@/lib/email', () => ({
  administrativeEmail: (input: { to: string; subject: string; message: string }) => ({
    ...input,
    kind: 'ADMIN_MESSAGE',
    text: input.message,
    html: `<p>${input.message}</p>`,
  }),
  AuthEmailDeliveryError: class AuthEmailDeliveryError extends Error {
    constructor(public readonly code: string, message: string) {
      super(message)
    }
  },
  sendAuthEmail: mocks.sendAuthEmail,
}))
vi.mock('@/lib/account-architecture/better-auth-invitation-service', () => ({
  sendOrganizationInvitationActivation: mocks.activation,
}))
vi.mock('@/lib/auth-email-delivery-context', () => ({
  withAuthEmailDeliveryCapture: mocks.capture,
}))
vi.mock('@/lib/auth', () => ({
  auth: { api: { sendVerificationEmail: mocks.verification, requestPasswordReset: mocks.passwordReset } },
}))
vi.mock('@/lib/auth-policy', () => ({ canUseAccountRecovery: (status: string) => status === 'ACTIVE' }))

import {
  addPlatformAdminNote,
  PlatformAdminActionError,
  sendPlatformAdminMessage,
  sendPlatformUserAccessEmail,
  updatePlatformSignalStatus,
} from './platform-admin-action-service'

const actorUserId = '11111111-1111-4111-8111-111111111111'
const targetId = '22222222-2222-4222-8222-222222222222'
const delivery = {
  accepted: true as const,
  transport: 'RESEND' as const,
  status: 'ACCEPTED' as const,
  messageId: 'message-1',
}

describe('platformbeheeractieservice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.authorize.mockResolvedValue({ id: actorUserId, displayName: 'Platformbeheerder', email: 'admin@example.invalid' })
    mocks.auditCreate.mockResolvedValue({ id: 'audit-1' })
    mocks.communicationCreate.mockResolvedValue({ id: 'communication-1', dispatchKey: 'admin-communication:one' })
    mocks.deliveryAttemptCount.mockResolvedValue(0)
    mocks.deliveryAttemptCreate.mockResolvedValue({ id: 'attempt-1' })
    mocks.transaction.mockImplementation(async (operation) => operation({
      adminCommunication: { create: mocks.communicationCreate },
      adminCommunicationDeliveryAttempt: { count: mocks.deliveryAttemptCount, create: mocks.deliveryAttemptCreate },
      adminActionLog: { create: mocks.auditCreate },
    }))
    mocks.sendAuthEmail.mockResolvedValue(delivery)
    mocks.activation.mockResolvedValue(delivery)
    mocks.capture.mockImplementation(async (operation) => {
      await operation()
      return delivery
    })
    mocks.userFindUnique.mockResolvedValue({
      id: targetId,
      email: 'gebruiker@example.invalid',
      displayName: 'Voorbeeldgebruiker',
      emailVerified: false,
      status: 'ACTIVE',
      memberships: [],
    })
    mocks.organizationFindFirst.mockResolvedValue({ id: targetId })
    mocks.assignmentFindUnique.mockResolvedValue({ id: targetId })
    mocks.cockpit.mockResolvedValue([
      {
        id: 'organization-owner:organization-1',
        ruleCode: 'ORGANIZATION_WITHOUT_ACTIVE_OWNER',
        recommendedAction: 'Wijs een eigenaar aan.',
      },
    ])
  })

  it('maakt de immutable beheercommunicatie vóór providerverzending en audit de geaccepteerde bezorging', async () => {
    await expect(sendPlatformAdminMessage({
      actorUserId,
      targetType: 'USER',
      targetId,
      subject: 'Controle van uw account',
      message: 'Neem contact op met WorkMatchr voor de vervolgstap.',
    })).resolves.toEqual(delivery)

    expect(mocks.communicationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subject: 'Controle van uw account',
        textSnapshot: expect.stringContaining('Neem contact op met WorkMatchr'),
        htmlSnapshot: expect.any(String),
      }),
    })
    expect(mocks.sendAuthEmail).toHaveBeenCalledOnce()
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'ADMIN_EMAIL_SENT',
        actorUserId,
        entityType: 'User',
        entityId: targetId,
        adminCommunicationId: 'communication-1',
        metadata: expect.objectContaining({ providerMessageId: 'message-1' }),
      }),
    })
    expect(mocks.deliveryAttemptCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ providerStatus: 'PROVIDER_ACCEPTED', providerMessageId: 'message-1' }),
    })
  })

  it('audit een verzendfout en meldt geen vals succes', async () => {
    mocks.sendAuthEmail.mockRejectedValue(new Error('provider niet beschikbaar'))

    await expect(sendPlatformAdminMessage({
      actorUserId,
      targetType: 'USER',
      targetId,
      subject: 'Controle van uw account',
      message: 'Neem contact op met WorkMatchr voor de vervolgstap.',
    })).rejects.toMatchObject({ code: 'DELIVERY_FAILED' })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'ADMIN_EMAIL_FAILED', adminCommunicationId: 'communication-1' }),
    })
    expect(mocks.deliveryAttemptCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ providerStatus: 'FAILED', failureCode: 'EMAIL_DELIVERY_UNKNOWN' }),
    })
  })

  it('verstuurt een open organisatie-uitnodiging opnieuw via de bestaande activatieflow', async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: targetId,
      email: 'uitgenodigd@example.invalid',
      emailVerified: false,
      status: 'INVITED',
      memberships: [{
        organizationId: '33333333-3333-4333-8333-333333333333',
        status: 'INVITED',
        organization: { name: 'Voorbeeldorganisatie', status: 'ACTIVE' },
      }],
    })

    await sendPlatformUserAccessEmail({ actorUserId, subjectUserId: targetId, operation: 'ACTIVATION' })

    expect(mocks.activation).toHaveBeenCalledWith(expect.objectContaining({
      email: 'uitgenodigd@example.invalid',
      organizationName: 'Voorbeeldorganisatie',
    }))
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'ADMIN_ACTIVATION_EMAIL_SENT' }),
    })
  })

  it('houdt activatie, verificatie en wachtwoordherstel als afzonderlijke reizen', async () => {
    await sendPlatformUserAccessEmail({ actorUserId, subjectUserId: targetId, operation: 'VERIFICATION' })
    await sendPlatformUserAccessEmail({ actorUserId, subjectUserId: targetId, operation: 'PASSWORD_RESET' })

    expect(mocks.verification).toHaveBeenCalledOnce()
    expect(mocks.passwordReset).toHaveBeenCalledOnce()
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'ADMIN_VERIFICATION_EMAIL_SENT' }),
    })
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'ADMIN_PASSWORD_RESET_EMAIL_SENT' }),
    })
    expect(mocks.communicationCreate).not.toHaveBeenCalled()
  })

  it('weigert verificatie zolang de eigen activatie-uitnodiging nog openstaat', async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: targetId,
      email: 'uitgenodigd@example.invalid',
      emailVerified: false,
      status: 'INVITED',
      memberships: [{
        organizationId: '33333333-3333-4333-8333-333333333333',
        status: 'INVITED',
        organization: { name: 'Voorbeeldorganisatie', status: 'ACTIVE' },
      }],
    })

    await expect(sendPlatformUserAccessEmail({
      actorUserId,
      subjectUserId: targetId,
      operation: 'VERIFICATION',
    })).rejects.toMatchObject({ code: 'NOT_AVAILABLE' })
    expect(mocks.verification).not.toHaveBeenCalled()
  })

  it('legt notities en onderzocht-status append-only vast', async () => {
    await addPlatformAdminNote({
      actorUserId,
      targetType: 'ASSIGNMENT',
      targetId,
      category: 'Opdrachten',
      text: 'Het signaal is inhoudelijk onderzocht.',
      operation: 'MARK_INVESTIGATED',
    })

    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'ASSIGNMENT_SIGNAL_INVESTIGATED',
        entityType: 'Assignment',
      }),
    })
  })

  it('legt status en verantwoordelijke van een bestaand WOS-signaal vast', async () => {
    await updatePlatformSignalStatus({
      actorUserId,
      signalId: 'organization-owner:organization-1',
      status: 'IN_PROGRESS',
      note: 'De eigenaar wordt gecontroleerd.',
    })

    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'PLATFORM_ACTION_STATUS_CHANGED',
        entityType: 'PlatformAdviceSignal',
        metadata: expect.objectContaining({
          status: 'IN_PROGRESS',
          responsibleUserId: actorUserId,
        }),
      }),
    })
  })

  it('voert niets uit wanneer platformautorisatie wordt geweigerd', async () => {
    mocks.authorize.mockRejectedValue(new Error('geen toegang'))

    await expect(addPlatformAdminNote({
      actorUserId,
      targetType: 'USER',
      targetId,
      category: 'Gebruikers',
      text: 'Alleen voor platformbeheer.',
    })).rejects.toThrow('geen toegang')
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })

  it('weigert een onbekend signaal fail-closed', async () => {
    await expect(updatePlatformSignalStatus({
      actorUserId,
      signalId: 'onbekend-signaal',
      status: 'CLOSED',
    })).rejects.toBeInstanceOf(PlatformAdminActionError)
    expect(mocks.auditCreate).not.toHaveBeenCalled()
  })
})
