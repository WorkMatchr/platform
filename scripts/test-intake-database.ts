import 'dotenv/config'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is niet geconfigureerd.')
}

const sourceUrl = new URL(connectionString)

if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) {
  throw new Error('De database-integriteitstest mag uitsluitend tegen lokale PostgreSQL draaien.')
}

const testDatabaseName = `workmatchr_intake_test_${process.pid}_${Date.now()}`

if (!/^workmatchr_intake_test_[0-9_]+$/.test(testDatabaseName)) {
  throw new Error('Ongeldige tijdelijke databasenaam.')
}

const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')

const testUrl = new URL(sourceUrl)
testUrl.pathname = `/${testDatabaseName}`
testUrl.searchParams.set('schema', 'public')

const npmExecPath = process.env.npm_execpath

if (!npmExecPath) {
  throw new Error('Het pad naar de actieve npm-CLI ontbreekt.')
}

const resolvedNpmExecPath: string = npmExecPath

function runNpmScript(script: 'db:deploy' | 'db:seed') {
  const result = spawnSync(process.execPath, [resolvedNpmExecPath, 'run', script], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    encoding: 'utf8',
    stdio: 'pipe',
  })

  if (result.status !== 0) {
    throw new Error(
      `${script} mislukte in de tijdelijke database:\n${result.error?.message ?? ''}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`,
    )
  }
}

async function expectDatabaseFailure(label: string, action: () => Promise<unknown>) {
  let failed = false

  try {
    await action()
  } catch {
    failed = true
  }

  assert.equal(failed, true, `${label} had door PostgreSQL geweigerd moeten worden.`)
}

async function verifyIntegrity(client: Client) {
  const referenceCounts = await client.query<{
    questionnaires: number
    versions: number
    questions: number
    options: number
  }>(`
    SELECT
      (SELECT COUNT(*)::int FROM "IntakeQuestionnaire") AS questionnaires,
      (SELECT COUNT(*)::int FROM "IntakeQuestionnaireVersion") AS versions,
      (SELECT COUNT(*)::int FROM "IntakeQuestion") AS questions,
      (SELECT COUNT(*)::int FROM "IntakeQuestionOption") AS options
  `)

  assert.deepEqual(referenceCounts.rows[0], {
    questionnaires: 1,
    versions: 1,
    questions: 12,
    options: 35,
  })

  await expectDatabaseFailure('een tweede gepubliceerde versie', () =>
    client.query(`
      INSERT INTO "IntakeQuestionnaireVersion" (
        "questionnaireId", "version", "status", "publishedAt", "updatedAt"
      ) VALUES (
        '00000000-0000-4000-8000-000000005000', 2, 'PUBLISHED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `),
  )

  await expectDatabaseFailure('wijziging van een gepubliceerde vraag', () =>
    client.query(`
      UPDATE "IntakeQuestion"
      SET "label" = 'Niet toegestaan', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = '00000000-0000-4000-8000-000000005101'
    `),
  )

  await client.query(`
    INSERT INTO "User" (
      "id", "email", "emailVerified", "platformRole", "status", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000009001',
      'database-integrity@example.invalid',
      true,
      'USER',
      'ACTIVE',
      CURRENT_TIMESTAMP
    );

    INSERT INTO "Organization" (
      "id", "name", "organizationType", "status", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000009002',
      'Tijdelijke database-integriteitstest',
      'CLIENT',
      'ACTIVE',
      CURRENT_TIMESTAMP
    );

    INSERT INTO "Intake" (
      "id", "clientOrganizationId", "createdByUserId", "questionnaireVersionId",
      "freeText", "status", "version", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000009003',
      '00000000-0000-4000-8000-000000009002',
      '00000000-0000-4000-8000-000000009001',
      '00000000-0000-4000-8000-000000005001',
      'Tijdelijke hulpvraag voor een database-integriteitstest.',
      'DRAFT',
      1,
      CURRENT_TIMESTAMP
    );

    INSERT INTO "IntakeAnswer" (
      "id", "intakeId", "questionId", "version", "textValue", "updatedByUserId", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000009004',
      '00000000-0000-4000-8000-000000009003',
      '00000000-0000-4000-8000-000000005101',
      1,
      'Tijdelijk actueel antwoord voor de integriteitstest.',
      '00000000-0000-4000-8000-000000009001',
      CURRENT_TIMESTAMP
    );

    INSERT INTO "IntakeAnswerRevision" (
      "id", "intakeAnswerId", "version", "textValue", "changedByUserId"
    ) VALUES (
      '00000000-0000-4000-8000-000000009005',
      '00000000-0000-4000-8000-000000009004',
      1,
      'Tijdelijk actueel antwoord voor de integriteitstest.',
      '00000000-0000-4000-8000-000000009001'
    );

    INSERT INTO "IntakeStatusHistory" (
      "id", "intakeId", "fromStatus", "toStatus", "changedByUserId"
    ) VALUES (
      '00000000-0000-4000-8000-000000009006',
      '00000000-0000-4000-8000-000000009003',
      NULL,
      'DRAFT',
      '00000000-0000-4000-8000-000000009001'
    );
  `)

  await expectDatabaseFailure('meerdere scalarwaarden in één antwoord', () =>
    client.query(`
      INSERT INTO "IntakeAnswer" (
        "intakeId", "questionId", "version", "textValue", "numberValue", "updatedByUserId", "updatedAt"
      ) VALUES (
        '00000000-0000-4000-8000-000000009003',
        '00000000-0000-4000-8000-000000005106',
        1,
        'Niet toegestaan',
        10,
        '00000000-0000-4000-8000-000000009001',
        CURRENT_TIMESTAMP
      )
    `),
  )

  await expectDatabaseFailure('wijziging van de oorspronkelijke freeText', () =>
    client.query(`
      UPDATE "Intake"
      SET "freeText" = 'Deze gewijzigde bronopname mag nooit worden opgeslagen.'
      WHERE "id" = '00000000-0000-4000-8000-000000009003'
    `),
  )

  await expectDatabaseFailure('wijziging van een antwoordrevisie', () =>
    client.query(`
      UPDATE "IntakeAnswerRevision"
      SET "textValue" = 'Niet toegestaan'
      WHERE "id" = '00000000-0000-4000-8000-000000009005'
    `),
  )

  await expectDatabaseFailure('wijziging van statushistorie', () =>
    client.query(`
      UPDATE "IntakeStatusHistory"
      SET "reason" = 'Niet toegestaan'
      WHERE "id" = '00000000-0000-4000-8000-000000009006'
    `),
  )

  await client.query(`
    INSERT INTO "Assignment" (
      "id", "intakeId", "clientOrganizationId", "createdByUserId", "title", "description", "updatedAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000009007',
      '00000000-0000-4000-8000-000000009003',
      '00000000-0000-4000-8000-000000009002',
      '00000000-0000-4000-8000-000000009001',
      'Tijdelijke opdracht',
      'Alleen voor de tijdelijke database-integriteitstest.',
      CURRENT_TIMESTAMP
    )
  `)

  await expectDatabaseFailure('een tweede opdracht voor dezelfde intake', () =>
    client.query(`
      INSERT INTO "Assignment" (
        "intakeId", "clientOrganizationId", "createdByUserId", "title", "description", "updatedAt"
      ) VALUES (
        '00000000-0000-4000-8000-000000009003',
        '00000000-0000-4000-8000-000000009002',
        '00000000-0000-4000-8000-000000009001',
        'Tweede tijdelijke opdracht',
        'Deze opdracht moet door de unieke index worden geweigerd.',
        CURRENT_TIMESTAMP
      )
    `),
  )

  await client.query(`
    UPDATE "IntakeAnswer"
    SET "version" = 3, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = '00000000-0000-4000-8000-000000009004'
  `)

  await expectDatabaseFailure('een antwoordrevisie met een versiegat', () =>
    client.query(`
      INSERT INTO "IntakeAnswerRevision" (
        "intakeAnswerId", "version", "textValue", "changedByUserId"
      ) VALUES (
        '00000000-0000-4000-8000-000000009004',
        3,
        'Revisie met een versiegat',
        '00000000-0000-4000-8000-000000009001'
      )
    `),
  )
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() })
  let testClient: Client | undefined

  await admin.connect()

  try {
    await admin.query(`CREATE DATABASE "${testDatabaseName}"`)
    runNpmScript('db:deploy')
    runNpmScript('db:seed')
    runNpmScript('db:seed')

    testClient = new Client({ connectionString: testUrl.toString() })
    await testClient.connect()
    await verifyIntegrity(testClient)
    console.info('Database-integriteit Module 5A.1: geslaagd.')
  } finally {
    if (testClient) {
      await testClient.end()
    }
    await admin.query(`DROP DATABASE IF EXISTS "${testDatabaseName}" WITH (FORCE)`)
    await admin.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Onbekende fout tijdens de database-integriteitstest.')
  process.exitCode = 1
})
