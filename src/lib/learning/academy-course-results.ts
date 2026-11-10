import 'server-only'
import { currentAcademyAccess } from './academy-access-policy'
import { pilotDistribution } from './academy-pilot-time'
import { notFound } from 'next/navigation'
import { getPrisma } from '@/lib/prisma'
import { requirePlatformOperator } from '@/lib/platform-admin/platform-admin-authorization'
import { isLearningRuntimeEnabled } from './learning-runtime-policy'

const coursesPath = '/platformbeheer/academy/cursussen'

async function requireAcademyOperator() {
  if (!isLearningRuntimeEnabled()) notFound()
  return requirePlatformOperator(coursesPath)
}

// Same version identity and operator boundary as the Academy authoring service.
export async function readAcademyCourseIndex() {
  await requireAcademyOperator()
  return getPrisma().learningCourse.findMany({
    select: {
      id: true,
      title: true,
      code: true,
      versions: {
        select: { id: true, version: true, status: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { code: 'asc' },
  })
}

export async function readAcademyCourseResults(versionId: string, page: number) {
  await requireAcademyOperator()
  if (
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(versionId) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 100000
  )
    notFound()
  const version = await getPrisma().learningCourseVersion.findUnique({
    where: { id: versionId },
    select: {
      version: true,
      status: true,
      sourceMetadata: true,
      course: { select: { code: true, title: true } },
      chapters: { select: { id: true, title: true }, orderBy: { position: 'asc' } },
      _count: { select: { enrollments: true } },
      enrollments: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * 25,
        take: 25,
        select: {
          id: true,
          user: { select: { displayName: true } },
          progress: { select: { chapterId: true, progressPercentage: true } },
          examAttempts: {
            where: { submittedAt: { not: null } },
            orderBy: { attemptNumber: 'asc' },
            select: { attemptNumber: true, score: true, maxScore: true, passed: true },
          },
          certificates: {
            select: { certificateNumber: true, status: true, firstName: true, lastName: true },
          },
        },
      },
    },
  })
  if (!version) notFound()
  return version
}

/** Version-level totals only. Financial amounts come from issued invoice snapshots, including credit notes. */
export async function readCourseReport(versionId: string) {
  await requireAcademyOperator()
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(versionId)) notFound()
  const db = getPrisma()
  const version = await db.learningCourseVersion.findUnique({
    where: { id: versionId },
    select: { id: true, _count: { select: { chapters: true } } },
  })
  if (!version) notFound()
  const versionFilter = { courseVersionId: versionId }
  const purchase = {
    kind: 'ACADEMY_COURSE' as const,
    discountCodeSnapshot: { path: ['versionId'], equals: versionId },
  }
  const [enrolled, active, finished, passed, first, retries, dropped, certificates, money, observations] =
    await db.$transaction(
      [
        db.learningEnrollment.count({ where: versionFilter }),
        db.learningEnrollment.count({
          where: { ...versionFilter, status: 'IN_PROGRESS', ...currentAcademyAccess() },
        }),
        db.learningEnrollment.count({ where: { ...versionFilter, status: 'COMPLETED' } }),
        db.learningEnrollment.count({
          where: { ...versionFilter, examAttempts: { some: { passed: true, status: 'SUBMITTED' } } },
        }),
        db.learningExamAttempt.count({ where: { ...versionFilter, attemptNumber: 1, status: 'SUBMITTED' } }),
        db.learningExamAttempt.count({
          where: { ...versionFilter, attemptNumber: { gt: 1 }, status: 'SUBMITTED' },
        }),
        db.learningEnrollment.count({
          where: { ...versionFilter, accessRevokedAt: { not: null }, completedAt: null },
        }),
        db.learningCertificate.count({ where: { enrollment: versionFilter } }),
        db.financialInvoice.aggregate({
          where: { currency: 'EUR', OR: [{ purchase }, { originalInvoice: { purchase } }] },
          _sum: { amountExclVatCents: true, discountCodeDiscountCents: true },
        }),
        db.learningPilotAssignment.findMany({
          where: versionFilter,
          select: {
            gaps: true,
            enrollment: { select: { completedAt: true } },
            durations: { select: { context: true, activeMs: true } },
          },
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    )
  const complete: number[] = []
  for (const observation of observations) {
    if (!observation.enrollment?.completedAt || observation.gaps) continue
    const times = new Map(observation.durations.map((d) => [d.context, d.activeMs]))
    const required = [
      'exam:1',
      ...Array.from({ length: version._count.chapters }, (_, i) => [
        'les:' + (i + 1),
        'oefening:' + (i + 1),
      ]).flat(),
    ]
    if (required.every((key) => (times.get(key) ?? 0) > 0))
      complete.push(required.reduce((sum, key) => sum + times.get(key)!, 0))
  }
  const stats = pilotDistribution(complete)
  return [
    ['Inschrijvingen', enrolled],
    ['Actieve cursisten', active],
    ['Afgerond', finished],
    ['Geslaagd', passed],
    ['Ingeleverde eerste toetsen', first],
    ['Ingeleverde herkansingen', retries],
    ['Toegang ingetrokken vóór afronding', dropped],
    ['Uitgegeven certificaten', certificates],
    ['Volledige tijdmetingen', complete.length],
    ['Inschrijvingen zonder volledige tijdmeting', enrolled - complete.length],
    ['Gemiddelde gemeten minuten', stats ? Math.round(stats.mean / 60000) : 'Geen volledige meting'],
    ['Mediane gemeten minuten', stats ? Math.round(stats.median / 60000) : 'Geen volledige meting'],
    ['Gefactureerde omzet excl. btw (eurocent)', money._sum.amountExclVatCents ?? 0],
    ['Geboekte codekorting (eurocent)', money._sum.discountCodeDiscountCents ?? 0],
  ] as const
}
