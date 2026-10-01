import 'dotenv/config'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const sourceUrl = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) throw new Error('Deze test mag uitsluitend tegen lokale PostgreSQL draaien.')

const databaseName = `workmatchr_compliance_domain_test_${process.pid}_${Date.now()}`
const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')
const testUrl = new URL(sourceUrl)
testUrl.pathname = `/${databaseName}`
testUrl.searchParams.set('schema', 'public')
const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar npm ontbreekt.')

function deployMigrations() {
  const result = spawnSync(process.execPath, [npmExecPath!, 'run', 'db:deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    encoding: 'utf8',
    stdio: 'pipe',
  })
  if (result.status !== 0) throw new Error(`Migraties mislukt:\n${result.stdout}\n${result.stderr}`)
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  const db = new Client({ connectionString: testUrl.toString() })

  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    deployMigrations()
    await db.connect()

    const framework = await db.query<{ id: string }>(`
      INSERT INTO "ComplianceFrameworkVersion"
        ("frameworkCode", "version", "status", "title", "methodology", "disclaimer", "checksum")
      VALUES
        ('NL_ARBO', 'test-1', 'DRAFT', 'Testframework', 'Methodiek', 'Disclaimer', repeat('a', 64))
      RETURNING "id"
    `)
    const frameworkId = framework.rows[0]!.id

    const module = await db.query<{ id: string }>(`
      INSERT INTO "ComplianceModuleDefinition"
        ("frameworkVersionId", "code", "title", "category", "defaultAssessmentMode", "position")
      VALUES ($1, 'C01', 'RI&E', 'CORE', 'FULL', 1)
      RETURNING "id"
    `, [frameworkId])
    const moduleId = module.rows[0]!.id

    await assert.rejects(
      db.query(`
        INSERT INTO "ComplianceModuleDefinition"
          ("frameworkVersionId", "code", "title", "category", "defaultAssessmentMode", "position")
        VALUES ($1, 'C11', 'Ongeldige kernmodule', 'CORE', 'FULL', 2)
      `, [frameworkId]),
    )

    const question = await db.query<{ id: string }>(`
      INSERT INTO "ComplianceQuestionDefinition"
        ("moduleDefinitionId", "code", "prompt", "inputType", "position")
      VALUES ($1, 'RIE-001', 'Beschikt de organisatie over een schriftelijke RI&E?', 'BOOLEAN', 1)
      RETURNING "id"
    `, [moduleId])
    const questionId = question.rows[0]!.id

    await db.query(`
      INSERT INTO "ComplianceAnswerOptionDefinition"
        ("questionDefinitionId", "value", "label", "position")
      VALUES
        ($1, 'YES', 'Ja', 1),
        ($1, 'NO', 'Nee', 2)
    `, [questionId])

    await db.query(`
      INSERT INTO "ComplianceRuleDefinition"
        ("frameworkVersionId", "moduleDefinitionId", "code", "conditionSchema", "assessmentStatus",
         "priority", "assessmentMode", "findingCode", "findingTitle", "findingBody", "recommendedAction", "position")
      VALUES
        ($1, $2, 'RIE-001-NO', '{"question":"RIE-001","equals":"NO"}'::jsonb, 'ACTION_REQUIRED',
         'HIGH', 'FULL', 'RIE_MISSING', 'RI&E ontbreekt', 'Er is geen RI&E aangegeven.', 'Stel een RI&E op.', 1)
    `, [frameworkId, moduleId])

    const otherFramework = await db.query<{ id: string }>(`
      INSERT INTO "ComplianceFrameworkVersion"
        ("frameworkCode", "version", "status", "title", "methodology", "disclaimer", "checksum")
      VALUES
        ('NL_ARBO', 'test-2', 'DRAFT', 'Tweede framework', 'Methodiek', 'Disclaimer', repeat('b', 64))
      RETURNING "id"
    `)

    await assert.rejects(
      db.query(`
        INSERT INTO "ComplianceRuleDefinition"
          ("frameworkVersionId", "moduleDefinitionId", "code", "conditionSchema", "applicability",
           "assessmentMode", "position")
        VALUES ($1, $2, 'BAD-CROSS-FRAMEWORK', '{}'::jsonb, 'RELEVANT', 'FULL', 2)
      `, [otherFramework.rows[0]!.id, moduleId]),
    )

    await db.query(`
      UPDATE "ComplianceFrameworkVersion"
      SET "status" = 'PUBLISHED', "publishedAt" = NOW()
      WHERE "id" = $1
    `, [frameworkId])

    await assert.rejects(
      db.query(`UPDATE "ComplianceModuleDefinition" SET "title" = 'Gewijzigd' WHERE "id" = $1`, [moduleId]),
    )
    await assert.rejects(
      db.query(`DELETE FROM "ComplianceQuestionDefinition" WHERE "id" = $1`, [questionId]),
    )
    await assert.rejects(
      db.query(`UPDATE "ComplianceFrameworkVersion" SET "title" = 'Gewijzigd' WHERE "id" = $1`, [frameworkId]),
    )

    const count = await db.query<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM "ComplianceModuleDefinition"
      WHERE "frameworkVersionId" = $1
    `, [frameworkId])
    assert.equal(count.rows[0]?.count, '1')

    console.log('Compliance-domain-databaseacceptatie geslaagd: taxonomie, frameworkintegriteit en immutability.')
  } finally {
    await db.end().catch(() => undefined)
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`)
    await admin.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
