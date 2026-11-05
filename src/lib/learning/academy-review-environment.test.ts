import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assertAcademyReviewEnvironment } from './academy-review-environment'
const target = 'postgresql://fixture:fixture@fixture-301797460c.example.invalid/neondb?sslmode=verify-full'
beforeEach(() => {
  for (const key of ['VERCEL','VERCEL_ENV','RESEND_API_KEY','MOLLIE_API_KEY','ACADEMY_COMMERCE_SANDBOX']) vi.stubEnv(key,'')
  vi.stubEnv('NODE_ENV','test'); vi.stubEnv('DATABASE_URL',target)
  vi.stubEnv('ACADEMY_TEST_PROJECT_ID','academy-synthetic-project'); vi.stubEnv('ACADEMY_TEST_BRANCH_ID','branch-fixture-blue-morning')
})
afterEach(() => vi.unstubAllEnvs())
describe('human review independent of payments, still isolated', () => {
  it('allows review without a payment key or commerce activation', () => expect(() => assertAcademyReviewEnvironment()).not.toThrow())
  it.each([['NODE_ENV','production'],['VERCEL_ENV','production'],['VERCEL','1'],['RESEND_API_KEY','fake'],['DATABASE_URL',''],['DATABASE_URL',target+'&host=other.invalid'],['DATABASE_URL',target.replace('neondb','other')],['ACADEMY_TEST_PROJECT_ID','other'],['ACADEMY_TEST_BRANCH_ID','other']])('refuses unsafe %s', (key,value) => { vi.stubEnv(key,value); expect(() => assertAcademyReviewEnvironment()).toThrow() })
})
