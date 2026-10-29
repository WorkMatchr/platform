import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { Client } from 'pg'

// Never migrates the supplied database. Only connects to postgres to create unique,
// process-owned databases/roles, then removes exactly those objects in finally.
function localSource() {
  try {
    const url = new URL(process.env.DATABASE_URL ?? '')
    assert.ok(['postgres:', 'postgresql:'].includes(url.protocol))
    assert.ok(['localhost', '127.0.0.1'].includes(url.hostname))
    // pg also accepts host/port/database overrides in query parameters.
    for (const key of url.searchParams.keys()) assert.ok(['schema', 'connection_limit', 'pool_timeout'].includes(key))
    assert.ok(!url.searchParams.has('schema') || url.searchParams.get('schema') === 'public')
    return url
  } catch {
    // URL-parser errors can include the complete input: never propagate those.
    throw new Error('A valid loopback PostgreSQL DATABASE_URL without connection overrides is required')
  }
}
const source = localSource()
const adminUrl = new URL(source)
adminUrl.pathname = '/postgres'
const suffix = `${process.pid}_${Date.now()}`
const writer = `db02_writer_${suffix}`
const outsider = `db02_outsider_${suffix}`
const correction = '20261026090000_restore_learning_exam_question_immutability'
const retention = '20260930100000_add_learning_retention'
const finalExam = '20260927210000_add_learning_final_exam'
const migrationRoot = path.resolve('prisma/migrations')
const names = readdirSync(migrationRoot).filter((name) => /^\d/.test(name)).sort()
assert.equal(names.at(-1), correction, 'Review this staged regression when adding later migrations')
const manifest = JSON.parse(readFileSync('docs/evidence/wp14/migration-checksums.json', 'utf8')) as {
  migrations: { name: string; lfSha256: string; productionChecksum: string | null }[]
}
const productionNames = manifest.migrations.filter((entry) => entry.productionChecksum).map((entry) => entry.name)
assert.equal(productionNames.length, 85)
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex')
for (const entry of manifest.migrations) {
  assert.equal(hash(readFileSync(path.join(migrationRoot, entry.name, 'migration.sql'), 'utf8').replace(/\r\n/g, '\n')), entry.lfSha256, `Historical SQL changed: ${entry.name}`)
}

type Question = { question: string; option: string }
type Exam = Question & { examVersion: string; attempt?: string }
let negativeChecks = 0

async function denied(db: Client, sql: string, values: unknown[], code = 'P0001') {
  await assert.rejects(db.query(sql, values), (error: { code?: string }) => error.code === code)
  negativeChecks += 1
}

async function newQuestion(db: Client): Promise<Question> {
  const question = randomUUID()
  await db.query(`INSERT INTO "LearningQuestion" (id,code,"knowledgeArea","learningObjective",type,"questionText",explanation,"correctAnswer")
    VALUES ($1,$2,'Synthetic','Synthetic','SINGLE_CHOICE','Synthetic question?','original','["yes"]')`, [question, `DB02-${question}`])
  const option = (await db.query(`INSERT INTO "LearningQuestionOption" ("questionId",value,text,"isCorrect",position)
    VALUES ($1,'yes','Synthetic yes',true,1) RETURNING id`, [question])).rows[0].id as string
  return { question, option }
}

async function newExam(db: Client, status: 'DRAFT' | 'PUBLISHED' | 'RETIRED'): Promise<Exam> {
  const q = await newQuestion(db)
  const [course, version, exam, examVersion] = Array.from({ length: 4 }, () => randomUUID())
  await db.query(`INSERT INTO "LearningCourse" (id,slug,code,title,description,"updatedAt")
    VALUES ($1,$2,$2,'Synthetic','Synthetic',now())`, [course, `DB-${course}`])
  await db.query(`INSERT INTO "LearningCourseVersion" (id,"courseId",version) VALUES ($1,$2,'db02')`, [version, course])
  await db.query(`INSERT INTO "LearningExam" (id,"courseId",code,title) VALUES ($1,$2,$3,'Synthetic')`, [exam, course, `DB-${exam}`])
  await db.query(`INSERT INTO "LearningExamVersion" (id,"examId","courseId","courseVersionId",version,"questionCount","maxScore","passingScore","passingPercentage")
    VALUES ($1,$2,$3,$4,'db02',1,1,1,100)`, [examVersion, exam, course, version])
  await db.query(`INSERT INTO "LearningExamQuestion" ("examVersionId","questionId",code,position,"chapterNumber","cognitiveLevel","knowledgeAreas")
    VALUES ($1,$2,'E01',1,1,'B',ARRAY['SYNTHETIC'])`, [examVersion, q.question])
  let attempt: string | undefined
  if (status !== 'DRAFT') {
    await db.query(`UPDATE "LearningExamVersion" SET status='PUBLISHED',"publishedAt"=now() WHERE id=$1`, [examVersion])
    const user = randomUUID()
    await db.query(`INSERT INTO "User" (id,email,"displayName",status,"updatedAt") VALUES ($1,$2,'Synthetic','ACTIVE',now())`, [user, `${user}@example.invalid`])
    const enrollment = (await db.query(`INSERT INTO "LearningEnrollment" ("userId","courseVersionId",status,"startedAt","updatedAt")
      VALUES ($1,$2,'IN_PROGRESS',now(),now()) RETURNING id`, [user, version])).rows[0].id as string
    attempt = (await db.query(`INSERT INTO "LearningExamAttempt" ("userId","enrollmentId","examId","examVersionId","courseVersionId","attemptNumber","maxScore","passingScore")
      VALUES ($1,$2,$3,$4,$5,1,1,1) RETURNING id`, [user, enrollment, exam, examVersion, version])).rows[0].id as string
    await db.query(`INSERT INTO "LearningExamAnswer" ("attemptId","examVersionId","questionId",answer,"updatedAt") VALUES ($1,$2,$3,'"yes"',now())`, [attempt, examVersion, q.question])
    await db.query(`UPDATE "LearningExamAttempt" SET status='SUBMITTED',score=1,percentage=100,passed=true,"submittedAt"=now() WHERE id=$1`, [attempt])
    if (status === 'RETIRED') await db.query(`UPDATE "LearningExamVersion" SET status='RETIRED' WHERE id=$1`, [examVersion])
  }
  return { ...q, examVersion, attempt }
}

async function assertProtected(db: Client, q: Question) {
  assert.equal((await db.query('SELECT public.learning_question_is_editable($1) AS editable', [q.question])).rows[0].editable, false)
  await denied(db, `UPDATE "LearningQuestion" SET explanation='changed' WHERE id=$1`, [q.question])
  await denied(db, `DELETE FROM "LearningQuestion" WHERE id=$1`, [q.question])
  await denied(db, `UPDATE "LearningQuestionOption" SET text='changed' WHERE id=$1`, [q.option])
  await denied(db, `DELETE FROM "LearningQuestionOption" WHERE id=$1`, [q.option])
}

async function dataSnapshot(db: Client) {
  const tables = (await db.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename<>'_prisma_migrations' ORDER BY tablename`)).rows
  const snapshots: Record<string, string> = {}
  for (const { tablename } of tables) {
    assert.match(tablename, /^[A-Za-z0-9_]+$/)
    snapshots[tablename] = (await db.query(`SELECT md5(coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY row_to_json(t)::text),'')) AS digest FROM public."${tablename}" t`)).rows[0].digest
  }
  return snapshots
}

async function functionIdentity(db: Client) {
  return (await db.query(`SELECT oid,proowner,proacl,prosecdef,provolatile FROM pg_proc WHERE oid='public.learning_question_is_editable(uuid)'::regprocedure`)).rows[0]
}

async function grantWriter(db: Client) {
  await db.query(`GRANT USAGE ON SCHEMA public TO "${writer}", "${outsider}"`)
  await db.query(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO "${writer}"`)
  await db.query(`GRANT INSERT, UPDATE, DELETE ON "LearningQuestion", "LearningQuestionOption" TO "${writer}"`)
  await db.query(`REVOKE ALL ON FUNCTION public.learning_question_is_editable(uuid) FROM PUBLIC`)
  await db.query(`GRANT EXECUTE ON FUNCTION public.learning_question_is_editable(uuid) TO "${writer}"`)
}

async function integrityChecks(db: Client, exams: Exam[]) {
  await grantWriter(db)
  for (const exam of exams) await assertProtected(db, exam) // Also owner/DML path; never bypass triggers.
  const rowsBefore = await dataSnapshot(db)
  await db.query(`SET ROLE "${writer}"`)
  try {
    for (const exam of exams) await assertProtected(db, exam)
    // Temp-table shadowing must not hide published exam mappings.
    await db.query(`CREATE TEMP TABLE "LearningExamQuestion" (LIKE public."LearningExamQuestion")`)
    await db.query('SET search_path = pg_temp, public, pg_catalog')
    for (const exam of exams) await assertProtected(db, exam)
    await db.query('RESET search_path')
    await db.query('DROP TABLE pg_temp."LearningExamQuestion"')
    await denied(db, `ALTER TABLE "LearningQuestion" DISABLE TRIGGER ALL`, [], '42501')
    await denied(db, `SET session_replication_role = replica`, [], '42501')
    await denied(db, `CREATE OR REPLACE FUNCTION public.learning_question_is_editable(question_id uuid) RETURNS boolean LANGUAGE sql AS 'SELECT true'`, [], '42501')
  } finally {
    await db.query('RESET ROLE')
    await db.query('RESET search_path')
  }
  await db.query(`SET ROLE "${outsider}"`)
  try {
    await denied(db, `UPDATE "LearningQuestion" SET explanation='changed' WHERE id=$1`, [exams[0].question], '42501')
    await denied(db, `DELETE FROM "LearningQuestionOption" WHERE id=$1`, [exams[0].option], '42501')
    await denied(db, 'SELECT public.learning_question_is_editable($1)', [exams[0].question], '42501')
  } finally { await db.query('RESET ROLE') }
  assert.deepEqual(await dataSnapshot(db), rowsBefore, 'Negative probes changed data/history')
  const identity = await functionIdentity(db)
  assert.equal(identity.prosecdef, false)
  assert.equal(identity.provolatile, 's')
  assert.deepEqual((await db.query(`SELECT proconfig FROM pg_proc WHERE oid='public.learning_question_is_editable(uuid)'::regprocedure`)).rows[0].proconfig, ['search_path=pg_catalog'])

  const draft = await newExam(db, 'DRAFT')
  await db.query(`SET ROLE "${writer}"`)
  try {
    await db.query(`UPDATE "LearningQuestion" SET explanation='permitted draft edit' WHERE id=$1`, [draft.question])
    await db.query(`UPDATE "LearningQuestionOption" SET text='permitted draft option' WHERE id=$1`, [draft.option])
  } finally { await db.query('RESET ROLE') }
  // Retention-only publication must still protect questions; draft cleanup stays allowed.
  for (const status of ['PUBLISHED', 'RETIRED', 'DRAFT']) {
    const q = await newQuestion(db)
    const row = (await db.query(`INSERT INTO "LearningRetentionQuestion" ("questionId","bankVersion","chapterNumber","cognitiveLevel","correctFeedback","incorrectFeedback",status)
      VALUES ($1,'synthetic',1,'B','Synthetic','Synthetic',$2) RETURNING id`, [q.question, status])).rows[0]
    if (status === 'DRAFT') {
      await db.query(`UPDATE "LearningQuestion" SET explanation='permitted retention draft' WHERE id=$1`, [q.question])
      await db.query(`DELETE FROM "LearningRetentionQuestion" WHERE id=$1`, [row.id])
      await db.query(`DELETE FROM "LearningQuestionOption" WHERE id=$1`, [q.option])
      await db.query(`DELETE FROM "LearningQuestion" WHERE id=$1`, [q.question])
    } else {
      await db.query(`SET ROLE "${writer}"`)
      try { await assertProtected(db, q) } finally { await db.query('RESET ROLE') }
    }
  }
  for (const exam of exams) {
    await denied(db, `UPDATE "LearningExamAttempt" SET score=0 WHERE id=$1`, [exam.attempt])
    await denied(db, `DELETE FROM "LearningExamAttempt" WHERE id=$1`, [exam.attempt])
    await denied(db, `DELETE FROM "LearningExamAnswer" WHERE "attemptId"=$1`, [exam.attempt])
  }
}

async function runDatabase(admin: Client, mode: 'upgrade' | 'fresh') {
  const database = `workmatchr_db02_${mode}_${suffix}`
  const target = new URL(source)
  target.pathname = `/${database}`
  mkdirSync('.local-storage', { recursive: true })
  const stage = mkdtempSync(path.resolve('.local-storage/db02-migrations-'))
  const migrations = path.join(stage, 'migrations')
  mkdirSync(migrations)
  cpSync(path.join(migrationRoot, 'migration_lock.toml'), path.join(migrations, 'migration_lock.toml'))
  const config = path.join(stage, 'prisma.config.ts')
  writeFileSync(config, `import { defineConfig } from 'prisma/config'; export default defineConfig({schema:${JSON.stringify(path.resolve('prisma/schema.prisma'))},migrations:{path:${JSON.stringify(migrations)}},datasource:{url:process.env.DATABASE_URL!}});`)
  const copy = (name: string) => cpSync(path.join(migrationRoot, name), path.join(migrations, name), { recursive: true })
  const deploy = () => {
    const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy', '--config', config], {
      env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8', timeout:180_000,
    })
    // No connection strings or provider payloads in failures.
    assert.equal(result.status, 0, `Isolated ${mode} migrate deploy failed: ${result.error?.name ?? result.status}`)
  }
  const db = new Client({ connectionString: target.toString(), connectionTimeoutMillis: 5000 })
  let created = false
  try {
    await admin.query(`CREATE DATABASE "${database}"`)
    created = true
    await db.connect()
    let exams: Exam[] = []
    if (mode === 'upgrade') {
      productionNames.forEach(copy)
      deploy()
      assert.equal((await db.query('SELECT count(*)::int AS n FROM _prisma_migrations')).rows[0].n, 85)
      for (const name of names.filter((n) => !productionNames.includes(n))) {
        let dataBefore: Record<string, string> | undefined
        let identityBefore: Awaited<ReturnType<typeof functionIdentity>>
        if (name === correction) {
          await grantWriter(db)
          dataBefore = await dataSnapshot(db)
          identityBefore = await functionIdentity(db)
        }
        copy(name)
        deploy()
        if (name === finalExam) {
          exams = [await newExam(db, 'PUBLISHED'), await newExam(db, 'RETIRED')]
          for (const exam of exams) await assertProtected(db, exam)
          console.log('PASS: pre-retention PUBLISHED/RETIRED question and option protection')
        }
        if (name === retention) {
          for (const exam of exams) {
            assert.equal((await db.query('SELECT learning_question_is_editable($1) AS editable', [exam.question])).rows[0].editable, true)
            await db.query('BEGIN')
            try {
              await db.query(`UPDATE "LearningQuestion" SET explanation='reproduced defect' WHERE id=$1`, [exam.question])
              await db.query(`UPDATE "LearningQuestionOption" SET text='reproduced defect' WHERE id=$1`, [exam.option])
            } finally { await db.query('ROLLBACK') }
          }
          console.log('PASS: historical retention regression reproduced; synthetic changes rolled back')
        }
        if (name === correction) {
          assert.deepEqual(await dataSnapshot(db), dataBefore, 'Correction changed existing data/history')
          assert.deepEqual(await functionIdentity(db), identityBefore, 'Correction changed owner/ACL/OID/security mode/volatility')
        }
      }
    } else {
      names.forEach(copy)
      deploy()
      exams = [await newExam(db, 'PUBLISHED'), await newExam(db, 'RETIRED')]
    }
    await integrityChecks(db, exams)
    const rows = (await db.query('SELECT id,migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows
    assert.deepEqual(rows.map((r) => r.migration_name), names)
    for (const row of rows) {
      assert.ok(row.finished_at && !row.rolled_back_at)
      assert.equal(row.checksum, hash(readFileSync(path.join(migrationRoot, row.migration_name, 'migration.sql'))))
    }
    deploy()
    assert.deepEqual((await db.query('SELECT id,migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name')).rows, rows)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM pg_index WHERE NOT indisvalid OR NOT indisready')).rows[0].n, 0)
    console.log(`PASS: ${mode}; ${names.length}/${names.length} migrations, checksums/repeat, least privilege, exam history and retention protection`)
  } finally {
    await db.end()
    if (created) await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`)
    // mkdtemp created this exact folder; never deletes a supplied workspace path.
    rmSync(stage, { recursive: true, force: true })
  }
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString(), connectionTimeoutMillis: 5000 })
  await admin.connect()
  const databasesBefore = (await admin.query('SELECT datname FROM pg_database ORDER BY datname')).rows
  const rolesBefore = (await admin.query('SELECT rolname FROM pg_roles ORDER BY rolname')).rows
  const createdRoles: string[] = []
  try {
    for (const role of [writer, outsider]) {
      await admin.query(`CREATE ROLE "${role}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`)
      createdRoles.push(role)
    }
    await runDatabase(admin, 'upgrade')
    await runDatabase(admin, 'fresh')
    console.log(`PASS: ${negativeChecks} explicit rejected mutations/privilege attempts; no production access`)
  } finally {
    for (const role of createdRoles.reverse()) await admin.query(`DROP ROLE "${role}"`)
    assert.deepEqual((await admin.query('SELECT datname FROM pg_database ORDER BY datname')).rows, databasesBefore)
    assert.deepEqual((await admin.query('SELECT rolname FROM pg_roles ORDER BY rolname')).rows, rolesBefore)
    await admin.end()
    console.log('CLEANUP PASS: only owned databases/roles/artifacts removed; existing inventories unchanged')
  }
}

main().catch((error: unknown) => {
  // Assertion messages contain only labels/metadata; database errors only expose SQLSTATE.
  console.error(error instanceof assert.AssertionError ? error.message : (error as { code?: string }).code ?? 'Isolated integrity test failed')
  process.exitCode = 1
})
