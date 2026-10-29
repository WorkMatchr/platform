import { describe, expect, it } from 'vitest'
import { acceptanceConnection } from './wp17-acceptance-preflight'

const env = { WP17_ACCEPTANCE_DATABASE_URL: 'postgresql://synthetic:synthetic@127.0.0.1:5432/workmatchr_wp17_acceptance_12_34' }
describe('local acceptance preflight boundary', () => {
  it('accepts only an explicitly owned local acceptance database', () => {
    expect(acceptanceConnection(env).pathname).toBe('/workmatchr_wp17_acceptance_12_34')
  })
  it.each([
    {}, { WP17_ACCEPTANCE_DATABASE_URL: env.WP17_ACCEPTANCE_DATABASE_URL.replace('127.0.0.1', 'production.example.invalid') },
    { WP17_ACCEPTANCE_DATABASE_URL: env.WP17_ACCEPTANCE_DATABASE_URL.replace('workmatchr_wp17_acceptance_12_34', 'neondb') },
    { WP17_ACCEPTANCE_DATABASE_URL: env.WP17_ACCEPTANCE_DATABASE_URL + '?host=production.example.invalid' },
    { ...env, VERCEL_ENV: 'preview' }, { ...env, DATABASE_URL: env.WP17_ACCEPTANCE_DATABASE_URL },
    { ...env, RESEND_API_KEY: 'synthetic' }, { ...env, MOLLIE_API_KEY: 'synthetic' },
    { ...env, COMPLIANCE_F4_ENABLED: 'true' }, { ...env, LEARNING_RUNTIME_ENABLED: 'true' },
  ])('refuses external/ambiguous credentials and premature gates', input => {
    expect(() => acceptanceConnection(input)).toThrow(/^WP17_ACCEPTANCE_CONFIGURATION_REFUSED$/)
  })
})
