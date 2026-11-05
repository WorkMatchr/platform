import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { assertAcademyDatabaseTarget, WL003_ACCEPTANCE_DATABASE } from './academy-database-policy'
import { parseAdminFilter } from './academy-question-bank-admin-model'

const state = vi.hoisted(() => ({ db: null as unknown }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => state.db }))
// Read-model acceptance only. Real operator authentication is tested separately.
vi.mock('@/lib/authorization', () => ({ getCurrentUser: async () => ({ id: 'isolated-review-fixture' }) }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', async original => ({ ...await original<object>(), getPlatformOperatorContext: async () => ({ membershipRole: 'OWNER' }) }))
import { listAcademyAdminCourses, readAcademyAdminQuestions } from './academy-question-bank-admin-service'
import { getPublishedLearningCourse, getMyLearningEnrollments } from './learning-query-service'

const rcEnabled = process.env.ACADEMY_RC_RUNTIME === '1'
const enabled = process.env.WL003_INTEGRATION_RUNTIME === '1' || rcEnabled
describe.skipIf(!enabled)('WL-003 private admin projection and DRAFT student boundary against PostgreSQL', () => {
  let db: PrismaClient
  beforeAll(() => {
    expect(rcEnabled ? ['branch-fixture-long-wind','branch-fixture-blue-morning'] : [WL003_ACCEPTANCE_DATABASE.branchId]).toContain(process.env.ACADEMY_TEST_BRANCH_ID)
    assertAcademyDatabaseTarget({ databaseUrl: process.env.DATABASE_URL, projectId: process.env.ACADEMY_TEST_PROJECT_ID, branchId: process.env.ACADEMY_TEST_BRANCH_ID, nodeEnv: process.env.NODE_ENV, vercelEnv: process.env.VERCEL_ENV })
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
  })
  afterAll(async () => { await db?.$disconnect() })

  it('shows all five banks, exact keys and feedback without publication or student data', async () => {
    await db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`
      state.db = tx
      expect((await listAcademyAdminCourses()).map(course => course.code)).toContain('WL-003')
      for (const [bank, count] of [['FORMATIVE', 60], ['CHAPTER_CHECK', 30], ['EXAM', 50], ['RETENTION', 100], ['ANNUAL', 100]] as const) {
        const result = await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-003', bank }))
        expect(result.rows).toHaveLength(count)
        for (const row of result.rows) {
          expect(row.status).toBe('DRAFT'); expect(row.referenceStatus).toBe('DRAFT')
          expect(row.questionVersion).toBe(1)
          expect(row.options.filter(option => option.isCorrect).map(option => option.value).sort()).toEqual([...(row.correctAnswer as string[])].sort())
          expect(row.explanation.length).toBeGreaterThan(20)
        }
        expect(JSON.stringify(result.rows)).not.toMatch(/"(?:email|userId|enrollmentId|attemptId)"\s*:/)
      }
    }, { timeout: 120_000 })
  }, 150_000)

  it('denies DRAFT student access and retains historical WL-001 exam version projections', async () => {
    await db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`; state.db = tx
      const course = await tx.learningCourse.findUniqueOrThrow({ where: { code: 'WL-003' } })
      expect(course.status).toBe('DRAFT')
      const user = randomUUID()
      expect(await getPublishedLearningCourse(course.slug, user)).toBeNull()
      expect(await getMyLearningEnrollments(user)).toEqual([])
      for (const version of ['WL-001-EXAM-1.0', 'WL-001-EXAM-1.1']) {
        const historical = await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-001', version, q: 'E17' }))
        expect(historical.rows).toHaveLength(1)
        expect(historical.rows[0].referenceVersion).toBe(version)
      }
    }, { timeout: 120_000 })
  }, 150_000)
})
