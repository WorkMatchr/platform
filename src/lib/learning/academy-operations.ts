import 'server-only'
import { getPrisma } from '@/lib/prisma'

const templates = ['ACADEMY_ORDER_CONFIRMED', 'ACADEMY_SEAT_INVITED', 'ACADEMY_WITHDRAWAL_RECEIVED',
  'LEARNING_CERTIFICATE_ISSUED', 'LEARNING_CERTIFICATE_RESEND', 'LEARNING_RETENTION_WEEK_READY', 'LEARNING_RETENTION_ANNUAL_READY']

/** Aggregates only; no payload, recipient, order ID, error message or connection identity. */
export async function readAcademyOperations(at = new Date()) {
  const db = getPrisma()
  const late = new Date(at.getTime() - 30 * 60_000)
  const day = new Date(at.getTime() - 24 * 60 * 60_000)
  const [pending, overdue, expiredLeases, failedLastDay, uncertainPayments, failedPaymentsLastDay, annualDue, weekly] = await Promise.all([
    db.notificationOutbox.count({ where: { templateKey: { in: templates }, channel: 'EMAIL', status: 'PENDING' } }),
    db.notificationOutbox.count({ where: { templateKey: { in: templates }, channel: 'EMAIL', status: 'PENDING', availableAt: { lt: late } } }),
    db.notificationOutbox.count({ where: { templateKey: { in: templates }, channel: 'EMAIL', status: 'PROCESSING', OR: [{ leaseUntil: { lte: at } }, { leaseUntil: null }] } }),
    db.notificationOutbox.count({ where: { templateKey: { in: templates }, channel: 'EMAIL', status: 'FAILED', OR: [{ processedAt: { gte: day } }, { processedAt: null, createdAt: { gte: day } }] } }),
    db.financialPurchase.count({ where: { kind: 'ACADEMY_COURSE', status: 'PAYMENT_PENDING', updatedAt: { lt: late } } }),
    db.financialPurchase.count({ where: { kind: 'ACADEMY_COURSE', status: 'FAILED', updatedAt: { gte: day } } }),
    db.learningAnnualReminder.count({ where: { revokedAt: null, sentAt: null, scheduledFor: { lt: late }, enrollment: { accessRevokedAt: null }, user: { status: 'ACTIVE', emailVerified: true } } }),
    db.$queryRaw<Array<{ backlog: number }>>`
      SELECT count(*)::int AS backlog FROM "LearningRetentionParticipation" p
      JOIN "LearningRetentionProgramVersion" v ON v.id = p."programVersionId"
      JOIN "LearningEnrollment" e ON e.id = p."learningEnrollmentId"
      JOIN "User" u ON u.id = p."userId"
      WHERE p.status IN ('ACTIVE', 'COMPLETED') AND p."stoppedAt" IS NULL
        AND e."accessRevokedAt" IS NULL AND u.status = 'ACTIVE' AND u."emailVerified" = true
        AND p."startedAt" <= ${late}
        AND ${at} < p."startedAt" + (v."durationWeeks" * 7 + v."openAfterProgramDays") * interval '1 day'
        AND EXISTS (
          SELECT 1 FROM generate_series(1, LEAST(v."durationWeeks", floor(extract(epoch FROM (${late}::timestamptz - p."startedAt")) / 604800)::int + 1)) w(week)
          WHERE NOT EXISTS (SELECT 1 FROM "LearningRetentionWeeklyCheck" c WHERE c."participationId" = p.id AND c."weekNumber" = w.week)
        )`,
  ])
  const weeklyBacklog = weekly[0]?.backlog ?? 0
  const alerts = [
    ...(overdue ? ['ACADEMY_OUTBOX_OVERDUE'] : []),
    ...(expiredLeases ? ['ACADEMY_OUTBOX_LEASE_EXPIRED'] : []),
    ...(failedLastDay ? ['ACADEMY_DELIVERY_FAILED'] : []),
    ...(uncertainPayments ? ['ACADEMY_PAYMENT_RECONCILIATION_REQUIRED'] : []),
    ...(annualDue ? ['ACADEMY_ANNUAL_SCHEDULE_BACKLOG'] : []),
    ...(weeklyBacklog ? ['ACADEMY_WEEKLY_SCHEDULE_BACKLOG'] : []),
  ]
  return { status: alerts.length ? 'REVIEW_REQUIRED' as const : 'OK' as const, checkedAt: at.toISOString(),
    thresholds: { overdueMinutes: 30, recentFailureHours: 24 },
    counts: { pending, overdue, expiredLeases, failedLastDay, uncertainPayments, failedPaymentsLastDay, annualDue, weeklyBacklog }, alerts }
}
