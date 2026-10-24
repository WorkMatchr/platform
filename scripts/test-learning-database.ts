import assert from 'node:assert/strict'
import { createHash, randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'
import {
  learningChapter3Blocks,
  learningChapter3Questions,
  learningChapterBlocks,
  learningQuestions,
} from '../src/lib/learning/learning-prototype-content'

import { learningChapter2Blocks, learningChapter2Questions } from '../src/lib/learning/learning-chapter2-content'

import { learningChapter4Blocks, learningChapter4Questions } from '../src/lib/learning/learning-chapter4-content'
import { learningChapter5Blocks, learningChapter5Questions } from '../src/lib/learning/learning-chapter5-content'
import { learningChapter6Blocks, learningChapter6Questions } from '../src/lib/learning/learning-chapter6-content'
import { learningChapter7Blocks, learningChapter7Questions } from '../src/lib/learning/learning-chapter7-content'
import { learningChapter8Blocks, learningChapter8Questions } from '../src/lib/learning/learning-chapter8-content'
import { learningChapter9Blocks, learningChapter9Questions } from '../src/lib/learning/learning-chapter9-content'
import { learningChapter10Blocks, learningChapter10Questions } from '../src/lib/learning/learning-chapter10-content'
import { parseFinalExamQuestionBank } from '../src/lib/learning/learning-final-exam-content'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const allQuestions = [...learningQuestions, ...learningChapter2Questions, ...learningChapter3Questions, ...learningChapter4Questions, ...learningChapter5Questions, ...learningChapter6Questions, ...learningChapter7Questions, ...learningChapter8Questions, ...learningChapter9Questions, ...learningChapter10Questions]
const allBlockCount = learningChapterBlocks.length + learningChapter2Blocks.length + learningChapter3Blocks.length + learningChapter4Blocks.length + learningChapter5Blocks.length + learningChapter6Blocks.length + learningChapter7Blocks.length + learningChapter8Blocks.length + learningChapter9Blocks.length + learningChapter10Blocks.length
const allOptionCount = allQuestions.reduce((total, question) => total + question.options.length, 0)
const examBank = parseFinalExamQuestionBank(readFileSync('prisma/seed-data/WL-001_FINAL_EXAM_v1.0_CANONICAL_QUESTION_BANK.md', 'utf8'))
const examOptionCount = examBank.reduce((total, question) => total + question.options.length, 0)
const examBankV11 = parseFinalExamQuestionBank(readFileSync('prisma/seed-data/WL-001_FINAL_EXAM_v1.1_CANONICAL_QUESTION_BANK.md', 'utf8'))
const changedExamCodesV11 = new Set(examBankV11.filter((question, index) => JSON.stringify(question) !== JSON.stringify(examBank[index])).map((question) => question.code))
const examV11NewQuestionOptionCount = examBankV11.filter((question) => changedExamCodesV11.has(question.code)).reduce((total, question) => total + question.options.length, 0)

const sourceUrl = process.env.DATABASE_URL
if (!sourceUrl) throw new Error('DATABASE_URL is required')
const source = new URL(sourceUrl)
if (!['localhost', '127.0.0.1'].includes(source.hostname)) throw new Error('Local PostgreSQL is required')

const databaseName = `workmatchr_learning_${process.pid}_${Date.now()}`
const target = new URL(source)
target.pathname = `/${databaseName}`
const adminUrl = new URL(source)
adminUrl.pathname = '/postgres'
const admin = new Client({ connectionString: adminUrl.toString() })
const prismaCli = 'node_modules/prisma/build/index.js'
const tsxCli = 'node_modules/tsx/dist/cli.mjs'

function run(args: string[], label: string, extraEnv: Record<string, string> = {}) {
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    env: { ...process.env, DATABASE_URL: target.toString(), LEARNING_TEST_DATABASE_URL: target.toString(), LEARNING_RUNTIME_ENABLED: 'true', ...extraEnv },
  })
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.replaceAll(target.toString(), '[TEMP_DATABASE]')
  assert.equal(result.status, 0, `${label} failed:\n${output}`)
  return output
}

async function main() {
  await admin.connect()
  await admin.query(`CREATE DATABASE "${databaseName}"`)
  const db = new Client({ connectionString: target.toString() })
  let allChecksPassed = false
  try {
    run([prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts'], 'Fresh canonical migration chain')
    const status = run([prismaCli, 'migrate', 'status', '--config', 'prisma.config.ts'], 'Fresh migration status')
    assert.match(status, /Database schema is up to date/)
    const diffResult = spawnSync(process.execPath, [
      prismaCli, 'migrate', 'diff', '--from-config-datasource', '--to-schema', 'prisma/schema.prisma', '--exit-code', '--config', 'prisma.config.ts',
    ], { encoding: 'utf8', env: { ...process.env, DATABASE_URL: target.toString() } })
    const diff = `${diffResult.stdout ?? ''}${diffResult.stderr ?? ''}`.replaceAll(target.toString(), '[TEMP_DATABASE]')
    assert.ok([0, 2].includes(diffResult.status ?? -1), `Fresh database/schema diff errored:\n${diff}`)
    // The canonical migration history predates the current Prisma schema and has unrelated catalog drift.
    // This preflight scopes its strict check to the new slice so it does not mask baseline discrepancies.
    assert.doesNotMatch(diff, /\bLearning(?:Profile|Course|CourseVersion|Chapter|Question|ContentBlock|QuestionOption|Enrollment|ChapterProgress|QuestionAttempt|InteractionAttempt|Exam|ExamVersion|ExamQuestion|ExamAttempt|ExamAnswer|Certificate)\b/, `Learning catalog differs from Prisma schema:\n${diff}`)

    run([tsxCli, 'scripts/seed-learning.ts'], 'First Learning seed')
    run([tsxCli, 'scripts/seed-learning.ts'], 'Idempotent Learning seed replay')
    run([tsxCli, 'scripts/seed-learning-final-exam.ts'], 'First canonical final exam seed')
    run([tsxCli, 'scripts/seed-learning-final-exam.ts'], 'Idempotent canonical final exam seed replay')
    await db.connect()

    const counts = await db.query<{ courses: number; versions: number; chapters: number; chapter2: number; chapter3: number; chapter3Checks: number; chapter9: number; chapter10: number; chapter9Checks: number; questions: number; options: number; blocks: number; published: number }>(`
      SELECT
        (SELECT count(*)::int FROM "LearningCourse" WHERE code='WL-001') AS courses,
        (SELECT count(*)::int FROM "LearningCourseVersion" v JOIN "LearningCourse" c ON c.id=v."courseId" WHERE c.code='WL-001' AND v.version='prototype-0.17') AS versions,
        (SELECT count(*)::int FROM "LearningChapter" chapter JOIN "LearningCourseVersion" v ON v.id=chapter."courseVersionId" JOIN "LearningCourse" c ON c.id=v."courseId" WHERE c.code='WL-001' AND v.version='prototype-0.17' AND chapter.slug IN ('waarom-een-rie','wie-doet-wat','risicos-inventariseren','risicos-beoordelen','maatregelen-bepalen','plan-van-aanpak','toetsing-rie','rie-actueel-houden','van-papier-naar-praktijk','integrale-praktijkcasus')) AS chapters,
        (SELECT count(*)::int FROM "LearningChapter" chapter JOIN "LearningCourseVersion" v ON v.id=chapter."courseVersionId" JOIN "LearningCourse" c ON c.id=v."courseId" WHERE c.code='WL-001' AND v.version='prototype-0.17' AND chapter.position=2 AND chapter.slug='wie-doet-wat') AS chapter2,
        (SELECT count(*)::int FROM "LearningChapter" chapter JOIN "LearningCourseVersion" v ON v.id=chapter."courseVersionId" JOIN "LearningCourse" c ON c.id=v."courseId" WHERE c.code='WL-001' AND v.version='prototype-0.17' AND chapter.slug='risicos-inventariseren' AND chapter.position=3) AS chapter3,
        (SELECT count(*)::int FROM "LearningContentBlock" block JOIN "LearningChapter" chapter ON chapter.id=block."chapterId" JOIN "LearningCourseVersion" v ON v.id=chapter."courseVersionId" WHERE v.version='prototype-0.17' AND chapter.slug='risicos-inventariseren' AND block."questionId" IN (SELECT id FROM "LearningQuestion" WHERE code LIKE 'WL001-H3-CHECK-%')) AS "chapter3Checks",
        (SELECT count(*)::int FROM "LearningChapter" WHERE "courseVersionId"=(SELECT id FROM "LearningCourseVersion" WHERE version='prototype-0.17') AND slug='van-papier-naar-praktijk' AND position=9) AS chapter9,
        (SELECT count(*)::int FROM "LearningChapter" WHERE "courseVersionId"=(SELECT id FROM "LearningCourseVersion" WHERE version='prototype-0.17') AND slug='integrale-praktijkcasus' AND position=10) AS chapter10,
        (SELECT count(*)::int FROM "LearningContentBlock" b JOIN "LearningChapter" c ON c.id=b."chapterId" JOIN "LearningQuestion" q ON q.id=b."questionId" WHERE c.slug='van-papier-naar-praktijk' AND q.code LIKE 'WL001-H9-CHECK-%') AS "chapter9Checks",
        (SELECT count(*)::int FROM "LearningQuestion") AS questions,
        (SELECT count(*)::int FROM "LearningQuestionOption") AS options,
        (SELECT count(*)::int FROM "LearningContentBlock") AS blocks,
        (SELECT count(*)::int FROM "LearningCourseVersion" WHERE status='PUBLISHED') AS published`)
    assert.deepEqual(counts.rows[0], {
      courses: 1,
      versions: 1,
      chapters: 10,
      chapter2: 1,
      chapter3: 1,
      chapter3Checks: 5,
      chapter9: 1,
      chapter10: 1,
      chapter9Checks: 5,
      questions: allQuestions.length + examBank.length,
      options: allOptionCount + examOptionCount,
      blocks: allBlockCount,
      published: 1,
    })

    const examCounts = await db.query(`
      SELECT
        (SELECT count(*)::int FROM "LearningExam" WHERE code='WL-001-FINAL') AS exams,
        (SELECT count(*)::int FROM "LearningExamVersion" v JOIN "LearningExam" e ON e.id=v."examId" WHERE e.code='WL-001-FINAL' AND v.version='WL-001-EXAM-1.0' AND v.status='PUBLISHED' AND v."courseVersionId"=(SELECT id FROM "LearningCourseVersion" WHERE version='prototype-0.17')) AS versions,
        (SELECT count(*)::int FROM "LearningExamQuestion" q JOIN "LearningExamVersion" v ON v.id=q."examVersionId" WHERE v.version='WL-001-EXAM-1.0') AS questions,
        (SELECT count(DISTINCT q.code)::int FROM "LearningExamQuestion" q JOIN "LearningExamVersion" v ON v.id=q."examVersionId" WHERE v.version='WL-001-EXAM-1.0') AS codes,
        (SELECT count(*)::int FROM "LearningQuestionOption" o JOIN "LearningQuestion" q ON q.id=o."questionId" JOIN "LearningExamQuestion" eq ON eq."questionId"=q.id JOIN "LearningExamVersion" v ON v.id=eq."examVersionId" WHERE v.version='WL-001-EXAM-1.0') AS options,
        (SELECT min(q.position)::int FROM "LearningExamQuestion" q JOIN "LearningExamVersion" v ON v.id=q."examVersionId" WHERE v.version='WL-001-EXAM-1.0') AS first_position,
        (SELECT max(q.position)::int FROM "LearningExamQuestion" q JOIN "LearningExamVersion" v ON v.id=q."examVersionId" WHERE v.version='WL-001-EXAM-1.0') AS last_position,
        (SELECT count(*)::int FROM "LearningExamVersion" WHERE "questionCount"=50 AND "maxScore"=50 AND "passingScore"=40 AND "passingPercentage"=80 AND "timeLimitMinutes" IS NULL AND "attemptLimit" IS NULL AND status='PUBLISHED') AS config`)
    assert.deepEqual(examCounts.rows[0], { exams: 1, versions: 1, questions: 50, codes: 50, options: examOptionCount, first_position: 1, last_position: 50, config: 1 })
    const examDistribution = await db.query(`SELECT eq."chapterNumber", count(*)::int AS count FROM "LearningExamQuestion" eq JOIN "LearningExamVersion" ev ON ev.id=eq."examVersionId" WHERE ev.version='WL-001-EXAM-1.0' GROUP BY eq."chapterNumber" ORDER BY eq."chapterNumber"`)
    assert.deepEqual(examDistribution.rows.map((row) => row.count), [3, 4, 5, 6, 6, 5, 5, 4, 4, 8])

    const catalog = await db.query<{ foreign_keys: number; indexes: number; triggers: number; migration_count: number; exam_tables: number; exam_triggers: number; certificate_tables: number; certificate_triggers: number; profile_name_fields: number }>(`
      SELECT
        (SELECT count(*)::int FROM pg_constraint WHERE contype='f' AND conrelid::regclass::text LIKE '"Learning%') AS foreign_keys,
        (SELECT count(*)::int FROM pg_indexes WHERE schemaname=current_schema() AND tablename LIKE 'Learning%') AS indexes,
        (SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal AND tgrelid::regclass::text LIKE '"Learning%') AS triggers,
        (SELECT count(*)::int FROM pg_tables WHERE schemaname=current_schema() AND tablename IN ('LearningExam','LearningExamVersion','LearningExamQuestion','LearningExamAttempt','LearningExamAnswer')) AS exam_tables,
        (SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal AND tgrelid::regclass::text IN ('"LearningExamVersion"','"LearningExamQuestion"','"LearningExamAttempt"','"LearningExamAnswer"')) AS exam_triggers,
        (SELECT count(*)::int FROM pg_tables WHERE schemaname=current_schema() AND tablename='LearningCertificate') AS certificate_tables,
        (SELECT count(*)::int FROM pg_trigger WHERE NOT tgisinternal AND tgrelid='"LearningCertificate"'::regclass AND tgname LIKE 'LearningCertificate_%') AS certificate_triggers,
        (SELECT count(*)::int FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='LearningProfile' AND column_name IN ('firstName','lastName')) AS profile_name_fields,
        (SELECT count(*)::int FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migration_count`)
    assert.ok((catalog.rows[0]?.foreign_keys ?? 0) >= 16, 'Learning foreign keys are incomplete')
    assert.ok((catalog.rows[0]?.indexes ?? 0) >= 30, 'Learning indexes are incomplete')
    assert.ok((catalog.rows[0]?.triggers ?? 0) >= 6, 'Published-content protection triggers are incomplete')
    assert.equal(catalog.rows[0]?.exam_tables, 5, 'Final exam tables are incomplete')
    assert.equal(catalog.rows[0]?.exam_triggers, 4, 'Final exam immutability and answer guards are incomplete')
    assert.equal(catalog.rows[0]?.certificate_tables, 1, 'Certificate table is incomplete')
    assert.equal(catalog.rows[0]?.certificate_triggers, 3, 'Certificate validation, immutable and no-delete triggers are incomplete')
    assert.equal(catalog.rows[0]?.profile_name_fields, 2, 'Certificate name fields are incomplete')
    const migrationNames = readdirSync('prisma/migrations')
      .filter((name) => existsSync(`prisma/migrations/${name}/migration.sql`)).sort()
    const migrationRows = (await db.query<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>(
      'SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name',
    )).rows
    assert.equal(catalog.rows[0]?.migration_count, migrationNames.length, 'Expected the complete canonical migration chain')
    assert.deepEqual(migrationRows.map((row) => row.migration_name), migrationNames)
    for (const row of migrationRows) {
      assert.ok(row.finished_at && !row.rolled_back_at)
      assert.equal(row.checksum, createHash('sha256').update(readFileSync(`prisma/migrations/${row.migration_name}/migration.sql`)).digest('hex'))
    }
    run([prismaCli, 'migrate', 'deploy', '--config', 'prisma.config.ts'], 'Idempotent migration replay')
    assert.deepEqual((await db.query('SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows, migrationRows)

    const users = [randomUUID(), randomUUID()]
    for (const [index, id] of users.entries()) {
      await db.query(`INSERT INTO "User" (id,email,"displayName",status,"updatedAt") VALUES ($1,$2,$3,'ACTIVE',NOW())`, [
        id,
        `learning-test-${process.pid}-${index}@example.invalid`,
        `Learning test ${index + 1}`,
      ])
    }
    const version = (await db.query(`SELECT id FROM "LearningCourseVersion" WHERE version='prototype-0.17'`)).rows[0].id as string
    const publishedBlock = (await db.query(`
      SELECT chapter.id AS "chapterId", question.id AS "questionId"
      FROM "LearningContentBlock" block
      JOIN "LearningChapter" chapter ON chapter.id=block."chapterId"
      JOIN "LearningQuestion" question ON question.id=block."questionId"
      WHERE chapter."courseVersionId"=$1
      ORDER BY question.code
      LIMIT 1`, [version])).rows[0] as { chapterId: string; questionId: string }
    const chapter = publishedBlock.chapterId
    const question = publishedBlock.questionId
    const option = (await db.query('SELECT value FROM "LearningQuestionOption" WHERE "questionId"=$1 ORDER BY position LIMIT 1', [question])).rows[0].value as string
    const enrollments: string[] = []
    for (const userId of users) {
      const enrollment = await db.query(`
        INSERT INTO "LearningEnrollment" ("userId","courseVersionId",status,"startedAt","updatedAt")
        VALUES ($1,$2,'IN_PROGRESS',NOW(),NOW()) RETURNING id`, [userId, version])
      enrollments.push(enrollment.rows[0].id as string)
    }
    await db.query(`
      INSERT INTO "LearningChapterProgress" ("enrollmentId","courseVersionId","chapterId",status,"startedAt")
      VALUES ($1,$2,$3,'IN_PROGRESS',NOW())`, [enrollments[0], version, chapter])
    await db.query(`
      INSERT INTO "LearningQuestionAttempt" ("enrollmentId","userId","questionId","chapterId","attemptNumber",answer,correct)
      VALUES ($1,$2,$3,$4,1,$5::jsonb,false)`, [enrollments[0], users[0], question, chapter, JSON.stringify(option)])
    await assert.rejects(db.query(`
      INSERT INTO "LearningQuestionAttempt" ("enrollmentId","userId","questionId","chapterId","attemptNumber",answer,correct)
      VALUES ($1,$2,$3,$4,1,$5::jsonb,false)`, [enrollments[0], users[0], question, chapter, JSON.stringify(option)]),
    (error: { code?: string }) => error.code === '23505', 'duplicate attempt should violate unique constraint')
    await assert.rejects(db.query(`
      INSERT INTO "LearningQuestionAttempt" ("enrollmentId","userId","questionId","chapterId","attemptNumber",answer,correct)
      VALUES ($1,$2,$3,$4,2,$5::jsonb,false)`, [enrollments[0], users[1], question, chapter, JSON.stringify(option)]),
    (error: { code?: string }) => error.code === '23503', 'cross-user attempt should violate foreign key')
    await assert.rejects(db.query(`UPDATE "LearningQuestion" SET explanation='changed' WHERE id=$1`, [question]), /Questions used in a published or retired course version are immutable/)

    const progressBeforeReplay = await db.query('SELECT * FROM "LearningChapterProgress" ORDER BY id')
    const attemptsBeforeReplay = await db.query('SELECT * FROM "LearningQuestionAttempt" ORDER BY id')
    run([tsxCli, 'scripts/seed-learning.ts'], 'Seed replay preserves learner activity')
    run([tsxCli, 'scripts/seed-learning-final-exam.ts'], 'Final exam replay preserves learner activity')
    assert.deepEqual((await db.query('SELECT * FROM "LearningChapterProgress" ORDER BY id')).rows, progressBeforeReplay.rows)
    assert.deepEqual((await db.query('SELECT * FROM "LearningQuestionAttempt" ORDER BY id')).rows, attemptsBeforeReplay.rows)

    const chapterOrder = await db.query('SELECT slug, position FROM "LearningChapter" WHERE "courseVersionId"=$1 ORDER BY position', [version])
    assert.deepEqual(chapterOrder.rows, [
      { slug: 'waarom-een-rie', position: 1 },
      { slug: 'wie-doet-wat', position: 2 },
      { slug: 'risicos-inventariseren', position: 3 },
      { slug: 'risicos-beoordelen', position: 4 },
      { slug: 'maatregelen-bepalen', position: 5 },
      { slug: 'plan-van-aanpak', position: 6 },
      { slug: 'toetsing-rie', position: 7 },
      { slug: 'rie-actueel-houden', position: 8 },
      { slug: 'van-papier-naar-praktijk', position: 9 },
      { slug: 'integrale-praktijkcasus', position: 10 },
    ])
    const h2Checks = await db.query(`SELECT count(*)::int AS count FROM "LearningContentBlock" b JOIN "LearningChapter" c ON c.id=b."chapterId" JOIN "LearningQuestion" q ON q.id=b."questionId" WHERE c."courseVersionId"=$1 AND c.slug='wie-doet-wat' AND q.code LIKE 'WL001-H2-CHECK-%'`, [version])
    assert.equal(h2Checks.rows[0].count, 5)
    const h4Checks = await db.query("SELECT count(*)::int AS count FROM \"LearningContentBlock\" b JOIN \"LearningChapter\" c ON c.id=b.\"chapterId\" JOIN \"LearningQuestion\" q ON q.id=b.\"questionId\" WHERE c.slug='risicos-beoordelen' AND q.code LIKE 'WL001-H4-CHECK-%'")
    assert.equal(h4Checks.rows[0].count, 5)
    const h5Checks = await db.query(`SELECT count(*)::int AS count FROM "LearningContentBlock" b JOIN "LearningChapter" c ON c.id=b."chapterId" JOIN "LearningQuestion" q ON q.id=b."questionId" WHERE c."courseVersionId"=$1 AND c.slug='maatregelen-bepalen' AND q.code LIKE 'WL001-H5-CHECK-%'`, [version])
    assert.equal(h5Checks.rows[0].count, 5)
    const h6Checks = await db.query(`SELECT count(*)::int AS count FROM "LearningContentBlock" b JOIN "LearningChapter" c ON c.id=b."chapterId" JOIN "LearningQuestion" q ON q.id=b."questionId" WHERE c."courseVersionId"=$1 AND c.slug='plan-van-aanpak' AND q.code LIKE 'WL001-H6-CHECK-%'`, [version])
    assert.equal(h6Checks.rows[0].count, 5)
    const h7Checks = await db.query(`SELECT count(*)::int AS count FROM "LearningContentBlock" b JOIN "LearningChapter" c ON c.id=b."chapterId" JOIN "LearningQuestion" q ON q.id=b."questionId" WHERE c."courseVersionId"=$1 AND c.slug='toetsing-rie' AND q.code LIKE 'WL001-H7-CHECK-%'`, [version])
    assert.equal(h7Checks.rows[0].count, 5)
    const h8Checks = await db.query(`SELECT count(*)::int AS count FROM "LearningContentBlock" b JOIN "LearningChapter" c ON c.id=b."chapterId" JOIN "LearningQuestion" q ON q.id=b."questionId" WHERE c."courseVersionId"=$1 AND c.slug='rie-actueel-houden' AND q.code LIKE 'WL001-H8-CHECK-%'`, [version])
    assert.equal(h8Checks.rows[0].count, 5)
    const h9Checks = await db.query(`SELECT count(*)::int AS count FROM "LearningContentBlock" b JOIN "LearningChapter" c ON c.id=b."chapterId" JOIN "LearningQuestion" q ON q.id=b."questionId" WHERE c."courseVersionId"=$1 AND c.slug='van-papier-naar-praktijk' AND q.code LIKE 'WL001-H9-CHECK-%'`, [version])
    assert.equal(h9Checks.rows[0].count, 5)
    const h10Checks = await db.query(`SELECT count(*)::int AS count FROM "LearningContentBlock" b JOIN "LearningChapter" c ON c.id=b."chapterId" JOIN "LearningQuestion" q ON q.id=b."questionId" WHERE c."courseVersionId"=$1 AND c.slug='integrale-praktijkcasus' AND q.code LIKE 'WL001-H10-CHECK-%'`, [version])
    assert.equal(h10Checks.rows[0].count, 8)
    const h6Duplicates = await db.query(`
      SELECT
        (SELECT count(*)::int FROM "LearningChapter" WHERE "courseVersionId"=$1 AND slug='plan-van-aanpak') AS chapters,
        (SELECT count(*)::int FROM "LearningContentBlock" b JOIN "LearningChapter" c ON c.id=b."chapterId" WHERE c."courseVersionId"=$1 AND c.slug='plan-van-aanpak') AS blocks,
        (SELECT count(*)::int FROM "LearningQuestion" WHERE code LIKE 'WL001-H6-%') AS questions,
        (SELECT count(*)::int FROM "LearningQuestionOption" o JOIN "LearningQuestion" q ON q.id=o."questionId" WHERE q.code LIKE 'WL001-H6-%') AS options,
        (SELECT count(*)::int - count(DISTINCT code)::int FROM "LearningQuestion" WHERE code LIKE 'WL001-H6-%') AS duplicate_codes`, [version])
    assert.deepEqual(h6Duplicates.rows[0], {
      chapters: 1,
      blocks: learningChapter6Blocks.length,
      questions: learningChapter6Questions.length,
      options: learningChapter6Questions.reduce((sum, question) => sum + question.options.length, 0),
      duplicate_codes: 0,
    })
    const h7Duplicates = await db.query(`
      SELECT
        (SELECT count(*)::int FROM "LearningChapter" WHERE "courseVersionId"=$1 AND slug='toetsing-rie') AS chapters,
        (SELECT count(*)::int FROM "LearningContentBlock" b JOIN "LearningChapter" c ON c.id=b."chapterId" WHERE c."courseVersionId"=$1 AND c.slug='toetsing-rie') AS blocks,
        (SELECT count(*)::int FROM "LearningQuestion" WHERE code LIKE 'WL001-H7-%') AS questions,
        (SELECT count(*)::int FROM "LearningQuestionOption" o JOIN "LearningQuestion" q ON q.id=o."questionId" WHERE q.code LIKE 'WL001-H7-%') AS options,
        (SELECT count(*)::int - count(DISTINCT code)::int FROM "LearningQuestion" WHERE code LIKE 'WL001-H7-%') AS duplicate_codes`, [version])
    assert.deepEqual(h7Duplicates.rows[0], {
      chapters: 1,
      blocks: learningChapter7Blocks.length,
      questions: learningChapter7Questions.length,
      options: learningChapter7Questions.reduce((sum, question) => sum + question.options.length, 0),
      duplicate_codes: 0,
    })
    const h8Duplicates = await db.query(`
      SELECT
        (SELECT count(*)::int FROM "LearningChapter" WHERE "courseVersionId"=$1 AND slug='rie-actueel-houden') AS chapters,
        (SELECT count(*)::int FROM "LearningContentBlock" b JOIN "LearningChapter" c ON c.id=b."chapterId" WHERE c."courseVersionId"=$1 AND c.slug='rie-actueel-houden') AS blocks,
        (SELECT count(*)::int FROM "LearningQuestion" WHERE code LIKE 'WL001-H8-%') AS questions,
        (SELECT count(*)::int FROM "LearningQuestionOption" o JOIN "LearningQuestion" q ON q.id=o."questionId" WHERE q.code LIKE 'WL001-H8-%') AS options,
        (SELECT count(*)::int - count(DISTINCT code)::int FROM "LearningQuestion" WHERE code LIKE 'WL001-H8-%') AS duplicate_codes`, [version])
    assert.deepEqual(h8Duplicates.rows[0], {
      chapters: 1,
      blocks: learningChapter8Blocks.length,
      questions: learningChapter8Questions.length,
      options: learningChapter8Questions.reduce((sum, question) => sum + question.options.length, 0),
      duplicate_codes: 0,
    })
    const h9Duplicates = await db.query(`
      SELECT
        (SELECT count(*)::int FROM "LearningChapter" WHERE "courseVersionId"=$1 AND slug='van-papier-naar-praktijk') AS chapters,
        (SELECT count(*)::int FROM "LearningContentBlock" b JOIN "LearningChapter" c ON c.id=b."chapterId" WHERE c."courseVersionId"=$1 AND c.slug='van-papier-naar-praktijk') AS blocks,
        (SELECT count(*)::int FROM "LearningQuestion" WHERE code LIKE 'WL001-H9-%') AS questions,
        (SELECT count(*)::int FROM "LearningQuestionOption" o JOIN "LearningQuestion" q ON q.id=o."questionId" WHERE q.code LIKE 'WL001-H9-%') AS options,
        (SELECT count(*)::int - count(DISTINCT code)::int FROM "LearningQuestion" WHERE code LIKE 'WL001-H9-%') AS duplicate_codes`, [version])
    assert.deepEqual(h9Duplicates.rows[0], {
      chapters: 1,
      blocks: learningChapter9Blocks.length,
      questions: learningChapter9Questions.length,
      options: learningChapter9Questions.reduce((sum, question) => sum + question.options.length, 0),
      duplicate_codes: 0,
    })
    const h10Duplicates = await db.query(`
      SELECT
        (SELECT count(*)::int FROM "LearningChapter" WHERE "courseVersionId"=$1 AND slug='integrale-praktijkcasus') AS chapters,
        (SELECT count(*)::int FROM "LearningContentBlock" b JOIN "LearningChapter" c ON c.id=b."chapterId" WHERE c."courseVersionId"=$1 AND c.slug='integrale-praktijkcasus') AS blocks,
        (SELECT count(*)::int FROM "LearningQuestion" WHERE code LIKE 'WL001-H10-%') AS questions,
        (SELECT count(*)::int FROM "LearningQuestionOption" o JOIN "LearningQuestion" q ON q.id=o."questionId" WHERE q.code LIKE 'WL001-H10-%') AS options,
        (SELECT count(*)::int - count(DISTINCT code)::int FROM "LearningQuestion" WHERE code LIKE 'WL001-H10-%') AS duplicate_codes`, [version])
    assert.deepEqual(h10Duplicates.rows[0], {
      chapters: 1,
      blocks: learningChapter10Blocks.length,
      questions: learningChapter10Questions.length,
      options: learningChapter10Questions.reduce((sum, question) => sum + question.options.length, 0),
      duplicate_codes: 0,
    })

    const afterReplay = await db.query<{ courses: number; versions: number; chapters: number; chapter2: number; chapter3: number; chapter9: number; chapter10: number; questions: number; options: number; blocks: number }>(`
      SELECT
        (SELECT count(*)::int FROM "LearningCourse" WHERE code='WL-001') AS courses,
        (SELECT count(*)::int FROM "LearningCourseVersion" v JOIN "LearningCourse" c ON c.id=v."courseId" WHERE c.code='WL-001' AND v.version='prototype-0.17') AS versions,
        (SELECT count(*)::int FROM "LearningChapter" chapter JOIN "LearningCourseVersion" v ON v.id=chapter."courseVersionId" JOIN "LearningCourse" c ON c.id=v."courseId" WHERE c.code='WL-001' AND v.version='prototype-0.17' AND chapter.slug IN ('waarom-een-rie','wie-doet-wat','risicos-inventariseren','risicos-beoordelen','maatregelen-bepalen','plan-van-aanpak','toetsing-rie','rie-actueel-houden','van-papier-naar-praktijk','integrale-praktijkcasus')) AS chapters,
        (SELECT count(*)::int FROM "LearningChapter" chapter JOIN "LearningCourseVersion" v ON v.id=chapter."courseVersionId" JOIN "LearningCourse" c ON c.id=v."courseId" WHERE c.code='WL-001' AND v.version='prototype-0.17' AND chapter.position=2 AND chapter.slug='wie-doet-wat') AS chapter2,
        (SELECT count(*)::int FROM "LearningChapter" chapter JOIN "LearningCourseVersion" v ON v.id=chapter."courseVersionId" JOIN "LearningCourse" c ON c.id=v."courseId" WHERE c.code='WL-001' AND v.version='prototype-0.17' AND chapter.slug='risicos-inventariseren' AND chapter.position=3) AS chapter3,
        (SELECT count(*)::int FROM "LearningChapter" WHERE "courseVersionId"=(SELECT id FROM "LearningCourseVersion" WHERE version='prototype-0.17') AND slug='van-papier-naar-praktijk' AND position=9) AS chapter9,
        (SELECT count(*)::int FROM "LearningChapter" WHERE "courseVersionId"=(SELECT id FROM "LearningCourseVersion" WHERE version='prototype-0.17') AND slug='integrale-praktijkcasus' AND position=10) AS chapter10,
        (SELECT count(*)::int FROM "LearningQuestion") AS questions,
        (SELECT count(*)::int FROM "LearningQuestionOption") AS options,
        (SELECT count(*)::int FROM "LearningContentBlock") AS blocks`)
    assert.deepEqual(afterReplay.rows[0], {
      courses: 1,
      versions: 1,
      chapters: 10,
      chapter2: 1,
      chapter3: 1,
      chapter9: 1,
      chapter10: 1,
      questions: allQuestions.length + examBank.length,
      options: allOptionCount + examOptionCount,
      blocks: allBlockCount,
    })

    run(['node_modules/vitest/vitest.mjs', 'run', '--configLoader', 'runner', '--pool=forks', '--maxWorkers=4', 'src/lib/learning/learning-runtime.integration.test.ts'], 'H4/H5/H6/H7/H8 real database runtime: progress, attempts, resume, ownership and zero-score completion')
    run(['node_modules/vitest/vitest.mjs', 'run', '--configLoader', 'runner', '--pool=forks', '--maxWorkers=4', 'src/lib/learning/learning-final-exam-runtime.integration.test.ts'], 'WL-001 v1.0 historical final exam runtime', { LEARNING_TEST_EXPECT_EXAM_VERSION: 'WL-001-EXAM-1.0' })
    const v10AttemptsBeforeV11 = await db.query(`SELECT a.* FROM "LearningExamAttempt" a JOIN "LearningExamVersion" v ON v.id=a."examVersionId" WHERE v.version='WL-001-EXAM-1.0' ORDER BY a.id`)
    const v10AnswersBeforeV11 = await db.query(`SELECT answer.* FROM "LearningExamAnswer" answer JOIN "LearningExamVersion" v ON v.id=answer."examVersionId" WHERE v.version='WL-001-EXAM-1.0' ORDER BY answer."attemptId",answer."questionId"`)
    const v10VersionBeforeV11 = await db.query(`SELECT * FROM "LearningExamVersion" WHERE version='WL-001-EXAM-1.0'`)
    const v10MappingsBeforeV11 = await db.query(`SELECT mapping.* FROM "LearningExamQuestion" mapping JOIN "LearningExamVersion" version ON version.id=mapping."examVersionId" WHERE version.version='WL-001-EXAM-1.0' ORDER BY mapping.position`)
    const v10QuestionsBeforeV11 = await db.query(`SELECT question.* FROM "LearningQuestion" question JOIN "LearningExamQuestion" mapping ON mapping."questionId"=question.id JOIN "LearningExamVersion" version ON version.id=mapping."examVersionId" WHERE version.version='WL-001-EXAM-1.0' ORDER BY question.code`)
    const v10QuestionOptionsBeforeV11 = await db.query(`SELECT option.* FROM "LearningQuestionOption" option JOIN "LearningExamQuestion" mapping ON mapping."questionId"=option."questionId" JOIN "LearningExamVersion" version ON version.id=mapping."examVersionId" WHERE version.version='WL-001-EXAM-1.0' ORDER BY mapping.code,option.position`)
    run([tsxCli, 'scripts/seed-learning-final-exam-v1-1.ts'], 'First immutable final exam v1.1 seed')
    run([tsxCli, 'scripts/seed-learning-final-exam-v1-1.ts'], 'Idempotent final exam v1.1 seed replay')
    const v11Counts = await db.query(`
      SELECT
        (SELECT count(*)::int FROM "LearningExamVersion" WHERE version='WL-001-EXAM-1.1' AND status='PUBLISHED' AND "questionCount"=50 AND "maxScore"=50 AND "passingScore"=40 AND "passingPercentage"=80 AND "timeLimitMinutes" IS NULL AND "attemptLimit" IS NULL) AS versions,
        (SELECT count(*)::int FROM "LearningExamQuestion" q JOIN "LearningExamVersion" v ON v.id=q."examVersionId" WHERE v.version='WL-001-EXAM-1.1') AS questions,
        (SELECT count(DISTINCT q.code)::int FROM "LearningExamQuestion" q JOIN "LearningExamVersion" v ON v.id=q."examVersionId" WHERE v.version='WL-001-EXAM-1.1') AS codes,
        (SELECT min(q.position)::int FROM "LearningExamQuestion" q JOIN "LearningExamVersion" v ON v.id=q."examVersionId" WHERE v.version='WL-001-EXAM-1.1') AS first_position,
        (SELECT max(q.position)::int FROM "LearningExamQuestion" q JOIN "LearningExamVersion" v ON v.id=q."examVersionId" WHERE v.version='WL-001-EXAM-1.1') AS last_position,
        (SELECT count(*)::int FROM "LearningQuestion" q JOIN "LearningExamQuestion" eq ON eq."questionId"=q.id JOIN "LearningExamVersion" v ON v.id=eq."examVersionId" WHERE v.version='WL-001-EXAM-1.1' AND q.version=2) AS versioned_questions,
        (SELECT count(*)::int FROM "LearningQuestionOption" o JOIN "LearningQuestion" q ON q.id=o."questionId" JOIN "LearningExamQuestion" eq ON eq."questionId"=q.id JOIN "LearningExamVersion" v ON v.id=eq."examVersionId" WHERE v.version='WL-001-EXAM-1.1') AS option_rows`)
    assert.deepEqual(v11Counts.rows[0], { versions: 1, questions: 50, codes: 50, first_position: 1, last_position: 50, versioned_questions: changedExamCodesV11.size, option_rows: examBankV11.reduce((total, question) => total + question.options.length, 0) })
    const v11Distribution = await db.query(`SELECT eq."chapterNumber", count(*)::int AS count FROM "LearningExamQuestion" eq JOIN "LearningExamVersion" ev ON ev.id=eq."examVersionId" WHERE ev.version='WL-001-EXAM-1.1' GROUP BY eq."chapterNumber" ORDER BY eq."chapterNumber"`)
    assert.deepEqual(v11Distribution.rows.map((row) => row.count), [3, 4, 5, 6, 6, 5, 5, 4, 4, 8])
    run(['node_modules/vitest/vitest.mjs', 'run', '--configLoader', 'runner', '--pool=forks', '--maxWorkers=4', 'src/lib/learning/learning-final-exam-runtime.integration.test.ts'], 'WL-001 v1.1 final exam runtime: access, secrecy, exact scoring, ownership, immutable submission, retries and history', { LEARNING_TEST_EXPECT_EXAM_VERSION: 'WL-001-EXAM-1.1', LEARNING_TEST_EXPECT_V10_HISTORY: '1' })
    assert.deepEqual((await db.query(`SELECT a.* FROM "LearningExamAttempt" a JOIN "LearningExamVersion" v ON v.id=a."examVersionId" WHERE v.version='WL-001-EXAM-1.0' ORDER BY a.id`)).rows, v10AttemptsBeforeV11.rows)
    assert.deepEqual((await db.query(`SELECT answer.* FROM "LearningExamAnswer" answer JOIN "LearningExamVersion" v ON v.id=answer."examVersionId" WHERE v.version='WL-001-EXAM-1.0' ORDER BY answer."attemptId",answer."questionId"`)).rows, v10AnswersBeforeV11.rows)
    const v10VersionAfterV11 = (await db.query(`SELECT * FROM "LearningExamVersion" WHERE version='WL-001-EXAM-1.0'`)).rows[0]
    assert.equal(v10VersionAfterV11.status, 'RETIRED')
    assert.deepEqual({ ...v10VersionAfterV11, status: 'PUBLISHED' }, v10VersionBeforeV11.rows[0], 'v1.0 version fields other than lifecycle status must remain unchanged')
    assert.deepEqual((await db.query(`SELECT mapping.* FROM "LearningExamQuestion" mapping JOIN "LearningExamVersion" version ON version.id=mapping."examVersionId" WHERE version.version='WL-001-EXAM-1.0' ORDER BY mapping.position`)).rows, v10MappingsBeforeV11.rows)
    assert.deepEqual((await db.query(`SELECT question.* FROM "LearningQuestion" question JOIN "LearningExamQuestion" mapping ON mapping."questionId"=question.id JOIN "LearningExamVersion" version ON version.id=mapping."examVersionId" WHERE version.version='WL-001-EXAM-1.0' ORDER BY question.code`)).rows, v10QuestionsBeforeV11.rows)
    assert.deepEqual((await db.query(`SELECT option.* FROM "LearningQuestionOption" option JOIN "LearningExamQuestion" mapping ON mapping."questionId"=option."questionId" JOIN "LearningExamVersion" version ON version.id=mapping."examVersionId" WHERE version.version='WL-001-EXAM-1.0' ORDER BY mapping.code,option.position`)).rows, v10QuestionOptionsBeforeV11.rows)

    run(['node_modules/vitest/vitest.mjs', 'run', '--configLoader', 'runner', '--pool=forks', '--maxWorkers=2', 'src/lib/learning/learning-full-course-runtime.integration.test.ts', 'src/lib/learning/learning-concurrency-runtime.integration.test.ts'], 'Full course and concurrent enrollment/progress runtime')
    run(['node_modules/vitest/vitest.mjs', 'run', '--configLoader', 'runner', '--pool=forks', '--maxWorkers=2', 'src/lib/learning/learning-retention-neon-runtime.integration.test.ts'], 'Local retention lifecycle, consent, isolation and fake delivery')
    console.log(`Fresh ${migrationNames.length}-migration chain and checksums, Learning/v1.0/v1.1 seeds idempotent, E01–E50 distributions, H1–H10 positions, v1.0 attempt/answer preservation and v1.1 runtime invariants PASS; v1.1 new QuestionVersions=${changedExamCodesV11.size}, their option rows=${examV11NewQuestionOptionCount}`)
    allChecksPassed = true
  } finally {
    await db.end().catch(() => undefined)
    if (allChecksPassed && process.env.LEARNING_TEST_PRESERVE_DATABASE === '1') {
      console.log(`PRESERVED TEMPORARY DATABASE FOR LOCAL BROWSER ACCEPTANCE: ${databaseName}`)
    } else {
      await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`).catch(() => undefined)
    }
    await admin.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Learning database test failed')
  process.exitCode = 1
})
