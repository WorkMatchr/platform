import 'server-only'
import { assertAcademyDatabaseTarget } from './academy-database-policy'
import { commerceAssert } from './academy-commerce-policy'

export function assertAcademyCommerceSandbox() {
  assertAcademyDatabaseTarget({ databaseUrl: process.env.DATABASE_URL, projectId: process.env.ACADEMY_TEST_PROJECT_ID, branchId: process.env.ACADEMY_TEST_BRANCH_ID, nodeEnv: process.env.NODE_ENV, vercelEnv: process.env.VERCEL_ENV })
  commerceAssert(process.env.ACADEMY_COMMERCE_SANDBOX === '1', 'ACADEMY_COMMERCE_NOT_ENABLED')
  commerceAssert(process.env.VERCEL_ENV !== 'production' && process.env.NODE_ENV !== 'production', 'ACADEMY_COMMERCE_PRODUCTION_REFUSED')
  commerceAssert(!process.env.RESEND_API_KEY, 'ACADEMY_LIVE_MAIL_REFUSED')
  commerceAssert(process.env.MOLLIE_API_KEY?.startsWith('test_'), 'ACADEMY_TEST_PAYMENT_KEY_REQUIRED')
}
