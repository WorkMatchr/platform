import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isUsableTenantMembership } from './organization-policy'

const tenantMembership = {
  status: 'ACTIVE' as const,
  organization: {
    status: 'ACTIVE' as const,
    organizationType: 'CLIENT' as const,
    systemKey: null,
  },
}

describe('enkelvoudige organisatiecontext', () => {
  it('accepteert een actieve normale tenantmembership', () => {
    expect(isUsableTenantMembership(tenantMembership)).toBe(true)
  })

  it('sluit platform-, ontbrekende en inactieve memberships uit', () => {
    expect(isUsableTenantMembership(null)).toBe(false)
    expect(
      isUsableTenantMembership({
        ...tenantMembership,
        organization: {
          status: 'ACTIVE',
          organizationType: 'PLATFORM_OPERATOR',
          systemKey: 'WORKMATCHR_PLATFORM',
        },
      }),
    ).toBe(false)
    expect(isUsableTenantMembership({ ...tenantMembership, status: 'SUSPENDED' })).toBe(false)
  })

  it('leidt de context zonder cookie of wisselactie uit de unieke userId af', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/organizations/organization-authorization.ts'),
      'utf8',
    )
    expect(source).toContain('findUnique')
    expect(source).toContain('where: { userId: user.id }')
    expect(source).not.toContain('cookies()')
    expect(source).not.toContain('ACTIVE_ORGANIZATION_COOKIE')
  })
})
