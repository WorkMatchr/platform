import 'server-only'
import type { sendAuthEmail } from '@/lib/email'
import { assertAcademyCommerceSandbox } from './academy-commerce-environment'
import { runLearningRetentionMaintenance } from './learning-retention-service'
import { deliverLearningRetentionEmails } from './learning-retention-email-worker'
import { deliverLearningCertificateEmails } from './learning-certificate-email-worker'
import { deliverAcademyCommerceEmails } from './academy-commerce-email-worker'

/** Manual isolated acceptance hook; deliberately no HTTP route, cron or default sender. */
export async function runAcademySandboxOperations(input: { send: typeof sendAuthEmail; now?: () => Date; limit?: number }) {
  assertAcademyCommerceSandbox()
  const now = input.now ?? (() => new Date())
  const results: Record<string, { status: 'PASS' | 'FAIL'; result?: unknown; errorCode?: string }> = {}
  async function run(category: string, work: () => Promise<unknown>) {
    try {
      const result = await work()
      const failed = result && typeof result === 'object' && 'failed' in result && typeof result.failed === 'number' && result.failed > 0
      results[category] = { status: failed ? 'FAIL' : 'PASS', result }
    }
    catch { results[category] = { status: 'FAIL', errorCode: 'ACADEMY_OPERATION_REQUIRES_REVIEW' } }
  }
  await run('retentionPlanning', () => runLearningRetentionMaintenance(now()))
  await run('certificateDelivery', () => deliverLearningCertificateEmails({ ...input, now }))
  await run('retentionDelivery', () => deliverLearningRetentionEmails({ ...input, now }))
  await run('commerceDelivery', () => deliverAcademyCommerceEmails({ ...input, now }))
  return results
}
