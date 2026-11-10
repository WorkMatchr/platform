'use server'
import { z } from 'zod'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getPrisma } from '@/lib/prisma'
import { currentAcademyAccess } from '@/lib/learning/academy-access-policy'
import { allowsAssignedPilot, pilotAreaAvailable } from '@/lib/learning/learning-exam-runtime-version'
import { measuredInterval } from '@/lib/learning/academy-pilot-time'

const observation = z
  .object({ enrollment: z.uuid(), clock: z.uuid(), target: z.uuid(), exam: z.boolean(), pause: z.boolean() })
  .strict()
export async function recordPilotObservation(input: z.input<typeof observation>) {
  if (!pilotAreaAvailable()) return
  const event = observation.parse(input)
  const user = await requireLearningUser('/e-learnings/mijn')
  await getPrisma().$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "LearningPilotAssignment" WHERE "enrollmentId"=${event.enrollment}::uuid AND "userId"=${user.id}::uuid FOR UPDATE`
    const grant = await tx.learningPilotAssignment.findFirst({
      where: {
        enrollmentId: event.enrollment,
        userId: user.id,
        enrollment: { ...currentAcademyAccess(), status: 'IN_PROGRESS' },
      },
      include: { courseVersion: { include: { course: true } } },
    })
    if (!grant || !allowsAssignedPilot(grant.courseVersion.course.code, grant.courseVersion.version)) return
    const now = new Date()
    const sameClock = grant.clockId === event.clock
    if (event.pause && !sameClock) return
    let context: string
    if (event.exam) {
      const attempt = await tx.learningExamAttempt.findFirst({
        where: { id: event.target, enrollmentId: event.enrollment, userId: user.id },
      })
      if (!attempt || attempt.status !== 'IN_PROGRESS') return
      context = 'exam:' + attempt.attemptNumber
    } else {
      const block = await tx.learningContentBlock.findFirst({
        where: { id: event.target, chapter: { courseVersionId: grant.courseVersionId } },
        include: { chapter: true },
      })
      if (!block) return
      const afterExam = await tx.learningExamAttempt.count({ where: { enrollmentId: event.enrollment } })
      context = [
        afterExam ? 'herhaling' : block.questionId ? 'oefening' : 'les',
        block.chapter.position,
      ].join(':')
    }
    const interval = measuredInterval(
      grant.lastPulseAt,
      now,
      sameClock,
      !event.pause && grant.lastContext === context,
    )
    // Accumulate only a measured interval. Keep interruption totals separate from study.
    const pausedSince = grant.lastContext === 'pauze' && grant.lastPulseAt
    const gapMs = grant.lastPulseAt ? now.getTime() - grant.lastPulseAt.getTime() : 0
    const interruption = pausedSince ? 'pauze' : interval.incomplete ? 'onbekend' : null
    if (interruption && gapMs > 0) {
      // Daily buckets keep every counter below 24 hours, even across a long absence.
      const dayMs = 86_400_000
      let start = now.getTime() - gapMs
      while (start < now.getTime()) {
        const end = Math.min(now.getTime(), (Math.floor(start / dayMs) + 1) * dayMs)
        const bucket = interruption + ':' + new Date(start).toISOString().slice(0, 10)
        await tx.learningPilotDuration.upsert({
          where: { assignmentId_context: { assignmentId: grant.id, context: bucket } },
          create: { assignmentId: grant.id, context: bucket, activeMs: end - start },
          update: { activeMs: { increment: end - start } },
        })
        start = end
      }
    }
    if (interval.activeMs)
      await tx.learningPilotDuration.upsert({
        where: { assignmentId_context: { assignmentId: grant.id, context } },
        create: { assignmentId: grant.id, context, activeMs: interval.activeMs },
        update: { activeMs: { increment: interval.activeMs } },
      })
    await tx.learningPilotAssignment.update({
      where: { id: grant.id },
      data: {
        lastPulseAt: now,
        clockId: event.pause ? null : event.clock,
        lastContext: event.pause ? 'pauze' : context,
        pauses: { increment: event.pause ? 1 : 0 },
        gaps: { increment: interval.incomplete && !pausedSince ? 1 : 0 },
      },
    })
  })
}
