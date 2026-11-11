import 'server-only'
import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { allowsAssignedPilot, isLocalPilot, paidPilotEnabled } from './learning-exam-runtime-version'

import { PILOT_GROSS_CENTS } from './academy-paid-price'

const marker = 'ACADEMY_PILOT'
const grantInput = z.object({
  email: z.email().max(254),
  versions: z.array(z.uuid()).min(1).max(3),
  paid: z.boolean().optional(),
  maximumUses: z.number().int().positive().max(3),
  validUntil: z.date(),
  cohortEndsAt: z.date().optional(),
})

export async function assignPilot(actorId: string, input: z.input<typeof grantInput>) {
  if (input.paid ? !paidPilotEnabled() : !isLocalPilot()) throw Error('PILOT_DISABLED')
  const { email, versions, maximumUses, validUntil, cohortEndsAt } = grantInput.parse(input)
  if (input.paid && (!cohortEndsAt || cohortEndsAt < validUntil)) throw Error('PILOT_COHORT_END_REQUIRED')
  const ids = [...new Set(versions)].sort()
  if (input.paid && (ids.length !== 1 || maximumUses !== 1)) throw Error('PILOT_INPUT_INVALID')
  if (validUntil <= new Date() || maximumUses > ids.length) throw Error('PILOT_INPUT_INVALID')
  return getPrisma().$transaction(async (tx) => {
    await requireMarketplacePlatformAdmin(tx, actorId)
    const user = await tx.user.findFirst({
      where: { email: email.trim().toLowerCase(), status: 'ACTIVE', emailVerified: true },
      select: { id: true, email: true },
    })
    // This local acceptance facility must never enroll a real person before the P0 decisions.
    if (!user || (isLocalPilot() && !user.email.endsWith('@example.invalid')))
      throw Error('PILOT_ACCOUNT_UNAVAILABLE')
    let paidSlot: number | null = null
    if (input.paid) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('academy-paid-pilot-r07',0))::text`
      const slots = await tx.learningPilotAssignment.findMany({
        where: { paidSlot: { not: null } },
        select: { paidSlot: true },
      })
      paidSlot = [1, 2, 3].find((slot) => !slots.some((row) => row.paidSlot === slot)) ?? null
      if (!paidSlot) throw Error('PILOT_FULL')
    }
    for (const id of ids) {
      await tx.$queryRaw`SELECT id FROM "LearningCourseVersion" WHERE id=${id}::uuid FOR UPDATE`
      const version = await tx.learningCourseVersion.findFirstOrThrow({
        where: { id, status: 'PUBLISHED' },
        include: { course: true },
      })
      if (!allowsAssignedPilot(version.course.code, version.version)) throw Error('PILOT_DISABLED')
      if (
        !input.paid &&
        (await tx.learningPilotAssignment.count({ where: { courseVersionId: id, paidSlot: null } })) >= 12
      )
        throw Error('PILOT_FULL')
      if (
        await tx.learningEnrollment.count({
          where: { userId: user.id, courseVersion: { courseId: version.courseId } },
        })
      )
        throw Error('EXISTING_ENROLLMENT')
    }
    const code = await tx.discountCode.create({
      data: {
        code: 'PILOT-' + randomBytes(10).toString('hex').toUpperCase(),
        createdByUserId: actorId,
        percentageBps: input.paid ? 9900 : 10000,
        applicablePackageSkus: input.paid ? ['ACADEMY_PAID_PILOT'] : [marker],
        validFrom: new Date(),
        validUntil,
        maximumUses,
      },
    })
    await tx.learningPilotAssignment.createMany({
      data: ids.map((courseVersionId) => ({
        userId: user.id,
        courseVersionId,
        paidSlot,
        cohortEndsAt: input.paid ? cohortEndsAt : null,
        regularGrossCents: input.paid ? PILOT_GROSS_CENTS : null,
        discountCodeId: code.id,
      })),
    })
    return code.code
  })
}

export async function redeemPilot(userId: string, versionId: string, input: string) {
  if (!isLocalPilot() || !z.uuid().safeParse(versionId).success || !/^PILOT-[0-9A-F]{20}$/.test(input))
    return false
  return getPrisma().$transaction(async (tx) => {
    const [locked] = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "DiscountCode" WHERE code=${input} FOR UPDATE`
    if (!locked) return false
    const assignment = await tx.learningPilotAssignment.findFirst({
      where: { discountCodeId: locked.id, userId, courseVersionId: versionId },
      include: {
        user: { select: { email: true, emailVerified: true, status: true } },
        discountCode: true,
        courseVersion: { include: { course: true } },
      },
    })
    if (!assignment || assignment.paidSlot !== null) return false
    const { user, courseVersion: v, discountCode: d } = assignment
    const now = new Date()
    if (
      !allowsAssignedPilot(v.course.code, v.version) ||
      v.status !== 'PUBLISHED' ||
      v.course.status !== 'PUBLISHED' ||
      !user.emailVerified ||
      user.status !== 'ACTIVE' ||
      !user.email.endsWith('@example.invalid')
    )
      return false
    if (assignment.enrollmentId) {
      const existing = await tx.learningEnrollment.findUnique({ where: { id: assignment.enrollmentId } })
      return Boolean(
        existing &&
          !existing.accessRevokedAt &&
          (!existing.accessExpiresAt || existing.accessExpiresAt > now),
      )
    }
    if (
      d.status !== 'ACTIVE' ||
      d.percentageBps !== 10000 ||
      d.applicablePackageSkus.length !== 1 ||
      d.applicablePackageSkus[0] !== marker ||
      d.validFrom > now ||
      !d.validUntil ||
      d.validUntil <= now ||
      !d.maximumUses
    )
      return false
    if (
      (await tx.learningPilotAssignment.count({
        where: { discountCodeId: d.id, redeemedAt: { not: null } },
      })) >= d.maximumUses
    )
      return false
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId}::uuid FOR UPDATE`
    if (await tx.learningEnrollment.findFirst({ where: { userId, courseVersion: { courseId: v.courseId } } }))
      return false
    const enrollment = await tx.learningEnrollment.create({ data: { userId, courseVersionId: v.id } })
    await tx.learningPilotAssignment.update({
      where: { id: assignment.id },
      data: { enrollmentId: enrollment.id, redeemedAt: now },
    })
    return true
  })
}
