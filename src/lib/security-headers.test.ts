import { describe, expect, it } from 'vitest'
import config from '../../next.config'

describe('application security headers', () => {
  it('protects every route against framing, MIME sniffing and base/object injection', async () => {
    const rules = await config.headers!()
    const globalSecurityRules = rules.filter(rule => rule.source === '/:path*' && rule.headers.some(header => header.key === 'Content-Security-Policy'))
    expect(globalSecurityRules).toHaveLength(1)
    const headers = Object.fromEntries(globalSecurityRules[0]!.headers.map(({ key, value }) => [key, value]))
    const otherRules = rules.filter(rule => rule !== globalSecurityRules[0])
    expect(otherRules.length).toBeGreaterThan(0)
    expect(otherRules.every(rule => rule.headers.every(header => header.key === 'X-Robots-Tag'))).toBe(true)
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(headers['Content-Security-Policy']).toBe("base-uri 'self'; object-src 'none'; frame-ancestors 'none'")
    expect(config.poweredByHeader).toBe(false)
  })
})
