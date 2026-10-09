import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
const context = vi.hoisted(() => vi.fn())
vi.mock('./platform-admin-authorization', () => ({
  getPlatformAuditorContext: context,
  PlatformAdminAccessError: class extends Error {},
}))
import { getPlatformAdminLanding } from './platform-admin-landing'
import { PlatformAdminAccessError } from './platform-admin-authorization'

describe('generic platform landing', () => {
  beforeEach(() => { context.mockReset() })
  it.each(['OWNER', 'ADMIN', 'MEMBER'])('uses current server authorization for %s', async (membershipRole) => {
    context.mockResolvedValue({ membershipRole })
    expect(await getPlatformAdminLanding('user')).toBe('/platformbeheer')
    expect(context).toHaveBeenCalledWith('user')
  })
  it('keeps the existing tenant dashboard when platform access is denied', async () => {
    context.mockRejectedValue(new PlatformAdminAccessError())
    expect(await getPlatformAdminLanding('tenant')).toBeNull()
  })
  it('does not swallow database or unexpected authorization errors', async () => {
    context.mockRejectedValue(new Error('unavailable'))
    await expect(getPlatformAdminLanding('user')).rejects.toThrow('unavailable')
  })
})
