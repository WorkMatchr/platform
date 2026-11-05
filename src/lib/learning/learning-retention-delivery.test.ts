import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthEmailDeliveryError } from '@/lib/email'
const state = vi.hoisted(() => ({ db: null as unknown }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => state.db }))
vi.mock('@/lib/public-app-url', () => ({ getPublicAppBaseUrl: () => 'https://academy.example.invalid' }))
import { deliverLearningRetentionEmails } from './learning-retention-email-worker'
const at = new Date('2026-10-29T12:00:00Z')
const record = { id: 'participation', userId: 'student', user: { email: 'student@example.invalid' }, enrollment: { courseVersion: { course: { title: 'Testopleiding', slug: 'testopleiding' } } } }
let db: ReturnType<typeof fixture>
function fixture() {
  const job = { id: 'job', templateKey: 'LEARNING_RETENTION_WEEK_READY', recipientUserId: 'student', idempotencyKey: 'synthetic-retention-week', payload: { participationId: 'participation', weeklyCheckId: 'check', weekNumber: 1 }, attemptCount: 1, firstAttemptAt: at }
  const value = { $queryRaw: vi.fn().mockResolvedValue([{ id: 'job' }]), notificationOutbox: { findUniqueOrThrow: vi.fn().mockResolvedValue(job), updateMany: vi.fn().mockResolvedValue({ count: 1 }) }, learningRetentionParticipation: { findFirst: vi.fn().mockResolvedValue(record) }, learningAnnualReminder: { findFirst: vi.fn().mockResolvedValue(record), updateMany: vi.fn().mockResolvedValue({ count: 1 }) }, learningProfile: { findUnique: vi.fn().mockResolvedValue({ firstName: 'Voorbeeld' }) }, $transaction: vi.fn() }
  value.$transaction.mockImplementation(async callback => callback(value))
  return value
}
const accepted = () => vi.fn().mockResolvedValue({ status: 'ACCEPTED', accepted: true, messageId: 'fake-accepted' })
beforeEach(() => { db = fixture(); state.db = db; vi.stubEnv('LEARNING_RUNTIME_ENABLED', 'true'); vi.stubEnv('VERCEL_ENV', '') })
afterEach(() => vi.unstubAllEnvs())
describe('retention delivery lease and acknowledgement', () => {
  it('rechecks exclusive unexpired lease before invoking the sender', async () => {
    const send = accepted(); expect(await deliverLearningRetentionEmails({ limit: 1, now: () => at, send })).toMatchObject({ sent: 1 })
    expect(db.notificationOutbox.updateMany.mock.calls[0][0].where).toMatchObject({ id: 'job', status: 'PROCESSING', leaseUntil: { gt: at } }); expect(send).toHaveBeenCalledOnce()
    expect(db.learningRetentionParticipation.findFirst.mock.calls[1][0].where).toMatchObject({ enrollment: { accessRevokedAt: null }, user: { status: 'ACTIVE', emailVerified: true, email: 'student@example.invalid' } })
  })
  it('never sends when another worker has taken the lease or it has expired', async () => {
    db.notificationOutbox.updateMany.mockResolvedValue({ count: 0 }); const send = accepted()
    expect(await deliverLearningRetentionEmails({ limit: 1, now: () => at, send })).toMatchObject({ sent: 0 }); expect(send).not.toHaveBeenCalled()
  })
  it('rechecks consent and refuses a stopped/revoked record', async () => {
    db.learningRetentionParticipation.findFirst.mockResolvedValueOnce(record).mockResolvedValueOnce(null); const send = accepted()
    expect(await deliverLearningRetentionEmails({ limit: 1, now: () => at, send })).toMatchObject({ failed: 1 }); expect(send).not.toHaveBeenCalled()
  })
  it('retries a temporary provider outage with the same idempotency key and bounded backoff', async () => {
    const send = vi.fn().mockRejectedValue(new AuthEmailDeliveryError('EMAIL_PROVIDER_UNAVAILABLE', 'Synthetic provider outage'))
    expect(await deliverLearningRetentionEmails({ limit: 1, now: () => at, send })).toMatchObject({ retry: 1 })
    expect(db.notificationOutbox.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', availableAt: new Date(at.getTime() + 60_000) }) }))
  })
  it('does not convert a provider acceptance plus local acknowledgement failure into a normal retry', async () => {
    db.notificationOutbox.updateMany.mockResolvedValueOnce({ count: 1 }).mockRejectedValueOnce(new Error('synthetic database fault')); const send = accepted()
    await expect(deliverLearningRetentionEmails({ limit: 1, now: () => at, send })).rejects.toThrow('DELIVERY_ACKNOWLEDGEMENT_FAILED')
    expect(send).toHaveBeenCalledOnce(); expect(db.notificationOutbox.updateMany).toHaveBeenCalledTimes(2)
  })
  it('acknowledges the annual outbox and annual sentAt in one transaction', async () => {
    db.notificationOutbox.findUniqueOrThrow.mockResolvedValue({ ...await db.notificationOutbox.findUniqueOrThrow(), templateKey: 'LEARNING_RETENTION_ANNUAL_READY', payload: { annualReminderId: record.id } })
    expect(await deliverLearningRetentionEmails({ limit: 1, now: () => at, send: accepted() })).toMatchObject({ sent: 1 })
    expect(db.$transaction).toHaveBeenCalledOnce(); expect(db.learningAnnualReminder.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { sentAt: at } }))
  })
  it('does not downgrade an accepted annual send when its atomic commit fails', async () => {
    db.notificationOutbox.findUniqueOrThrow.mockResolvedValue({ ...await db.notificationOutbox.findUniqueOrThrow(), templateKey: 'LEARNING_RETENTION_ANNUAL_READY', payload: { annualReminderId: record.id } }); db.$transaction.mockRejectedValue(new Error('synthetic commit failure'))
    await expect(deliverLearningRetentionEmails({ limit: 1, now: () => at, send: accepted() })).rejects.toThrow('DELIVERY_ACKNOWLEDGEMENT_FAILED')
    expect(db.notificationOutbox.updateMany).toHaveBeenCalledTimes(1)
  })
  it('does not touch any job while runtime is disabled', async () => {
    vi.stubEnv('LEARNING_RUNTIME_ENABLED', 'false'); const send = accepted(); expect(await deliverLearningRetentionEmails({ limit: 1, send })).toEqual({ claimed: 0, sent: 0, retry: 0, failed: 0 }); expect(db.$queryRaw).not.toHaveBeenCalled()
  })
})
