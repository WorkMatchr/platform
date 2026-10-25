import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setMyAnnualReminderConsent } from './learning-retention-annual-service'

const mocks = vi.hoisted(() => ({
  findPassedAttempt: vi.fn(), chapterProgressCount: vi.fn(), chapterCount: vi.fn(),
  findReminder: vi.fn(), createReminder: vi.fn(), updateReminder: vi.fn(), createConsentEvent: vi.fn(), requeueOutbox: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({
  learningExamAttempt: { findFirst: mocks.findPassedAttempt },
  learningChapterProgress: { count: mocks.chapterProgressCount },
  learningChapter: { count: mocks.chapterCount },
  $transaction: (callback: (transaction: unknown) => unknown) => callback({
    learningAnnualReminder: { findUnique: mocks.findReminder, create: mocks.createReminder, update: mocks.updateReminder },
    learningAnnualReminderConsentEvent: { create: mocks.createConsentEvent },
    notificationOutbox: { updateMany: mocks.requeueOutbox },
  }),
  learningAnnualReminder: { findUnique: mocks.findReminder },
}) }))

const earnedAt = new Date('2024-02-29T10:15:00.000Z')
const reminder = { id: 'reminder-1', enrollmentId: 'enrollment-1', userId: 'student-1', consentVersion: 'WL-001-ANNUAL-REMINDER-CONSENT-1.0', consentedAt: new Date('2026-06-01T00:00:00.000Z'), scheduledFor: new Date('2025-02-28T10:15:00.000Z'), sentAt: null, revokedAt: null }

beforeEach(() => {
  vi.clearAllMocks()
  mocks.findPassedAttempt.mockResolvedValue({ id: 'passed-attempt-1', userId: 'student-1', enrollmentId: 'enrollment-1', courseVersionId: 'course-version-1', submittedAt: earnedAt })
  mocks.chapterProgressCount.mockResolvedValue(10)
  mocks.chapterCount.mockResolvedValue(10)
  mocks.findReminder.mockResolvedValue(null)
  mocks.createReminder.mockResolvedValue(reminder)
  mocks.updateReminder.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve({ ...reminder, ...data }))
  mocks.createConsentEvent.mockResolvedValue({ id: 'consent-event-1' })
  mocks.requeueOutbox.mockResolvedValue({ count: 0 })
})

describe('afzonderlijke jaarherinneringconsent', () => {
  it('maakt alleen na expliciete keuze één reminder vanaf de eerste behaalde examdatum', async () => {
    await expect(setMyAnnualReminderConsent('student-1', true, new Date('2026-06-01T00:00:00.000Z'))).resolves.toEqual({ enabled: true, scheduledFor: reminder.scheduledFor })
    expect(mocks.createReminder).toHaveBeenCalledWith({ data: expect.objectContaining({
      userId: 'student-1', enrollmentId: 'enrollment-1', qualifyingAttemptId: 'passed-attempt-1',
      consentVersion: 'WL-001-ANNUAL-REMINDER-CONSENT-1.0', consentedAt: new Date('2026-06-01T00:00:00.000Z'),
      scheduledFor: new Date('2025-02-28T10:15:00.000Z'),
    }) })
    expect(mocks.createConsentEvent).toHaveBeenCalledWith({ data: expect.objectContaining({
      reminderId: reminder.id, eventType: 'CONSENTED', occurredAt: new Date('2026-06-01T00:00:00.000Z'),
    }) })
  })

  it('kan jaarconsent weigeren zonder reminder of wekelijkse deelname te maken', async () => {
    await expect(setMyAnnualReminderConsent('student-1', false)).resolves.toEqual({ enabled: false, scheduledFor: null })
    expect(mocks.createReminder).not.toHaveBeenCalled()
    expect(mocks.updateReminder).not.toHaveBeenCalled()
  })

  it('trekt alleen de jaarherinnering in en behoudt exam-/certificaatdata', async () => {
    mocks.findReminder.mockResolvedValue(reminder)
    await setMyAnnualReminderConsent('student-1', false, new Date('2026-06-01T00:00:00.000Z'))
    expect(mocks.updateReminder).toHaveBeenCalledWith({ where: { id: reminder.id }, data: { revokedAt: new Date('2026-06-01T00:00:00.000Z') } })
    expect(mocks.createConsentEvent).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: 'REVOKED', consentVersion: 'WL-001-ANNUAL-REMINDER-CONSENT-1.0' }) })
    expect(mocks.createReminder).not.toHaveBeenCalled()
  })

  it('geeft opnieuw toestemming na intrekking met nieuwe historie en zonder nieuwe herinnering', async () => {
    const revokedAt = new Date('2026-06-01T00:00:00.000Z')
    const consentedAt = new Date('2026-06-02T00:00:00.000Z')
    mocks.findReminder.mockResolvedValue({ ...reminder, revokedAt, consentedAt: new Date('2026-05-01T00:00:00.000Z'), consentVersion: 'WL-001-ANNUAL-REMINDER-CONSENT-1.0' })
    await expect(setMyAnnualReminderConsent('student-1', true, consentedAt)).resolves.toEqual({ enabled: true, scheduledFor: reminder.scheduledFor })
    expect(mocks.createReminder).not.toHaveBeenCalled()
    expect(mocks.createConsentEvent).toHaveBeenCalledWith({ data: {
      reminderId: reminder.id, eventType: 'CONSENTED', occurredAt: consentedAt, consentVersion: 'WL-001-ANNUAL-REMINDER-CONSENT-1.0',
    } })
    expect(mocks.updateReminder).toHaveBeenCalledWith({ where: { id: reminder.id }, data: {
      revokedAt: null, consentedAt, consentVersion: 'WL-001-ANNUAL-REMINDER-CONSENT-1.0',
    } })
    expect(mocks.requeueOutbox).toHaveBeenCalledWith({
      where: {
        idempotencyKey: `EMAIL:${reminder.userId}:LEARNING_RETENTION_ANNUAL_READY:${reminder.id}`,
        templateKey: 'LEARNING_RETENTION_ANNUAL_READY', status: 'FAILED',
        lastErrorCode: 'RETENTION_NOT_DELIVERABLE', attemptCount: { lt: 5 },
      },
      data: { status: 'PENDING', availableAt: reminder.scheduledFor, processedAt: null, lastErrorCode: null, leaseToken: null, leaseUntil: null },
    })
  })

  it('houdt actieve toestemming idempotent en laat een verzonden herinnering niet opnieuw aanmelden', async () => {
    mocks.findReminder.mockResolvedValueOnce(reminder)
    await expect(setMyAnnualReminderConsent('student-1', true)).resolves.toEqual({ enabled: true, scheduledFor: reminder.scheduledFor })
    expect(mocks.createConsentEvent).not.toHaveBeenCalled()
    expect(mocks.updateReminder).not.toHaveBeenCalled()

    mocks.findReminder.mockResolvedValueOnce({ ...reminder, sentAt: new Date('2027-02-28T10:15:00.000Z'), revokedAt: null })
    await expect(setMyAnnualReminderConsent('student-1', true)).resolves.toEqual({ enabled: false, scheduledFor: reminder.scheduledFor })
    expect(mocks.createReminder).not.toHaveBeenCalled()
    expect(mocks.createConsentEvent).not.toHaveBeenCalled()
    expect(mocks.updateReminder).not.toHaveBeenCalled()
  })

  it('weigert jaarconsent zonder voltooide H1–H10 en geslaagde toets', async () => {
    mocks.chapterProgressCount.mockResolvedValue(9)
    await expect(setMyAnnualReminderConsent('student-1', true)).rejects.toThrow('ANNUAL_REMINDER_NOT_ELIGIBLE')
    expect(mocks.createReminder).not.toHaveBeenCalled()
  })
})
