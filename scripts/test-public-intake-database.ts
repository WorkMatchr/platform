import 'dotenv/config'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { Client } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')

const sourceUrl = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) {
  throw new Error('De publieke-intaketest mag uitsluitend tegen lokale PostgreSQL draaien.')
}

const testDatabaseName = `workmatchr_public_intake_test_${process.pid}_${Date.now()}`
if (!/^workmatchr_public_intake_test_[0-9_]+$/.test(testDatabaseName)) {
  throw new Error('Ongeldige tijdelijke databasenaam.')
}

const adminUrl = new URL(sourceUrl)
adminUrl.pathname = '/postgres'
adminUrl.searchParams.delete('schema')
const testUrl = new URL(sourceUrl)
testUrl.pathname = `/${testDatabaseName}`
testUrl.searchParams.set('schema', 'public')

const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar de actieve npm-CLI ontbreekt.')

function deployMigrations() {
  const result = spawnSync(process.execPath, [npmExecPath!, 'run', 'db:deploy'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    encoding: 'utf8',
    stdio: 'pipe',
  })
  if (result.status !== 0) {
    throw new Error(`Migraties mislukt:\n${result.stdout ?? ''}\n${result.stderr ?? ''}`)
  }
}

async function expectServiceError(
  action: () => Promise<unknown>,
  expectedCode: string,
): Promise<void> {
  let code: string | undefined
  try {
    await action()
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) code = String(error.code)
  }
  assert.equal(code, expectedCode)
}

async function main() {
  const admin = new Client({ connectionString: adminUrl.toString() })
  await admin.connect()
  let prisma: Awaited<ReturnType<typeof import('../src/lib/prisma').getPrisma>> | undefined

  try {
    await admin.query(`CREATE DATABASE "${testDatabaseName}"`)
    deployMigrations()
    process.env.DATABASE_URL = testUrl.toString()
    Reflect.set(process.env, 'NODE_ENV', 'test')
    process.env.BETTER_AUTH_SECRET = 'database-test-secret-with-at-least-thirty-two-characters'

    const services = await import('../src/lib/public-intake/public-intake-service')
    const abuseProtection = await import(
      '../src/lib/public-intake/public-intake-abuse-protection'
    )
    const classificationCache = await import(
      '../src/lib/ai-intake-classifier/ai-classification-cache'
    )
    const tokens = await import('../src/lib/public-intake/public-intake-token')
    const prismaModule = await import('../src/lib/prisma')
    prisma = prismaModule.getPrisma()

    const abuseContext = {
      requestHeaders: new Headers({ 'x-forwarded-for': '203.0.113.77' }),
      sessionToken: 'database-test-public-intake-session',
    }
    const abuseAt = new Date('2026-08-20T00:00:00.000Z')
    await abuseProtection.assertPublicIntakeRequestAllowed(abuseContext, { at: abuseAt })
    for (let attempt = 0; attempt < 3; attempt += 1) {
      assert.deepEqual(
        await abuseProtection.allowPublicIntakeAIClassification(abuseContext, { at: abuseAt }),
        { allowed: true },
      )
    }
    const bucketCountBeforeBlockedAttempt = await prisma.publicIntakeAbuseBucket.aggregate({
      _sum: { requestCount: true },
      _count: true,
    })
    assert.deepEqual(
      await abuseProtection.allowPublicIntakeAIClassification(abuseContext, { at: abuseAt }),
      { allowed: false, reason: 'RATE_LIMITED' },
    )
    assert.deepEqual(
      await prisma.publicIntakeAbuseBucket.aggregate({
        _sum: { requestCount: true },
        _count: true,
      }),
      bucketCountBeforeBlockedAttempt,
      'Een geweigerde meervoudige limietconsumptie moet volledig terugrollen.',
    )
    const storedAbuseBuckets = await prisma.publicIntakeAbuseBucket.findMany()
    assert.ok(storedAbuseBuckets.length > 0)
    assert.equal(
      storedAbuseBuckets.some((bucket) =>
        bucket.subjectHash.includes('203.0.113.77') ||
        bucket.subjectHash.includes('database-test-public-intake-session')
      ),
      false,
      'Ruwe IP- en sessiewaarden mogen niet worden opgeslagen.',
    )
    const midnightAIBuckets = await prisma.publicIntakeAbuseBucket.groupBy({
      by: ['subjectType'],
      where: { operation: 'AI_CLASSIFICATION' },
      _count: { _all: true },
    })
    assert.deepEqual(
      midnightAIBuckets
        .map((bucket) => [bucket.subjectType, bucket._count._all])
        .sort(([left], [right]) => String(left).localeCompare(String(right))),
      [['GLOBAL', 2], ['IP', 2], ['SESSION', 2]],
      'Ieder subject moet om 00:00 UTC een aparte burst- en dagbucket behouden.',
    )
    const midnightAIWindows = await prisma.publicIntakeAbuseBucket.findMany({
      where: { operation: 'AI_CLASSIFICATION' },
      select: { windowStartedAt: true, windowEndsAt: true },
      distinct: ['windowStartedAt', 'windowEndsAt'],
      orderBy: { windowEndsAt: 'asc' },
    })
    assert.deepEqual(
      midnightAIWindows.map((bucket) => [
        bucket.windowStartedAt.toISOString(),
        bucket.windowEndsAt.toISOString(),
      ]),
      [
        ['2026-08-20T00:00:00.000Z', '2026-08-20T00:10:00.000Z'],
        ['2026-08-20T00:00:00.000Z', '2026-08-21T00:00:00.000Z'],
      ],
    )

    const startedAt = new Date()
    const afterMinutes = (minutes: number) =>
      new Date(startedAt.getTime() + minutes * 60 * 1000)
    const created = await services.createPublicIntakeDraft(
      {
        entryPoint: 'FREE_TEXT',
        originalInput: 'Wij willen onze bestaande RI&E voor de werkplaats laten actualiseren.',
      },
      { at: startedAt },
    )
    const second = await services.createPublicIntakeDraft(
      { entryPoint: 'RECOGNIZABLE_REQUEST', selectedRequestKey: 'rie_needed' },
      { at: startedAt },
    )

    const tokenHash = tokens.hashPublicIntakeToken(created.sessionToken)
    const storedSession = await prisma.publicIntakeSession.findUniqueOrThrow({
      where: { tokenHash },
      include: { draft: true },
    })
    assert.equal(storedSession.tokenHash, tokenHash)
    assert.notEqual(storedSession.tokenHash, created.sessionToken)
    assert.equal(storedSession.tokenHash.length, 64)
    assert.equal(JSON.stringify(created.draft).includes(created.sessionToken), false)
    assert.equal(JSON.stringify(created.draft).includes(tokenHash), false)
    assert.equal(storedSession.draft.originalInput, created.draft.originalInput)

    const classificationFingerprint =
      classificationCache.createAIClassificationFingerprint(
        storedSession.draft.originalInput!,
        'database-test-classifier/1',
        'database-test-model/1',
      )
    assert.equal(
      await classificationCache.prismaAIClassificationCacheRepository.claim({
        inputFingerprint: classificationFingerprint,
        classifierVersion: 'database-test-classifier/1',
        provider: 'test-provider',
        model: 'database-test-model/1',
      }),
      true,
    )
    assert.equal(
      await classificationCache.prismaAIClassificationCacheRepository.claim({
        inputFingerprint: classificationFingerprint,
        classifierVersion: 'database-test-classifier/1',
        provider: 'test-provider',
        model: 'database-test-model/1',
      }),
      false,
      'De unieke fingerprint mag maar één externe classificatieclaim toelaten.',
    )
    await classificationCache.prismaAIClassificationCacheRepository.complete(
      classificationFingerprint,
      {
        classification: {
          summary: 'De ondernemer vraagt naar een RI&E.',
          primarySubject: 'RIE',
          secondarySubjects: [],
          confidence: 'HIGH',
          alternatives: [],
        },
        fallbackUsed: false,
        fallbackReason: null,
        providerStatusCode: null,
      },
    )
    const cachedClassification =
      await classificationCache.prismaAIClassificationCacheRepository.find(
        classificationFingerprint,
      )
    assert.equal(cachedClassification?.status, 'COMPLETED')
    assert.equal(
      (
        cachedClassification?.classificationJson as {
          summary?: string
        } | null
      )?.summary,
      'De ondernemer vraagt naar een RI&E.',
    )
    assert.equal(
      JSON.stringify(cachedClassification).includes(
        storedSession.draft.originalInput!,
      ),
      false,
      'De classificatiecache mag de vrije hulpvraag niet opslaan.',
    )

    await expectServiceError(
      () => services.getPublicIntakeDraftForSession('niet-geldig'),
      'ACCESS_DENIED',
    )
    const resumed = await services.resumePublicIntakeDraft(created.sessionToken, {
      at: afterMinutes(20),
    })
    assert.equal(resumed.entryPoint, 'FREE_TEXT')
    await services.resumePublicIntakeDraft(created.sessionToken, {
      at: afterMinutes(21),
    })
    const resumeEvents = await prisma.publicIntakeEvent.count({
      where: { draftId: storedSession.draftId, type: 'DRAFT_RESUMED' },
    })
    assert.equal(resumeEvents, 1, 'Een gewone herhaalde read mag geen resume-eventspam maken.')

    await services.recordPublicIntakeAnswer(
      created.sessionToken,
      {
        questionKey: 'guidance_topic',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: 'HAZARDOUS_SUBSTANCES',
      },
      { at: afterMinutes(21), answerSource: 'AI_CONFIRMED' },
    )
    const revisedTopic = await services.recordPublicIntakeAnswer(
      created.sessionToken,
      {
        questionKey: 'guidance_topic',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: 'INCIDENT',
      },
      { at: afterMinutes(21), answerSource: 'USER_CORRECTED' },
    )
    assert.equal(revisedTopic.guidance.contract.situation.code, 'INCIDENT')
    const resumedTopic = await services.resumePublicIntakeDraft(
      created.sessionToken,
      { at: afterMinutes(21) },
    )
    assert.equal(resumedTopic.guidance.contract.situation.code, 'INCIDENT')
    const topicAnswer = await prisma.publicIntakeAnswer.findUniqueOrThrow({
      where: {
        draftId_questionKey: {
          draftId: storedSession.draftId,
          questionKey: 'guidance_topic',
        },
      },
      include: { revisions: { orderBy: { revisionNumber: 'asc' } } },
    })
    assert.deepEqual(
      topicAnswer.revisions.map((revision) => [
        revision.revisionNumber,
        revision.optionValue,
        revision.source,
      ]),
      [
        [1, 'HAZARDOUS_SUBSTANCES', 'AI_CONFIRMED'],
        [2, 'INCIDENT', 'USER_CORRECTED'],
      ],
    )
    assert.equal(topicAnswer.source, 'USER_CORRECTED')

    const firstAnswer = await services.recordPublicIntakeAnswer(
      created.sessionToken,
      {
        questionKey: 'rie_existing_status',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: 'NEEDS_UPDATE',
      },
      { at: afterMinutes(22) },
    )
    assert.equal(firstAnswer.phase, 'CLARIFYING')
    await services.recordPublicIntakeAnswer(
      created.sessionToken,
      {
        questionKey: 'rie_existing_status',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: 'COMPLIANCE_UNCERTAIN',
      },
      { at: afterMinutes(23) },
    )
    await services.recordPublicIntakeAnswer(
      created.sessionToken,
      {
        questionKey: 'sector',
        questionVersion: 1,
        disposition: 'UNKNOWN',
      },
      { at: afterMinutes(24) },
    )
    await services.recordPublicIntakeAnswer(
      created.sessionToken,
      {
        questionKey: 'sector',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: 'Metaalbewerking',
      },
      { at: afterMinutes(25) },
    )

    const rieAnswer = await prisma.publicIntakeAnswer.findUniqueOrThrow({
      where: {
        draftId_questionKey: {
          draftId: storedSession.draftId,
          questionKey: 'rie_existing_status',
        },
      },
      include: { revisions: { orderBy: { revisionNumber: 'asc' } } },
    })
    assert.equal(rieAnswer.version, 2)
    assert.deepEqual(
      rieAnswer.revisions.map((revision) => [revision.revisionNumber, revision.optionValue]),
      [
        [1, 'NEEDS_UPDATE'],
        [2, 'COMPLIANCE_UNCERTAIN'],
      ],
    )
    const sectorRevisions = await prisma.publicIntakeAnswerRevision.findMany({
      where: { draftId: storedSession.draftId, questionKey: 'sector' },
      orderBy: { revisionNumber: 'asc' },
    })
    assert.deepEqual(
      sectorRevisions.map((revision) => [revision.revisionNumber, revision.disposition, revision.textValue]),
      [
        [1, 'UNKNOWN', null],
        [2, 'ANSWERED', 'Metaalbewerking'],
      ],
    )

    const race = await Promise.allSettled([
      services.recordPublicIntakeAnswer(created.sessionToken, {
        questionKey: 'location_count',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: 2,
      }),
      services.recordPublicIntakeAnswer(created.sessionToken, {
        questionKey: 'location_count',
        questionVersion: 1,
        disposition: 'ANSWERED',
        value: 3,
      }),
    ])
    assert.ok(race.some((result) => result.status === 'fulfilled'))
    const concurrentAnswer = await prisma.publicIntakeAnswer.findUniqueOrThrow({
      where: {
        draftId_questionKey: {
          draftId: storedSession.draftId,
          questionKey: 'location_count',
        },
      },
      include: { revisions: { orderBy: { revisionNumber: 'asc' } } },
    })
    assert.deepEqual(
      concurrentAnswer.revisions.map((revision) => revision.revisionNumber),
      Array.from({ length: concurrentAnswer.revisions.length }, (_, index) => index + 1),
    )
    assert.equal(concurrentAnswer.version, concurrentAnswer.revisions.length)

    const summary = await services.changePublicIntakePhase(
      created.sessionToken,
      'SUMMARY_PRESENTED',
    )
    assert.equal(summary.phase, 'SUMMARY_PRESENTED')
    await expectServiceError(
      () => services.changePublicIntakePhase(created.sessionToken, 'SUBMITTED'),
      'INVALID_PHASE',
    )

    await assert.rejects(
      prisma.publicIntakeAnswerRevision.update({
        where: { id: rieAnswer.revisions[0]!.id },
        data: { optionValue: 'NONE' },
      }),
    )
    await assert.rejects(
      prisma.publicIntakeEvent.delete({
        where: {
          id: (
            await prisma.publicIntakeEvent.findFirstOrThrow({
              where: { draftId: storedSession.draftId },
            })
          ).id,
        },
      }),
    )

    const safeEvents = await prisma.publicIntakeEvent.findMany({
      where: { draftId: storedSession.draftId },
    })
    const serializedEvents = JSON.stringify(safeEvents)
    assert.equal(serializedEvents.includes(created.sessionToken), false)
    assert.equal(serializedEvents.includes(tokenHash), false)
    assert.equal(serializedEvents.includes(storedSession.draft.originalInput!), false)

    const secondView = await services.getPublicIntakeDraftForSession(second.sessionToken)
    assert.equal(secondView.entryPoint, 'RECOGNIZABLE_REQUEST')
    assert.notEqual(tokens.hashPublicIntakeToken(second.sessionToken), tokenHash)

    const answerCountBeforeAbandonment = await prisma.publicIntakeAnswer.count({
      where: { draftId: storedSession.draftId },
    })
    const revisionCountBeforeAbandonment = await prisma.publicIntakeAnswerRevision.count({
      where: { draftId: storedSession.draftId },
    })
    const eventsBeforeAbandonment = await prisma.publicIntakeEvent.count({
      where: { draftId: storedSession.draftId },
    })
    const abandonmentRace = await Promise.all([
      services.abandonPublicIntakeDraftByUser(created.sessionToken, {
        at: afterMinutes(30),
      }),
      services.abandonPublicIntakeDraftByUser(created.sessionToken, {
        at: afterMinutes(30),
      }),
    ])
    assert.ok(
      abandonmentRace.every((result) =>
        ['ABANDONED', 'ALREADY_ABANDONED'].includes(result.outcome),
      ),
    )

    const abandonedSession = await prisma.publicIntakeSession.findUniqueOrThrow({
      where: { tokenHash },
      include: { draft: true },
    })
    assert.equal(abandonedSession.draft.phase, 'ABANDONED_BY_USER')
    assert.ok(abandonedSession.revokedAt)
    assert.equal(
      await prisma.publicIntakeEvent.count({
        where: {
          draftId: storedSession.draftId,
          type: 'DRAFT_ABANDONED_BY_USER',
        },
      }),
      1,
    )
    const abandonmentEvent = await prisma.publicIntakeEvent.findFirstOrThrow({
      where: {
        draftId: storedSession.draftId,
        type: 'DRAFT_ABANDONED_BY_USER',
      },
    })
    assert.equal(abandonmentEvent.fromPhase, 'SUMMARY_PRESENTED')
    assert.equal(abandonmentEvent.toPhase, 'ABANDONED_BY_USER')
    assert.equal(abandonmentEvent.detailCode, 'USER_REQUEST')
    assert.equal(
      await prisma.publicIntakeAnswer.count({
        where: { draftId: storedSession.draftId },
      }),
      answerCountBeforeAbandonment,
    )
    assert.equal(
      await prisma.publicIntakeAnswerRevision.count({
        where: { draftId: storedSession.draftId },
      }),
      revisionCountBeforeAbandonment,
    )
    assert.equal(
      await prisma.publicIntakeEvent.count({
        where: { draftId: storedSession.draftId },
      }),
      eventsBeforeAbandonment + 1,
    )
    await expectServiceError(
      () => services.resumePublicIntakeDraft(created.sessionToken),
      'ACCESS_DENIED',
    )
    await expectServiceError(
      () =>
        services.recordPublicIntakeAnswer(created.sessionToken, {
          questionKey: 'location_count',
          questionVersion: 1,
          disposition: 'ANSWERED',
          value: 4,
        }),
      'ACCESS_DENIED',
    )
    assert.equal(
      (await services.getPublicIntakeDraftForSession(second.sessionToken)).phase,
      secondView.phase,
      'Het beëindigen van draft A mag draft B niet wijzigen.',
    )

    const expiredStart = new Date()
    const expired = await services.createPublicIntakeDraft(
      { entryPoint: 'RECOGNIZABLE_REQUEST', selectedRequestKey: 'rie_needed' },
      { at: expiredStart },
    )
    await expectServiceError(
      () =>
        services.resumePublicIntakeDraft(expired.sessionToken, {
          at: new Date(expiredStart.getTime() + 90 * 24 * 60 * 60 * 1000),
        }),
      'ACCESS_DENIED',
    )
    await expectServiceError(
      () =>
        services.resumePublicIntakeDraft(expired.sessionToken, {
          at: new Date(expiredStart.getTime() + 91 * 24 * 60 * 60 * 1000),
        }),
      'ACCESS_DENIED',
    )
    const expiredDraft = await prisma.publicIntakeSession.findUniqueOrThrow({
      where: { tokenHash: tokens.hashPublicIntakeToken(expired.sessionToken) },
      select: { draftId: true },
    })
    assert.equal(
      await prisma.publicIntakeEvent.count({
        where: { draftId: expiredDraft.draftId, type: 'DRAFT_EXPIRED_ACCESS_REJECTED' },
      }),
      1,
    )

    const counts = await prisma.$queryRaw<Array<{ users: number; organizations: number; memberships: number }>>`
      SELECT
        (SELECT COUNT(*)::int FROM "User") AS users,
        (SELECT COUNT(*)::int FROM "Organization") AS organizations,
        (SELECT COUNT(*)::int FROM "OrganizationMembership") AS memberships
    `
    assert.deepEqual(counts[0], { users: 0, organizations: 0, memberships: 0 })

    console.info(
      'Database-integriteit publieke conceptintake: abusebegrenzing, tokens, revisies, events, bewuste beëindiging, lifecycle, concurrency en tenantafwezigheid geslaagd.',
    )
  } finally {
    if (prisma) await prisma.$disconnect()
    await admin.query(`DROP DATABASE IF EXISTS "${testDatabaseName}" WITH (FORCE)`)
    await admin.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Onbekende publieke-intaketestfout.')
  process.exitCode = 1
})
