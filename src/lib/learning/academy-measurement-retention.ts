import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'

/** Daily maintenance starts on day 29, leaving a day to recover from delays. */
export async function purgePilotMeasurements(now = new Date()) {
  const cutoff = new Date(now.getTime() - 29 * 86_400_000)
  return getPrisma().$transaction(async tx => {
    const due = await tx.$queryRaw<{id: string}[]>`
      SELECT a.id FROM "LearningPilotAssignment" a
      LEFT JOIN "LearningEnrollment" e ON e.id=a."enrollmentId"
      WHERE a."paidSlot" IS NOT NULL AND a."measurementsPurgedAt" IS NULL
      AND LEAST(a."cohortEndsAt", e."completedAt", e."accessRevokedAt", e."accessExpiresAt") <= ${cutoff}
      ORDER BY a.id FOR UPDATE OF a`
    const ids = due.map(row => row.id)
    if (!ids.length) return 0
    await tx.learningPilotDuration.deleteMany({ where: { assignmentId: { in: ids } } })
    await tx.learningPilotAssignment.updateMany({ where: { id: { in: ids } }, data: {
      measurementsPurgedAt: now, lastPulseAt: null, clockId: null, lastContext: null,
      offlineMinutes: null, feedback: Prisma.DbNull, gaps: 0, pauses: 0,
    } })
    return ids.length
  })
}
