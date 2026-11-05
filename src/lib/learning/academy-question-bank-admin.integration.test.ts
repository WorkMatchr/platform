import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, type Prisma } from '@/generated/prisma/client'
import { assertAcademyDatabaseTarget } from './academy-database-policy'
import { academyBanks, parseAdminFilter } from './academy-question-bank-admin-model'
import { buildAcademyReviewPdf } from './academy-question-bank-admin-pdf'

const state = vi.hoisted(() => ({ db: null as unknown }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => state.db }))
vi.mock('@/lib/authorization', () => ({ getCurrentUser: async () => ({ id: 'isolated-review-fixture' }) }))
vi.mock('@/lib/platform-admin/platform-admin-authorization', async (original) => ({ ...await original<object>(), getPlatformOperatorContext: async () => ({ membershipRole: 'OWNER' }) }))
import { listAcademyAdminCourses, readAcademyAdminQuestions } from './academy-question-bank-admin-service'

const enabled = process.env.ACADEMY_ADMIN_RUNTIME === '1'
describe.skipIf(!enabled)('Academy admin genuine PostgreSQL read-only data projection (auth separately unit-tested)', () => {
  let db: PrismaClient
  beforeAll(() => {
    assertAcademyDatabaseTarget({ databaseUrl: process.env.DATABASE_URL, projectId: process.env.ACADEMY_TEST_PROJECT_ID, branchId: process.env.ACADEMY_TEST_BRANCH_ID, nodeEnv: process.env.NODE_ENV })
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
  })
  afterAll(async () => { await db?.$disconnect() })
  async function readOnly(work: (tx: Prisma.TransactionClient) => Promise<void>) {
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
      const identity = await tx.$queryRaw<{ database: string; readonly: string }[]>`SELECT current_database() AS database, current_setting('transaction_read_only') AS readonly`
      expect(identity[0]).toEqual({ database: 'neondb', readonly: 'on' })
      state.db = tx; await work(tx)
    }, { timeout: 60_000 })
  }
  it('projects five banks per course without publishing DRAFT content or accessing student data', async () => {
    await readOnly(async (tx) => {
      expect((await listAcademyAdminCourses()).map((course) => course.code)).toEqual(expect.arrayContaining(['WL-001', 'WL-002']))
      for (const course of ['WL-001', 'WL-002']) for (const bank of Object.keys(academyBanks)) {
        const result = await readAcademyAdminQuestions(parseAdminFilter({ course, bank }))
        expect(result.rows.length).toBeGreaterThan(0)
        expect(result.rows.every((row) => row.courseCode === course && row.bank === bank)).toBe(true)
        expect(Buffer.from(await buildAcademyReviewPdf(result.rows)).subarray(0, 5).toString()).toBe('%PDF-')
        expect(JSON.stringify(result.rows)).not.toMatch(/"(?:email|userId|enrollmentId|attemptId)"\s*:/)
        if (course === 'WL-002') expect(result.rows.every((row) => row.status === 'DRAFT' && row.referenceStatus === 'DRAFT')).toBe(true)
      }
      const draft = await tx.learningQuestion.count({ where: { code: { startsWith: 'WL002-' }, status: 'DRAFT' } })
      expect(draft).toBeGreaterThanOrEqual(240)
      expect(await tx.learningQuestion.count({where:{code:{startsWith:'WL002-'},status:{not:'DRAFT'}}})).toBe(0)
    })
  }, 120_000)
  it('shows historical v1.0 mappings and keys separately from v1.1; no history mutation', async () => {
    await readOnly(async (tx) => {
      const before = await tx.learningExamAttempt.findMany({ select: { id: true, examVersionId: true, score: true, submittedAt: true }, orderBy: { id: 'asc' } })
      const historical = await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-001', version: 'WL-001-EXAM-1.0', q: 'E17' }))
      const current = await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-001', version: 'WL-001-EXAM-1.1', q: 'E17' }))
      expect(historical.rows).toHaveLength(1); expect(current.rows).toHaveLength(1)
      expect(historical.rows[0].referenceStatus).toBe('RETIRED')
      for (const row of [...historical.rows, ...current.rows]) expect(row.options.filter((option) => option.isCorrect).map((option) => option.value).sort()).toEqual([...(row.correctAnswer as string[])].sort())
      expect(await tx.learningExamAttempt.findMany({ select: { id: true, examVersionId: true, score: true, submittedAt: true }, orderBy: { id: 'asc' } })).toEqual(before)
    })
  }, 120_000)
})
