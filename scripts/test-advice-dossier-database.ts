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
  throw new Error(
    'De Adviesdossiertest mag uitsluitend tegen lokale PostgreSQL draaien.',
  )
}

const testDatabaseName = `workmatchr_advice_dossier_test_${process.pid}_${Date.now()}`
if (!/^workmatchr_advice_dossier_test_[0-9_]+$/.test(testDatabaseName)) {
  throw new Error('Ongeldige tijdelijke databasenaam.')
}

const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')
const testUrl = new URL(sourceUrl)
testUrl.pathname = `/${testDatabaseName}`
testUrl.searchParams.set('schema', 'public')
const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar de npm-CLI ontbreekt.')

function deployMigrations() {
  const result = spawnSync(
    process.execPath,
    [npmExecPath!, 'run', 'db:deploy'],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: testUrl.toString() },
      encoding: 'utf8',
      stdio: 'pipe',
    },
  )
  if (result.status !== 0) {
    throw new Error(
      `Migraties mislukt:\n${result.stdout ?? ''}\n${result.stderr ?? ''}`,
    )
  }
}

async function expectDossierError(
  action: () => Promise<unknown>,
  expectedCode: string,
) {
  let code: string | undefined
  try {
    await action()
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      code = String(error.code)
    }
  }
  assert.equal(code, expectedCode)
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  let prisma:
    | Awaited<
        ReturnType<typeof import('../src/lib/prisma').getPrisma>
      >
    | undefined

  try {
    await admin.query(`CREATE DATABASE "${testDatabaseName}"`)
    deployMigrations()
    process.env.DATABASE_URL = testUrl.toString()

    const intake = await import(
      '../src/lib/public-intake/public-intake-service'
    )
    const dossiers = await import(
      '../src/lib/advice-dossiers/advice-dossier-service'
    )
    const prismaModule = await import('../src/lib/prisma')
    prisma = prismaModule.getPrisma()

    const owner = await prisma.user.create({
      data: {
        email: 'm7c-owner@example.invalid',
        displayName: 'M7C eigenaar',
        emailVerified: true,
        status: 'ACTIVE',
      },
    })
    const organization = await prisma.organization.create({
      data: {
        name: 'TEST-WM-M7C Opdrachtgever',
        organizationType: 'CLIENT',
        status: 'ACTIVE',
      },
    })
    await prisma.organizationMembership.create({
      data: {
        userId: owner.id,
        organizationId: organization.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    })
    const otherUser = await prisma.user.create({
      data: {
        email: 'm7c-other@example.invalid',
        displayName: 'Andere gebruiker',
        emailVerified: true,
        status: 'ACTIVE',
      },
    })
    const otherOrganization = await prisma.organization.create({
      data: {
        name: 'TEST-WM-M7C Andere opdrachtgever',
        organizationType: 'CLIENT',
        status: 'ACTIVE',
      },
    })
    await prisma.organizationMembership.create({
      data: {
        userId: otherUser.id,
        organizationId: otherOrganization.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    })
    const providerUser = await prisma.user.create({
      data: {
        email: 'm7c-provider@example.invalid',
        displayName: 'Dienstverlener',
        emailVerified: true,
        status: 'ACTIVE',
      },
    })
    const providerOrganization = await prisma.organization.create({
      data: {
        name: 'TEST-WM-M7C Dienstverlener',
        organizationType: 'PROVIDER',
        status: 'ACTIVE',
      },
    })
    await prisma.organizationMembership.create({
      data: {
        userId: providerUser.id,
        organizationId: providerOrganization.id,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    })

    const anonymous = await intake.createPublicIntakeDraft({
      entryPoint: 'RECOGNIZABLE_REQUEST',
      selectedRequestKey: 'rie_needed',
    })
    await intake.recordPublicIntakeAnswer(anonymous.sessionToken, {
      questionKey: 'rie_has_employees',
      questionVersion: 1,
      disposition: 'ANSWERED',
      value: true,
    })
    assert.equal(
      await prisma.adviceDossier.count(),
      0,
      'Een afgeronde anonieme intake mag geen onbeheerd dossier maken.',
    )

    const created = await intake.createPublicIntakeDraft({
      entryPoint: 'RECOGNIZABLE_REQUEST',
      selectedRequestKey: 'rie_needed',
    })
    const completedDraft = await intake.recordPublicIntakeAnswer(
      created.sessionToken,
      {
        questionKey: 'rie_has_employees',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: true,
      },
    )
    assert.equal(
      completedDraft.guidance.completion.status,
      'COMPLETED_WITH_GUIDANCE',
    )

    const creationRace = await Promise.all(
      Array.from({ length: 6 }, () =>
        dossiers.ensureAdviceDossierForCompletedPublicIntake({
          draft: completedDraft,
          ownerUserId: owner.id,
          organizationId: organization.id,
          at: new Date('2026-07-29T12:00:00Z'),
        }),
      ),
    )
    assert.equal(new Set(creationRace.map((item) => item.id)).size, 1)
    assert.equal(
      await prisma.adviceDossier.count({
        where: { sourcePublicIntakeDraftId: completedDraft.id },
      }),
      1,
    )
    assert.equal(
      await prisma.adviceDossierVersion.count({
        where: { sourcePublicIntakeDraftId: completedDraft.id },
      }),
      1,
    )
    const dossierId = creationRace[0]!.id
    const first = await prisma.adviceDossier.findUniqueOrThrow({
      where: { id: dossierId },
      include: { versions: true, events: true },
    })
    assert.match(first.dossierCode, /^WM-2026-\d{6}$/)
    assert.equal(first.versions.length, 1)
    assert.deepEqual(
      first.versions[0]!.adviceReasons,
      completedDraft.guidance.outcome!.professionalAdvice.adviceReasons,
    )
    assert.equal(
      first.events.filter((event) => event.type === 'DOSSIER_CREATED')
        .length,
      1,
    )

    const secondCreated = await intake.createPublicIntakeDraft({
      entryPoint: 'RECOGNIZABLE_REQUEST',
      selectedRequestKey: 'rie_needed',
    })
    const secondCompleted = await intake.recordPublicIntakeAnswer(
      secondCreated.sessionToken,
      {
        questionKey: 'rie_has_employees',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: true,
      },
    )
    const secondDossier =
      await dossiers.ensureAdviceDossierForCompletedPublicIntake({
        draft: secondCompleted,
        ownerUserId: owner.id,
        organizationId: organization.id,
        at: new Date('2026-07-29T12:00:01Z'),
      })
    assert.notEqual(first.dossierCode, secondDossier.dossierCode)

    const originalBhvHelpRequest =
      'Wij willen weten of een oud EHBO-diploma voldoende is voor onze huidige BHV-organisatie.'
    const confirmedBhvSummary =
      'U wilt weten of uw oude EHBO-diploma voldoende is voor een actuele en doeltreffende BHV-organisatie.'
    const freeTextCreated = await intake.createPublicIntakeDraft({
      entryPoint: 'FREE_TEXT',
      originalInput: originalBhvHelpRequest,
    })
    const freeTextCompleted = await intake.recordPublicIntakeAnswer(
      freeTextCreated.sessionToken,
      {
        questionKey: 'guidance_topic',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: 'EMERGENCY_RESPONSE',
      },
      { answerSource: 'AI_CONFIRMED' },
    )
    const enrichedFreeTextDraft = {
      ...freeTextCompleted,
      aiClassification: {
        summary: confirmedBhvSummary,
        primarySubject: 'EMERGENCY_RESPONSE' as const,
        secondarySubjects: [],
        confidence: 'HIGH' as const,
        alternatives: [],
      },
    }
    const freeTextDossier =
      await dossiers.ensureAdviceDossierForCompletedPublicIntake({
        draft: enrichedFreeTextDraft,
        ownerUserId: owner.id,
        organizationId: organization.id,
        at: new Date('2026-07-29T12:00:02Z'),
      })
    const freeTextVersion =
      await prisma.adviceDossierVersion.findFirstOrThrow({
        where: { adviceDossierId: freeTextDossier.id },
      })
    assert.equal(
      freeTextVersion.originalHelpRequest,
      originalBhvHelpRequest,
    )
    assert.equal(freeTextVersion.situationSummary, confirmedBhvSummary)
    assert.notEqual(
      freeTextVersion.originalHelpRequest,
      freeTextVersion.situationSummary,
    )

    const repeatedFreeTextDossier =
      await dossiers.ensureAdviceDossierForCompletedPublicIntake({
        draft: {
          ...enrichedFreeTextDraft,
          aiClassification: {
            ...enrichedFreeTextDraft.aiClassification,
            summary:
              'Deze latere waarde mag de immutable eerste versie niet overschrijven.',
          },
        },
        ownerUserId: owner.id,
        organizationId: organization.id,
        at: new Date('2026-07-29T12:00:03Z'),
      })
    assert.equal(repeatedFreeTextDossier.id, freeTextDossier.id)
    assert.equal(
      await prisma.adviceDossierVersion.count({
        where: { adviceDossierId: freeTextDossier.id },
      }),
      1,
    )
    assert.equal(
      (
        await prisma.adviceDossierVersion.findUniqueOrThrow({
          where: { id: freeTextVersion.id },
        })
      ).situationSummary,
      confirmedBhvSummary,
    )

    const ownerViewer = {
      userId: owner.id,
      organizationId: organization.id,
      organizationRole: 'OWNER' as const,
    }
    const stored = await dossiers.getAdviceDossier(
      ownerViewer,
      dossierId,
    )
    assert.equal(stored.currentVersion.versionNumber, 1)
    assert.equal(
      stored.currentVersion.snapshot.disclaimer,
      completedDraft.guidance.outcome!.professionalAdvice.disclaimer,
    )

    await expectDossierError(
      () =>
        dossiers.getAdviceDossier(
          {
            userId: otherUser.id,
            organizationId: otherOrganization.id,
            organizationRole: 'OWNER',
          },
          dossierId,
        ),
      'NOT_FOUND',
    )
    await expectDossierError(
      () =>
        dossiers.getAdviceDossier(
          {
            userId: providerUser.id,
            organizationId: providerOrganization.id,
            organizationRole: 'OWNER',
          },
          dossierId,
        ),
      'NOT_FOUND',
    )

    const revisedDraft = await intake.recordPublicIntakeAnswer(
      created.sessionToken,
      {
        questionKey: 'rie_has_employees',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: false,
      },
    )
    const secondVersion = await dossiers.appendAdviceDossierVersion({
      viewer: ownerViewer,
      dossierId,
      draft: revisedDraft,
    })
    assert.equal(secondVersion.versionNumber, 2)
    assert.equal(
      (
        await dossiers.appendAdviceDossierVersion({
          viewer: ownerViewer,
          dossierId,
          draft: revisedDraft,
        })
      ).id,
      secondVersion.id,
      'Dezelfde herbeoordeling moet idempotent dezelfde versie opleveren.',
    )
    assert.equal(
      await prisma.adviceDossierVersion.count({
        where: { adviceDossierId: dossierId },
      }),
      2,
    )
    await assert.rejects(
      prisma.adviceDossierVersion.update({
        where: { id: first.versions[0]!.id },
        data: { adviceTitle: 'Mag niet wijzigen' },
      }),
    )
    await assert.rejects(
      prisma.adviceDossierEvent.delete({
        where: { id: first.events[0]!.id },
      }),
    )

    await dossiers.recordAdviceDossierPdfDownload({
      viewer: ownerViewer,
      dossierId,
      versionNumber: 2,
    })
    assert.equal(
      await prisma.adviceDossierEvent.count({
        where: { adviceDossierId: dossierId, type: 'PDF_DOWNLOADED' },
      }),
      1,
    )
    await dossiers.changeAdviceDossierStatus({
      viewer: ownerViewer,
      dossierId,
      toStatus: 'COMPLETED',
    })
    const completedDossier =
      await prisma.adviceDossier.findUniqueOrThrow({
        where: { id: dossierId },
      })
    assert.equal(completedDossier.status, 'COMPLETED')
    assert.ok(completedDossier.completedAt)

    assert.equal(
      await prisma.publicIntakeAIClassificationCache.count(),
      0,
      'Opslag, lezen en audit mogen geen extra AI-classificatie uitvoeren.',
    )

    console.info(
      'Database-integriteit Adviesdossiers: idempotentie, concurrency, unieke codes, immutable versies, audit en tenantisolatie geslaagd.',
    )
  } finally {
    if (prisma) await prisma.$disconnect()
    await admin.query(
      `DROP DATABASE IF EXISTS "${testDatabaseName}" WITH (FORCE)`,
    )
    await admin.end()
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Onbekende Adviesdossiertestfout.',
  )
  process.exitCode = 1
})
