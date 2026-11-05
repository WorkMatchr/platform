import 'server-only'
import { assertAcademyDatabaseTarget } from './academy-database-policy'
import { commerceAssert } from './academy-commerce-policy'

/** Human review has no payment-provider dependency. Release remains isolated/test-only. */
export function assertAcademyReviewEnvironment() {
  assertAcademyDatabaseTarget({ databaseUrl: process.env.DATABASE_URL, projectId: process.env.ACADEMY_TEST_PROJECT_ID, branchId: process.env.ACADEMY_TEST_BRANCH_ID, nodeEnv: process.env.NODE_ENV, vercelEnv: process.env.VERCEL_ENV })
  commerceAssert(!process.env.VERCEL && !process.env.RESEND_API_KEY, 'ACADEMY_REVIEW_PRODUCTION_REFUSED')
}
