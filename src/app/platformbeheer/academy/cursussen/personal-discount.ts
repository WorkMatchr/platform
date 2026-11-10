'use server'

import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { getPrisma } from '@/lib/prisma'
import { authoringMetadata, requireAuthor } from '@/lib/learning/academy-authoring-service'

const input = z.object({
  versionId: z.uuid(),
  email: z.email().max(254),
  percentage: z.coerce.number().int().min(1).max(100),
  until: z.iso.date(),
})

export async function preparePersonalDiscount(_: string, form: FormData) {
  const actor = await requireAuthor()
  const data = input.safeParse(Object.fromEntries(form))
  if (!data.success) return 'Controleer het e-mailadres, de korting en de vervaldatum.'
  const { versionId, email, percentage, until } = data.data
  const validUntil = new Date(until + 'T00:00:00.000Z')
  if (validUntil <= new Date()) return 'Kies een toekomstige vervaldatum.'
  try {
    const code = await getPrisma().$transaction(async (tx) => {
      const version = await tx.learningCourseVersion.findUniqueOrThrow({
        where: { id: versionId },
        include: { course: true },
      })
      const content = authoringMetadata(version.sourceMetadata).authoring.content
      if (
        !('management' in content) ||
        !content.management ||
        version.status === 'RETIRED' ||
        ['WL-001', 'WL-002', 'WL-003'].includes(version.course.code)
      )
        throw Error('UNAVAILABLE')
      const user = await tx.user.findFirstOrThrow({
        where: { email: email.toLowerCase(), status: 'ACTIVE', emailVerified: true },
        select: { id: true },
      })
      const coupon = await tx.discountCode.create({
        data: {
          code: 'OPLEIDING-' + randomBytes(10).toString('hex').toUpperCase(),
          status: 'BLOCKED',
          percentageBps: percentage * 100,
          maximumUses: 1,
          validFrom: new Date(),
          validUntil,
          applicablePackageSkus: ['ACADEMY_' + versionId],
          createdByUserId: actor.userId,
        },
      })
      await tx.learningPilotAssignment.create({
        data: { userId: user.id, courseVersionId: versionId, discountCodeId: coupon.id },
      })
      await tx.marketplaceAuditEvent.create({
        data: {
          actorUserId: actor.userId,
          actorRole: 'PLATFORM_ADMIN',
          action: 'ACADEMY_PERSONAL_DISCOUNT_PREPARED',
          entityType: 'LearningCourseVersion',
          entityId: versionId,
          metadata: { discountCodeId: coupon.id, percentage, maximumUses: 1, until },
        },
      })
      return coupon.code
    })
    return 'Persoonlijke code voorbereid: ' + code + '. De code blijft geblokkeerd voor verkoop.'
  } catch {
    return 'Controleer het geverifieerde account, de cursusversie en of er al een persoonlijke code bestaat.'
  }
}
