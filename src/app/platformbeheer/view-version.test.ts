import { beforeEach, describe, expect, it, vi } from 'vitest'
const auth = vi.hoisted(() => vi.fn())
vi.mock('@/lib/platform-admin/platform-admin-authorization', () => ({ requirePlatformAuditor: auth }))
import { GET as v01 } from './v01/route'
import { GET as v02 } from './v02/route'

describe('authorized presentation preference', () => {
  beforeEach(() => { auth.mockReset() })
  it.each([['v01', v01], ['v02', v02]] as const)('switches %s without changing destination or rights', async (version, get) => {
    auth.mockResolvedValue({ membershipRole: 'OWNER' })
    const response = await get(new Request(`http://localhost/platformbeheer/${version}`))
    expect(auth).toHaveBeenCalledWith(`/platformbeheer/${version}`)
    expect(response.headers.get('location')).toBe('http://localhost/platformbeheer')
    expect(response.cookies.get('platform-admin-view')?.value).toBe(version)
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('set-cookie')).toContain('Path=/platformbeheer')
    expect(response.headers.get('cache-control')).toBe('private, no-store')
  })
  it('refuses a version switch before setting a cookie for unauthorized users', async () => {
    auth.mockRejectedValue(new Error('access denied'))
    await expect(v02(new Request('http://localhost/platformbeheer/v02'))).rejects.toThrow('access denied')
  })
})
