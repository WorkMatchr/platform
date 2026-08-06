import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { platformAdminInvitationSchema } from './platform-admin-invitation-contract'

describe('Platformbeheerderuitnodigingen', () => {
  const base = {
    displayName: 'Nieuwe beheerder',
    email: 'platformbeheerder@example.invalid',
    idempotencyKey: 'platform-admin:test:1',
  }

  it('vereist expliciete bevestiging voor een platformeigenaar', () => {
    expect(
      platformAdminInvitationSchema.safeParse({
        ...base,
        role: 'OWNER',
        ownerConfirmed: false,
      }).success,
    ).toBe(false)
    expect(
      platformAdminInvitationSchema.safeParse({
        ...base,
        role: 'OWNER',
        ownerConfirmed: true,
      }).success,
    ).toBe(true)
  })

  it('accepteert uitsluitend de bestaande drie platformcontextrollen', () => {
    for (const role of ['OWNER', 'ADMIN', 'MEMBER']) {
      expect(
        platformAdminInvitationSchema.safeParse({
          ...base,
          role,
          ownerConfirmed: true,
        }).success,
      ).toBe(true)
    }
    expect(
      platformAdminInvitationSchema.safeParse({
        ...base,
        role: 'SUPER_ADMIN',
        ownerConfirmed: true,
      }).success,
    ).toBe(false)
  })

  it('houdt mutaties server-side achter de ownerpolicy', () => {
    const source = readFileSync(
      'src/lib/platform-admin/platform-admin-invitation-service.ts',
      'utf8',
    )
    expect(source).toContain('requirePlatformOwner')
    expect(source).toContain("context.platformMembership.role !== 'OWNER'")
    expect(source).toContain('De laatste platformeigenaar kan niet worden')
    expect(source).toContain('input.actorUserId === input.subjectUserId')
  })
})
