import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { assertAcademyDatabaseTarget } from '../src/lib/learning/academy-database-policy'

const database = process.argv.includes('--upgrade') ? 'academy_upgrade' : 'neondb'
assertAcademyDatabaseTarget({ databaseUrl: process.env.DATABASE_URL, projectId: process.env.ACADEMY_TEST_PROJECT_ID, branchId: process.env.ACADEMY_TEST_BRANCH_ID, nodeEnv: process.env.NODE_ENV, vercelEnv: process.env.VERCEL_ENV }, database)
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
try {
  // Read-only even if accidentally extended with a write during later maintenance.
  const report = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`
    const identity = await tx.$queryRaw<Array<{ database: string; version: string }>>`SELECT current_database() AS database, current_setting('server_version') AS version`
    if (identity[0].database !== database || !identity[0].version.startsWith('17.')) throw new Error('ACADEMY_DATABASE_IDENTITY_MISMATCH')
    const applied = await tx.$queryRaw<Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>>`SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name`
    const names = (await readdir('prisma/migrations', { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
    const mismatches: string[] = []
    for (const name of names) {
      const row = applied.find((migration) => migration.migration_name === name && migration.finished_at && !migration.rolled_back_at)
      if (row && row.checksum !== createHash('sha256').update(await readFile(`prisma/migrations/${name}/migration.sql`)).digest('hex')) mismatches.push(name)
    }
    const pending = names.filter((name) => !applied.some((migration) => migration.migration_name === name && migration.finished_at && !migration.rolled_back_at))
    const protection = await tx.$queryRaw<Array<{ exam_questions: number; erroneously_editable: number }>>`
      SELECT count(*)::int AS exam_questions, count(*) FILTER (WHERE learning_question_is_editable(q.id))::int AS erroneously_editable
      FROM "LearningQuestion" q WHERE EXISTS (SELECT 1 FROM "LearningExamQuestion" m JOIN "LearningExamVersion" v ON v.id=m."examVersionId" WHERE m."questionId"=q.id AND v.status IN ('PUBLISHED','RETIRED'))`
    const courses = await tx.learningCourse.findMany({ orderBy: { code: 'asc' }, select: { code: true, status: true, _count: { select: { versions: true } } } })
    const auth = { accounts: await tx.account.count(), sessions: await tx.session.count() }
    const wl002 = { questions: await tx.learningQuestion.count({ where: { code: { startsWith: 'WL002-' } } }), publishedQuestions: await tx.learningQuestion.count({ where: { code: { startsWith: 'WL002-' }, status: { not: 'DRAFT' } } }), publishedRetention: await tx.learningRetentionQuestion.count({ where: { bankVersion: 'WL-002-RETENTION-1.0', status: 'PUBLISHED' } }) }
    return { identity: identity[0], migrations: { repository: names.length, applied: applied.filter((row) => row.finished_at && !row.rolled_back_at).length, pending, failed: applied.filter((row) => !row.finished_at && !row.rolled_back_at).map((row) => row.migration_name), checksumMismatches: mismatches }, protection: protection[0], courses, wl002, auth }
  }, { timeout: 30_000 })
  console.info(JSON.stringify(report, null, 2))
  if (report.migrations.pending.length || report.migrations.failed.length || report.migrations.checksumMismatches.length || report.protection.erroneously_editable || report.wl002.publishedQuestions) process.exitCode = 1
} finally { await db.$disconnect() }
