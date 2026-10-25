import { describe, expect, it } from 'vitest'
import config from '../../next.config'

describe('application security headers', () => {
  it('protects every route against framing, MIME sniffing and base/object injection', async () => {
    const rules = await config.headers!()
    expect(rules).toHaveLength(1)
    expect(rules[0]?.source).toBe('/:path*')
    const headers = Object.fromEntries(rules[0]!.headers.map(({ key, value }) => [key, value]))
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Content-Security-Policy']).toBe("base-uri 'self'; object-src 'none'; frame-ancestors 'none'")
    expect(config.poweredByHeader).toBe(false)
  })
})
