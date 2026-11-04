import { academySeatAlumniState } from './academy-seat-refund-policy'
import { addAcademyCalendarYear, academyUnusedSeatAvailable } from './academy-access-policy'
import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { commerceAssert, ACADEMY_LEGAL_VERSION, normalizedAcademyEmail } from './academy-commerce-policy'

type Db = Prisma.TransactionClient
export async function lockAcademyCommerce(db: Db, key: string) {
  await db.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`academy-commerce:${key}`}, 0))::text`
}
export async function requireAcademyBuyer(db: Db, userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true, status: true, emailVerified: true } })
  commerceAssert(user?.status === 'ACTIVE' && user.emailVerified, 'ACADEMY_BUYER_NOT_AUTHORIZED')
  return user
}
export async function requireAcademyOrganizationBuyer(db: Db, userId: string, organizationId: string) {
  const membership = await db.organizationMembership.findFirst({ where: { userId, organizationId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] }, organization: { status: 'ACTIVE', systemKey: null } } })
  commerceAssert(membership, 'ACADEMY_ORGANIZATION_NOT_AUTHORIZED')
}
export async function ownedAcademyOrder(db: Db, actorId: string, orderId: string) {
  await requireAcademyBuyer(db, actorId)
  const order = await db.learningAcademyOrder.findUnique({ where: { id: orderId }, include: { purchase: true, courseVersion: { include: { course: true } }, seats: { orderBy: { position: 'asc' } } } })
  commerceAssert(order, 'ACADEMY_ORDER_NOT_FOUND')
  if (order.purchase.organizationId) await requireAcademyOrganizationBuyer(db, actorId, order.purchase.organizationId)
  else commerceAssert(order.buyerUserId === actorId, 'ACADEMY_ORDER_NOT_FOUND')
  return order
}
export async function qualifyingAcademyPass(db: Db, email: string, targetCourseId: string) {
  const passes = await db.learningExamAttempt.findMany({ where: {
    status: 'SUBMITTED', passed: true, user: { email: normalizedAcademyEmail(email), status: 'ACTIVE', emailVerified: true },
    examVersion: { status: { in: ['PUBLISHED', 'RETIRED'] }, courseId: { not: targetCourseId }, courseVersion: { course: { code: { startsWith: 'WL-' } } } },
  }, orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }], select: { id: true, userId: true, enrollmentId: true, courseVersionId: true } })
  let reviewRequired = false
  for (const pass of passes) {
    const seats = await db.learningAcademySeat.findMany({ where: { enrollmentId: pass.enrollmentId, userId: pass.userId }, include: {
      enrollment: { select: { accessRevocationReason: true } },
      order: { include: { seats: true, purchase: { include: { refunds: { include: { seatAllocations: true } } } } } },
    } })
    // Only a proven paid completion qualifies. A partial refund does not erase the achievement.
    const paid = seats.some(seat => {
      const p = seat.order.purchase
      if (!(p.amountInclVatCents > 0 && p.molliePaymentId && ['PAID', 'REFUND_REVIEW_REQUIRED'].includes(p.status))) return false
      const state = academySeatAlumniState({ ...seat.order, seatId: seat.id, amountInclVatCents: p.amountInclVatCents, refunds: p.refunds })
      if (state === 'REVIEW_REQUIRED') { reviewRequired = true; return false }
      return state === 'ELIGIBLE' && (seat.status === 'ACTIVE'
        || (seat.status === 'REVOKED' && seat.enrollment?.accessRevocationReason === 'ACADEMY_REFUND'))
    })
    if (!paid) continue
    const completed = await db.learningChapterProgress.count({ where: { enrollmentId: pass.enrollmentId, status: 'COMPLETED' } })
    const total = await db.learningChapter.count({ where: { courseVersionId: pass.courseVersionId } })
    if (total > 0 && completed === total) return pass
  }
  commerceAssert(!reviewRequired, 'ACADEMY_ALUMNI_REFUND_REVIEW_REQUIRED')
  return null
}

export async function activateAcademySeatInTransaction(db: Db, seatId: string, userId: string, termsVersion: string, now: Date) {
  const user = await requireAcademyBuyer(db, userId)
  await lockAcademyCommerce(db, `seat:${seatId}`)
  const seat = await db.learningAcademySeat.findUnique({ where: { id: seatId }, include: { order: { include: { purchase: true, courseVersion: { include: { course: true } } } } } })
  commerceAssert(seat && seat.order.purchase.status === 'PAID', 'ACADEMY_SEAT_NOT_AVAILABLE')
  const individual = seat.order.quantity === 1
  commerceAssert(individual ? seat.order.buyerUserId === userId : (seat.status === 'INVITED' || seat.status === 'ACTIVE') && seat.invitedEmail === normalizedAcademyEmail(user.email), 'ACADEMY_SEAT_NOT_AVAILABLE')
  if (seat.status === 'ACTIVE') {
    commerceAssert(seat.userId === userId, 'ACADEMY_SEAT_NOT_AVAILABLE')
    return seat
  }
  commerceAssert(individual || academyUnusedSeatAvailable(seat.order, now), 'ACADEMY_UNUSED_SEAT_EXPIRED')
  commerceAssert(seat.status !== 'REVOKED' && (individual || (seat.inviteExpiresAt && seat.inviteExpiresAt > now)), 'ACADEMY_INVITATION_EXPIRED')
  commerceAssert(termsVersion === ACADEMY_LEGAL_VERSION, 'ACADEMY_TERMS_REQUIRED')
  const evidence = seat.order.benefitProof as { participants?: Array<{ position: number; discountCents: number; identityLocked?: boolean; userId: string | null }> }
  const personalBenefit = evidence.participants?.find(item => item.position === seat.position && (item.discountCents > 0 || item.identityLocked))
  const transfer = personalBenefit && personalBenefit.userId !== userId ? await db.learningAcademySeatTransfer.findFirst({where:{seatId:seat.id,targetUserId:userId,targetEmail:normalizedAcademyEmail(user.email),appliedAt:{not:null},purchase:{status:'PAID'}}}) : null
  commerceAssert(!personalBenefit || personalBenefit.userId === userId || transfer, 'ACADEMY_BENEFIT_IDENTITY_MISMATCH')
  commerceAssert(['PUBLISHED', 'RETIRED'].includes(seat.order.courseVersion.status) && seat.order.courseVersion.course.status === 'PUBLISHED', 'ACADEMY_COURSE_NOT_AVAILABLE')
  const courseId = seat.order.courseVersion.courseId
  await lockAcademyCommerce(db, `access:${userId}:${courseId}`)
  const duplicate = await db.learningAcademySeat.findFirst({ where: { userId, status: 'ACTIVE', order: { courseVersion: { courseId } } } })
  commerceAssert(!duplicate, 'ACADEMY_PARTICIPANT_ALREADY_HAS_ACCESS')
  const enrollment = await db.learningEnrollment.upsert({ where: { userId_courseVersionId: { userId, courseVersionId: seat.order.courseVersionId } }, create: { userId, courseVersionId: seat.order.courseVersionId, ...(seat.order.accessPolicyVersion ? { accessActivatedAt: now, accessExpiresAt: addAcademyCalendarYear(now) } : {}) }, update: {} })
  const active = await db.learningAcademySeat.update({ where: { id: seat.id }, data: { status: 'ACTIVE', userId, enrollmentId: enrollment.id, acceptedAt: now, acceptedTermsVersion: termsVersion } })
  if (enrollment.accessRevokedAt) await db.learningEnrollment.update({ where: { id: enrollment.id }, data: { accessRevokedAt: null, accessRevocationReason: null } })
  await db.learningAcademySeatEvent.create({ data: { seatId: seat.id, actorUserId: userId, action: 'ACTIVATED', metadata: { termsVersion, orderId: seat.orderId } } })
  return active
}
export async function revokeAcademyPurchaseEntitlements(db: Db, purchaseId: string, now: Date, seatIds?: string[]) {
  const seats = await db.learningAcademySeat.findMany({ where: { order: { purchaseId }, status: { not: 'REVOKED' }, ...(seatIds ? { id: { in: seatIds } } : {}) } })
  for (const seat of seats) {
    await db.learningAcademySeat.update({ where: { id: seat.id }, data: { status: 'REVOKED', revokedAt: now } })
    if (seat.enrollmentId) {
      await db.learningEnrollment.update({ where: { id: seat.enrollmentId }, data: { accessRevokedAt: now, accessRevocationReason: 'ACADEMY_REFUND' } })
      const participations = await db.learningRetentionParticipation.findMany({ where: { learningEnrollmentId: seat.enrollmentId }, select: { id: true } })
      const reminders = await db.learningAnnualReminder.findMany({ where: { enrollmentId: seat.enrollmentId }, select: { id: true } })
      const contexts = [...participations.map(p => ({ payload: { path: ['participationId'], equals: p.id } })), ...reminders.map(r => ({ payload: { path: ['annualReminderId'], equals: r.id } }))]
      if (contexts.length) await db.notificationOutbox.updateMany({ where: { status: 'PENDING', templateKey: { in: ['LEARNING_RETENTION_WEEK_READY', 'LEARNING_RETENTION_ANNUAL_READY'] }, OR: contexts }, data: { status: 'FAILED', lastErrorCode: 'ACADEMY_ACCESS_REVOKED' } })
    }
  }
  // Learning progress, answers, passes, certificates and opt-in history are never deleted.
}
