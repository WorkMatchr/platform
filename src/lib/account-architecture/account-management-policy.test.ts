import { describe, expect, it } from 'vitest'
import {
  canManageTenantAccount,
  canSelfBlock,
  creatorScopeAllowsManagement,
  isCentralPlatformAdministrator,
} from './account-management-policy'

describe('ADR-013 Fase 2B bevoegdhedenmatrix', () => {
  it('geeft OWNER beheer binnen de beschermde matrix', () => {
    expect(canManageTenantAccount('OWNER', 'MEMBER', 'INVITE_ADMIN')).toBe(true)
    expect(canManageTenantAccount('OWNER', 'ADMIN', 'BLOCK')).toBe(true)
    expect(canManageTenantAccount('OWNER', 'OWNER', 'TRANSFER_OWNER')).toBe(true)
    expect(canManageTenantAccount('OWNER', 'MEMBER', 'END_MEMBERSHIP')).toBe(false)
    expect(canManageTenantAccount('OWNER', 'MEMBER', 'MANAGE_PLATFORM_ROLES')).toBe(false)
  })

  it('begrenst ADMIN tot dagelijks beheer van MEMBERs', () => {
    expect(canManageTenantAccount('ADMIN', 'MEMBER', 'VIEW')).toBe(true)
    expect(canManageTenantAccount('ADMIN', 'MEMBER', 'INVITE_MEMBER')).toBe(true)
    expect(canManageTenantAccount('ADMIN', 'MEMBER', 'BLOCK')).toBe(true)
    expect(canManageTenantAccount('ADMIN', 'ADMIN', 'BLOCK')).toBe(false)
    expect(canManageTenantAccount('ADMIN', 'MEMBER', 'CHANGE_NON_OWNER_ROLE')).toBe(false)
  })

  it('geeft MEMBER geen accountmutaties', () => {
    expect(canManageTenantAccount('MEMBER', 'MEMBER', 'VIEW')).toBe(false)
    expect(canManageTenantAccount('MEMBER', 'MEMBER', 'BLOCK')).toBe(false)
  })

  it('laat creatorbinding alleen bestaande bevoegdheid verder beperken', () => {
    expect(creatorScopeAllowsManagement({ roleAllowsAction: false, actorUserId: 'actor', createdByUserId: 'actor' })).toBe(false)
    expect(creatorScopeAllowsManagement({ roleAllowsAction: true, actorUserId: 'actor', createdByUserId: 'other' })).toBe(false)
    expect(creatorScopeAllowsManagement({ roleAllowsAction: true, actorUserId: 'actor', createdByUserId: 'actor' })).toBe(true)
  })

  it('vereist alle drie centrale beheervoorwaarden', () => {
    const valid = {
      status: 'ACTIVE' as const,
      platformRole: 'ADMIN' as const,
      platformMembership: {
        status: 'ACTIVE' as const,
        organization: {
          status: 'ACTIVE' as const,
          organizationType: 'PLATFORM_OPERATOR' as const,
          systemKey: 'WORKMATCHR_PLATFORM',
        },
      },
    }
    expect(isCentralPlatformAdministrator(valid)).toBe(true)
    expect(isCentralPlatformAdministrator({ ...valid, platformRole: 'USER' })).toBe(false)
    expect(isCentralPlatformAdministrator({ ...valid, platformMembership: null })).toBe(false)
  })

  it('weigert self-block altijd', () => {
    expect(canSelfBlock('user-1', 'user-1')).toBe(false)
    expect(canSelfBlock('user-1', 'user-2')).toBe(true)
  })
})
