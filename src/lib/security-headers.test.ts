import { describe, expect, it } from 'vitest'
import config from '../../next.config'

describe('application security headers', () => {
  it('protects every route against framing, MIME sniffing and base/object injection', async () => {
    const rules = await config.headers!()
    const securityRules = rules.filter(rule => rule.headers.some(header => header.key.toLowerCase() === 'content-security-policy'))
    expect(securityRules).toHaveLength(1)
    expect(securityRules[0].source).toBe('/:path*')
    const headers = Object.fromEntries(securityRules[0].headers.map(({ key, value }) => [key, value]))
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Content-Security-Policy']).toBe("base-uri 'self'; object-src 'none'; frame-ancestors 'none'")
    const protectedNames = new Set(Object.keys(headers).map(name => name.toLowerCase()))
    for (const rule of rules.filter(rule => rule !== securityRules[0])) {
      expect(rule.headers.some(header => protectedNames.has(header.key.toLowerCase()))).toBe(false)
    }
    expect(config.poweredByHeader).toBe(false)
  })
})
