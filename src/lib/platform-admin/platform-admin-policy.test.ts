import { describe, expect, it } from 'vitest'
import { hasPlatformAdministratorIdentity } from './platform-admin-policy'

describe('platformbeheerautorisatie', () => {
  it('accepteert alleen de vooraf server-side gefilterde platformmembership', () => {
    expect(hasPlatformAdministratorIdentity({
      memberships: [{ organization: { systemKey: 'WORKMATCHR_PLATFORM' } }],
    })).toBe(true)
  })

  it.each([
    null,
    { memberships: [] },
    { memberships: [{ organization: { systemKey: null } }] },
    { memberships: [{ organization: { systemKey: 'ANDER_SYSTEEM' } }] },
  ])('weigert een context zonder geldig platformmembership', (context) => {
    expect(hasPlatformAdministratorIdentity(context)).toBe(false)
  })
})
