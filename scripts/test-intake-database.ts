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

async function expectTransactionRollback(
  client: Client,
  label: string,
  action: () => Promise<unknown>,
) {
  let failed = false
  await client.query('BEGIN')

  try {
    await action()
    await client.query('COMMIT')
  } catch {
    failed = true
    await client.query('ROLLBACK')
  }

  assert.equal(failed, true, `${label} had de volledige transactie moeten terugdraaien.`)
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
    );

    INSERT INTO "AssignmentStatusHistory" (
      "id", "assignmentId", "fromStatus", "toStatus", "changedByUserId", "reason"
    ) VALUES (
      '00000000-0000-4000-8000-000000009008',
      '00000000-0000-4000-8000-000000009007',
      NULL,
      'DRAFT',
      '00000000-0000-4000-8000-000000009001',
      'Tijdelijke beginstatus voor de integriteitstest.'
    );

    INSERT INTO "AssignmentRevision" (
      "id", "assignmentId", "version", "title", "description", "allowsRemoteWork", "changedByUserId"
    ) VALUES (
      '00000000-0000-4000-8000-000000009009',
      '00000000-0000-4000-8000-000000009007',
      1,
      'Tijdelijke opdracht',
      'Alleen voor de tijdelijke database-integriteitstest.',
      false,
      '00000000-0000-4000-8000-000000009001'
    )
  `)

  await expectDatabaseFailure('wijziging van opdrachtstatushistorie', () =>
    client.query(`
      UPDATE "AssignmentStatusHistory"
      SET "reason" = 'Niet toegestaan'
      WHERE "id" = '00000000-0000-4000-8000-000000009008'
    `),
  )

  await expectDatabaseFailure('wijziging van een opdrachtrevisie', () =>
    client.query(`
      UPDATE "AssignmentRevision"
      SET "title" = 'Niet toegestaan'
      WHERE "id" = '00000000-0000-4000-8000-000000009009'
    `),
  )

  await expectDatabaseFailure('een opdrachtrevisie zonder actuele opdrachtversie', () =>
    client.query(`
      INSERT INTO "AssignmentRevision" (
        "assignmentId", "version", "title", "description", "allowsRemoteWork", "changedByUserId"
      ) VALUES (
        '00000000-0000-4000-8000-000000009007',
        2,
        'Niet-aansluitende revisie',
        'Deze revisie moet door de database worden geweigerd.',
        false,
        '00000000-0000-4000-8000-000000009001'
      )
    `),
  )

  await expectDatabaseFailure('wijziging van de intakekoppeling van een opdracht', () =>
    client.query(`
      UPDATE "Assignment"
      SET "intakeId" = NULL, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = '00000000-0000-4000-8000-000000009007'
    `),
  )

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

  await expectDatabaseFailure('conversie zonder volledige indieningsmetadata', () =>
    client.query(`
      UPDATE "Intake"
      SET "status" = 'CONVERTED', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = '00000000-0000-4000-8000-000000009003'
    `),
  )

  await client.query(`
    UPDATE "Intake"
    SET
      "status" = 'SUBMITTED',
      "submittedAt" = CURRENT_TIMESTAMP,
      "submittedByUserId" = '00000000-0000-4000-8000-000000009001',
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = '00000000-0000-4000-8000-000000009003';

    UPDATE "Intake"
    SET
      "status" = 'CONVERTED',
      "convertedAt" = CURRENT_TIMESTAMP,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = '00000000-0000-4000-8000-000000009003'
  `)

  await expectDatabaseFailure('terugdraaien van een geconverteerde intake', () =>
    client.query(`
      UPDATE "Intake"
      SET "status" = 'IN_PROGRESS', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = '00000000-0000-4000-8000-000000009003'
    `),
  )

  await expectDatabaseFailure('wijziging van een antwoord na conversie', () =>
    client.query(`
      UPDATE "IntakeAnswer"
      SET "textValue" = 'Niet toegestaan', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = '00000000-0000-4000-8000-000000009004'
    `),
  )

  await client.query(`
    UPDATE "Assignment"
    SET
      "title" = 'Aangepaste tijdelijke opdracht',
      "description" = 'De inhoud is gecontroleerd en aangepast binnen Module 5B.3.',
      "version" = 2,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = '00000000-0000-4000-8000-000000009007';

    INSERT INTO "AssignmentRevision" (
      "id", "assignmentId", "version", "title", "description", "allowsRemoteWork", "changedByUserId"
    ) VALUES (
      '00000000-0000-4000-8000-000000009010',
      '00000000-0000-4000-8000-000000009007',
      2,
      'Aangepaste tijdelijke opdracht',
      'De inhoud is gecontroleerd en aangepast binnen Module 5B.3.',
      false,
      '00000000-0000-4000-8000-000000009001'
    );

    UPDATE "Assignment"
    SET "status" = 'READY_FOR_REVIEW', "version" = 3, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = '00000000-0000-4000-8000-000000009007';
    INSERT INTO "AssignmentStatusHistory" (
      "id", "assignmentId", "fromStatus", "toStatus", "changedByUserId", "reason"
    ) VALUES (
      '00000000-0000-4000-8000-000000009011',
      '00000000-0000-4000-8000-000000009007',
      'DRAFT', 'READY_FOR_REVIEW',
      '00000000-0000-4000-8000-000000009001',
      'Opdracht intern gereed voor controle.'
    );

    UPDATE "Assignment"
    SET "status" = 'DRAFT', "version" = 4, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = '00000000-0000-4000-8000-000000009007';
    INSERT INTO "AssignmentStatusHistory" (
      "id", "assignmentId", "fromStatus", "toStatus", "changedByUserId", "reason"
    ) VALUES (
      '00000000-0000-4000-8000-000000009012',
      '00000000-0000-4000-8000-000000009007',
      'READY_FOR_REVIEW', 'DRAFT',
      '00000000-0000-4000-8000-000000009001',
      'De planning moet voor de acceptatietest worden aangepast.'
    );

    UPDATE "Assignment"
    SET "status" = 'READY_FOR_REVIEW', "version" = 5, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = '00000000-0000-4000-8000-000000009007';
    INSERT INTO "AssignmentStatusHistory" (
      "id", "assignmentId", "fromStatus", "toStatus", "changedByUserId", "reason"
    ) VALUES (
      '00000000-0000-4000-8000-000000009013',
      '00000000-0000-4000-8000-000000009007',
      'DRAFT', 'READY_FOR_REVIEW',
      '00000000-0000-4000-8000-000000009001',
      'De tijdelijke opdracht staat opnieuw gereed voor publicatiecontrole.'
    );
  `)

  await expectDatabaseFailure('OPEN zonder publicatiemetadata', () =>
    client.query(`
      UPDATE "Assignment"
      SET "status" = 'OPEN', "version" = 6, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = '00000000-0000-4000-8000-000000009007'
    `),
  )

  await expectDatabaseFailure('een publicatieversie zonder bijbehorende revisie', () =>
    client.query(`
      UPDATE "Assignment"
      SET
        "status" = 'OPEN',
        "version" = 6,
        "publishedAt" = '2026-07-14T10:00:00.000Z',
        "publishedByUserId" = '00000000-0000-4000-8000-000000009001',
        "publishedVersion" = 6,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = '00000000-0000-4000-8000-000000009007'
    `),
  )

  await expectTransactionRollback(client, 'een gedeeltelijke publicatiesnapshot', async () => {
    await client.query(`
      UPDATE "Assignment"
      SET "version" = 6, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = '00000000-0000-4000-8000-000000009007'
    `)
    await client.query(`
      INSERT INTO "AssignmentRevision" (
        "assignmentId", "version", "title", "description", "allowsRemoteWork", "changedByUserId"
      ) VALUES (
        '00000000-0000-4000-8000-000000009007',
        5,
        'Niet-toegestane rollbackrevisie',
        'Deze revisie gebruikt niet de actuele opdrachtversie.',
        false,
        '00000000-0000-4000-8000-000000009001'
      )
    `)
  })

  await expectDatabaseFailure('publicatiehistorie zonder bijbehorende publicatie', () =>
    client.query(`
      INSERT INTO "AssignmentStatusHistory" (
        "assignmentId", "fromStatus", "toStatus", "changedByUserId", "reason"
      ) VALUES (
        '00000000-0000-4000-8000-000000009007',
        'READY_FOR_REVIEW', 'OPEN',
        '00000000-0000-4000-8000-000000009001',
        'Deze historie heeft nog geen geldige publicatie.'
      )
    `),
  )

  await client.query(`
    BEGIN;

    UPDATE "Assignment"
    SET "version" = 6, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = '00000000-0000-4000-8000-000000009007';

    INSERT INTO "AssignmentRevision" (
      "id", "assignmentId", "version", "title", "description", "allowsRemoteWork", "changedByUserId"
    ) VALUES (
      '00000000-0000-4000-8000-000000009014',
      '00000000-0000-4000-8000-000000009007',
      6,
      'Aangepaste tijdelijke opdracht',
      'De inhoud is gecontroleerd en aangepast binnen Module 5B.3.',
      false,
      '00000000-0000-4000-8000-000000009001'
    );

    UPDATE "Assignment"
    SET
      "status" = 'OPEN',
      "publishedAt" = '2026-07-14T10:00:00.000Z',
      "publishedByUserId" = '00000000-0000-4000-8000-000000009001',
      "publishedVersion" = 6,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = '00000000-0000-4000-8000-000000009007';

    INSERT INTO "AssignmentStatusHistory" (
      "id", "assignmentId", "fromStatus", "toStatus", "changedByUserId", "reason", "createdAt"
    ) VALUES (
      '00000000-0000-4000-8000-000000009015',
      '00000000-0000-4000-8000-000000009007',
      'READY_FOR_REVIEW', 'OPEN',
      '00000000-0000-4000-8000-000000009001',
      'Opdracht gepubliceerd en gereed voor toekomstige marktverwerking.',
      '2026-07-14T10:00:00.000Z'
    );

    COMMIT;
  `)

  await expectDatabaseFailure('inhoudswijziging na publicatie', () =>
    client.query(`
      UPDATE "Assignment"
      SET "title" = 'Niet toegestaan na publicatie', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = '00000000-0000-4000-8000-000000009007'
    `),
  )

  await expectDatabaseFailure('wijziging van publicatiemetadata', () =>
    client.query(`
      UPDATE "Assignment"
      SET "publishedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = '00000000-0000-4000-8000-000000009007'
    `),
  )

  await expectDatabaseFailure('dubbele publicatiehistorie', () =>
    client.query(`
      INSERT INTO "AssignmentStatusHistory" (
        "assignmentId", "fromStatus", "toStatus", "changedByUserId", "reason"
      ) VALUES (
        '00000000-0000-4000-8000-000000009007',
        'READY_FOR_REVIEW', 'OPEN',
        '00000000-0000-4000-8000-000000009001',
        'Deze tweede publicatiehistorie is niet toegestaan.'
      )
    `),
  )

  await client.query(`
    UPDATE "Assignment"
    SET "status" = 'CANCELLED', "version" = 7, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = '00000000-0000-4000-8000-000000009007';

    INSERT INTO "AssignmentStatusHistory" (
      "id", "assignmentId", "fromStatus", "toStatus", "changedByUserId", "reason"
    ) VALUES (
      '00000000-0000-4000-8000-000000009016',
      '00000000-0000-4000-8000-000000009007',
      'OPEN', 'CANCELLED',
      '00000000-0000-4000-8000-000000009001',
      'De tijdelijke publicatie wordt na de integriteitscontrole ingetrokken.'
    )
  `)

  await expectDatabaseFailure('herpublicatie van een ingetrokken opdracht', () =>
    client.query(`
      UPDATE "Assignment"
      SET "status" = 'OPEN', "version" = 8, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = '00000000-0000-4000-8000-000000009007'
    `),
  )

  await expectDatabaseFailure('dubbele intrekkingshistorie', () =>
    client.query(`
      INSERT INTO "AssignmentStatusHistory" (
        "assignmentId", "fromStatus", "toStatus", "changedByUserId", "reason"
      ) VALUES (
        '00000000-0000-4000-8000-000000009007',
        'OPEN', 'CANCELLED',
        '00000000-0000-4000-8000-000000009001',
        'Deze tweede intrekkingshistorie is niet toegestaan.'
      )
    `),
  )

  const module5c2State = await client.query<{
    assignment_status: string
    assignment_version: number
    intake_status: string
    revisions: number
    status_history: number
    publication_history: number
    withdrawal_history: number
    published_by_user_id: string
    published_version: number
    snapshot_title: string
  }>(`
    SELECT
      a."status"::text AS assignment_status,
      a."version" AS assignment_version,
      i."status"::text AS intake_status,
      (SELECT COUNT(*)::int FROM "AssignmentRevision" r WHERE r."assignmentId" = a."id") AS revisions,
      (SELECT COUNT(*)::int FROM "AssignmentStatusHistory" h WHERE h."assignmentId" = a."id") AS status_history,
      (SELECT COUNT(*)::int FROM "AssignmentStatusHistory" h WHERE h."assignmentId" = a."id" AND h."toStatus" = 'OPEN') AS publication_history,
      (SELECT COUNT(*)::int FROM "AssignmentStatusHistory" h WHERE h."assignmentId" = a."id" AND h."fromStatus" = 'OPEN' AND h."toStatus" = 'CANCELLED') AS withdrawal_history,
      a."publishedByUserId"::text AS published_by_user_id,
      a."publishedVersion" AS published_version,
      r."title" AS snapshot_title
    FROM "Assignment" a
    JOIN "Intake" i ON i."id" = a."intakeId"
    JOIN "AssignmentRevision" r
      ON r."assignmentId" = a."id" AND r."version" = a."publishedVersion"
    WHERE a."id" = '00000000-0000-4000-8000-000000009007'
  `)

  assert.deepEqual(module5c2State.rows[0], {
    assignment_status: 'CANCELLED',
    assignment_version: 7,
    intake_status: 'CONVERTED',
    revisions: 3,
    status_history: 6,
    publication_history: 1,
    withdrawal_history: 1,
    published_by_user_id: '00000000-0000-4000-8000-000000009001',
    published_version: 6,
    snapshot_title: 'Aangepaste tijdelijke opdracht',
  })
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
    console.info('Database-integriteit Module 5A.1, Module 5B.2, Module 5B.3 en Module 5C.2: geslaagd.')
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
