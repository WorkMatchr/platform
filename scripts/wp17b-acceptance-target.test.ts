import { describe, expect, it } from 'vitest'
import { assertWp17bTarget, WP17B_TARGET as t } from './wp17b-acceptance-target'

const url = `postgresql://${t.owner}:synthetic@${t.host}/${t.database}?sslmode=verify-full`
describe('WP17B operator target', () => {
  it('requires the independent new project identity', () => {
    expect(assertWp17bTarget(url, { branch: t.branch, endpoint: t.endpoint, database: t.database, role: t.owner }).hostname).toBe(t.host)
  })
  it.each([
    url.replace(t.host, 'ep-royal-sound-agegzj34.c-2.eu-central-1.aws.neon.tech'),
    url.replace(t.database, 'neondb'), url.replace(t.owner, 'neondb_owner'),
    url.replace('verify-full', 'disable'), url + '&host=elsewhere', url + '#override', 'not a URL',
  ])('refuses different credentials/targets/options without revealing input', candidate => {
    expect(() => assertWp17bTarget(candidate)).toThrow('WP17B_ACCEPTANCE_TARGET_REQUIRED')
  })
  it.each(['branch', 'endpoint', 'database', 'role'])('refuses a runtime %s mismatch', key => {
    expect(() => assertWp17bTarget(url, { branch: t.branch, endpoint: t.endpoint, database: t.database, role: t.owner, [key]: 'wrong' })).toThrow('WP17B_ACCEPTANCE_TARGET_REQUIRED')
  })
})
