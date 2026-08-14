import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const source = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(source.hostname)) throw new Error('De migratietest mag uitsluitend lokaal draaien.')

const databaseName = `workmatchr_knowledge_migration_${process.pid}_${Date.now()}`
if (!/^workmatchr_knowledge_migration_\d+_\d+$/.test(databaseName)) throw new Error('Onveilige tijdelijke databasenaam.')
const adminUrl = new URL(source)
adminUrl.pathname = '/postgres'
adminUrl.search = ''
const target = new URL(source)
target.pathname = `/${databaseName}`
target.searchParams.set('schema', 'public')

async function main() {
  const admin = new Pool({ connectionString: adminUrl.toString() })
  let genericFixtureRoot: string | null = null
  try {
    const stale = await admin.query<{ datname: string }>(`SELECT datname FROM pg_database WHERE datname LIKE 'workmatchr_knowledge_migration_%'`)
    for (const database of stale.rows) {
      if (!/^workmatchr_knowledge_migration_\d+_\d+$/.test(database.datname)) continue
      await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [database.datname])
      await admin.query(`DROP DATABASE "${database.datname}"`)
    }
    await admin.query(`CREATE DATABASE "${databaseName}"`)
    const migrate = spawnSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8' })
    if (migrate.status !== 0) throw new Error(`Migratieketen mislukt:\n${migrate.stdout ?? ''}\n${migrate.stderr ?? ''}\n${migrate.error?.message ?? ''}`)
    const constraints = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/test-knowledge-engine-database.ts'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8' })
    if (constraints.status !== 0) throw new Error(`Constrainttest mislukt:\n${constraints.stdout ?? ''}\n${constraints.stderr ?? ''}\n${constraints.error?.message ?? ''}`)
    if (existsSync('local-sources/knowledge/knowledge-sources.local.json')) {
      const rollbackPool = new Pool({ connectionString: target.toString() })
      await rollbackPool.query(`INSERT INTO "KnowledgeRole" ("id","code","title","description","createdAt","updatedAt") VALUES (gen_random_uuid(),'werkgever','Conflictrol','Rollbacktest',now(),now())`)
      const rejected = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/knowledge-import.ts', 'import', 'data/knowledge/poc/AI-01.v1.json', '--confirm'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8' })
      if (rejected.status === 0) throw new Error('De bewuste databaseconflictimport had moeten mislukken.')
      const rollbackCount = await rollbackPool.query<{ sources: string; claims: string }>(`SELECT (SELECT count(*)::text FROM "KnowledgeSource") sources, (SELECT count(*)::text FROM "KnowledgeClaim") claims`)
      if (rollbackCount.rows[0].sources !== '0' || rollbackCount.rows[0].claims !== '0') throw new Error('De mislukte import is niet volledig teruggerold.')
      await rollbackPool.query(`DELETE FROM "KnowledgeRole" WHERE "code"='werkgever'`)
      await rollbackPool.end()
      const localManifest = JSON.parse(await readFile('local-sources/knowledge/knowledge-sources.local.json', 'utf8')) as { sources?: Array<{ code?: string }> }
      const configuredCodes = new Set(localManifest.sources?.map((entry) => entry.code) ?? [])
      if (['AI-01', 'AI-02', 'AI-03', 'AI-04', 'AI-05'].every((code) => configuredCodes.has(code))) {
        for (const code of ['01', '02', '03', '04', '05']) {
          const imported = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/knowledge-import.ts', 'import', `data/knowledge/poc/AI-${code}.v1.json`, '--confirm'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8' })
          if (imported.status !== 0) throw new Error(`PoC-import AI-${code} mislukt:\n${imported.stdout ?? ''}\n${imported.stderr ?? ''}`)
        }
        const targetPool = new Pool({ connectionString: target.toString() })
        const counts = await targetPool.query<{ sources: string; claims: string; citations: string; tasks: string }>(`SELECT (SELECT count(*)::text FROM "KnowledgeSource") sources, (SELECT count(*)::text FROM "KnowledgeClaim") claims, (SELECT count(*)::text FROM "KnowledgeCitation") citations, (SELECT count(*)::text FROM "KnowledgeReviewTask") tasks`)
        await targetPool.end()
        const row = counts.rows[0]
        if (row.sources !== '5' || row.claims !== '40' || row.citations !== '40' || row.tasks !== '0') throw new Error(`Onverwachte PoC-tellingen: ${JSON.stringify(row)}`)
        const duplicate = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/knowledge-import.ts', 'import', 'data/knowledge/poc/AI-01.v1.json', '--confirm'], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: target.toString() }, encoding: 'utf8' })
        if (duplicate.status !== 0 || !`${duplicate.stdout}`.includes('"reused": true')) throw new Error('Een identieke tweede import is niet idempotent hergebruikt.')
        const replayPool = new Pool({ connectionString: target.toString() })
        const afterReplay = await replayPool.query<{ sources: string; claims: string; citations: string }>(`SELECT (SELECT count(*)::text FROM "KnowledgeSource") sources, (SELECT count(*)::text FROM "KnowledgeClaim") claims, (SELECT count(*)::text FROM "KnowledgeCitation") citations`)
        await replayPool.end()
        if (afterReplay.rows[0].sources !== '5' || afterReplay.rows[0].claims !== '40' || afterReplay.rows[0].citations !== '40') throw new Error('De idempotente herimport heeft dubbele kennisrecords gemaakt.')
      }
    }

    genericFixtureRoot = await mkdtemp(path.join(tmpdir(), 'workmatchr-generic-knowledge-'))
    const representativeSources = [
      ['GEN-AI', 'AI_SHEET', 'AI_SHEET', 'ai-bladen/AI-blad.pdf'],
      ['GEN-ARWOWET', 'ARBO_WET', 'LEGISLATION', 'legislation/arbowet/Arbowet.pdf'],
      ['GEN-ARBOBESLUIT', 'ARBO_DECREE', 'REGULATION', 'legislation/arbobesluit/Arbobesluit.pdf'],
      ['GEN-ARBOREGELING', 'ARBO_REGULATION', 'REGULATION', 'legislation/arboregeling/Arboregeling.pdf'],
      ['GEN-ARBOCAT', 'ARBOCATALOGUE', 'ARBOCATALOGUE', 'arbocatalogi/Arbocatalogus Bouw.pdf'],
      ['GEN-BELEID', 'POLICY_RULE', 'REGULATION', 'beleidsregels/Beleidsregel.pdf'],
      ['GEN-NLA', 'LABOUR_INSPECTORATE_PUBLICATION', 'INSPECTORATE_GUIDANCE', 'inspectie/Nederlandse Arbeidsinspectie.pdf'],
      ['GEN-TNO', 'TNO_PUBLICATION', 'RESEARCH', 'tno/TNO rapport.pdf'],
    ] as const
    const manifestSources = []
    const packageFiles: string[] = []
    let representativePackage: Record<string, unknown> | null = null
    for (const [code, sourceKind, sourceType, logicalPath] of representativeSources) {
      const pdf = Buffer.from(`%PDF-1.4\n% ${code}\n%%EOF\n`)
      const checksum = createHash('sha256').update(pdf).digest('hex')
      await mkdir(path.dirname(path.join(genericFixtureRoot, logicalPath)), { recursive: true })
      await writeFile(path.join(genericFixtureRoot, logicalPath), pdf)
      manifestSources.push({ code, sourceKind, sourceType, format: 'PDF', logicalPath, sha256: checksum })
      const key = code.toLocaleLowerCase('nl-NL')
      const packageFile = path.join(genericFixtureRoot, `${key}.json`)
      const knowledgePackage = {
        schemaVersion: '1.0',
        source: { code, title: `Representatieve bron ${code}`, publisher: 'Testuitgever', publicationDate: '2026-01-01', edition: 'Testeditie', applicabilityScope: 'Representatieve migratietest', metadataStatus: 'COMPLETE', language: 'nl', jurisdiction: 'NL', sourceType, sourceFormat: 'PDF', copyrightClassification: 'PUBLIC_DOMAIN', authorityLevel: sourceType === 'LEGISLATION' || sourceType === 'REGULATION' ? 'PRIMARY_LEGAL' : 'OFFICIAL_GUIDANCE', temporalStatus: 'CURRENT', sourceFamily: sourceKind, independenceGroup: sourceKind, isPrimarySource: sourceType === 'LEGISLATION' || sourceType === 'REGULATION' },
        sourceVersion: { externalKey: `${key}:v1`, versionLabel: 'v1', publicationDate: '2026-01-01', checksum, extractionStatus: 'EXTRACTED', reviewStatus: 'NOT_REVIEWED' },
        topics: [{ externalKey: `${key}:topic`, slug: `${key}-topic`, title: `Onderwerp ${code}`, description: 'Uitsluitend een representatieve migratietest.', domain: sourceType === 'LEGISLATION' || sourceType === 'REGULATION' ? 'LEGAL' : 'OTHER' }],
        fragments: [{ externalKey: `${key}:fragment`, sourceVersionKey: `${key}:v1`, pageFrom: 1, pageTo: 1, fragmentType: 'PAGE', extractionMethod: 'TEST_FIXTURE', requiresReview: false }],
        claims: [{ externalKey: `${key}:claim`, topicKey: `${key}:topic`, claimType: 'OTHER', statement: `Conceptclaim voor ${code}.`, applicability: 'Uitsluitend een representatieve migratietest.', jurisdiction: 'NL', temporalStatus: 'CURRENT', validationStatus: 'UNVALIDATED', publicationStatus: 'DRAFT', confidenceLevel: 'MEDIUM', accessTier: 'INTERNAL_REVIEWER' }],
        citations: [{ claimKey: `${key}:claim`, sourceVersionKey: `${key}:v1`, fragmentKey: `${key}:fragment`, supportType: 'DIRECT_SUPPORT' }],
        relations: [], rules: [], calculations: [], checklists: [], procedures: [], roles: [], formTemplates: [],
        importMetadata: { createdAt: '2026-08-08T10:00:00.000Z', createdBy: 'MIGRATION_TEST', uncertainties: [] },
      }
      await writeFile(packageFile, JSON.stringify(knowledgePackage))
      representativePackage ??= knowledgePackage
      packageFiles.push(packageFile)
    }
    if (!representativePackage) throw new Error('De generieke importfixtures ontbreken.')
    const rollbackPdf = Buffer.from('%PDF-1.4\n% GEN-ROLLBACK\n%%EOF\n')
    const rollbackChecksum = createHash('sha256').update(rollbackPdf).digest('hex')
    await writeFile(path.join(genericFixtureRoot, 'ai-bladen', 'rollback.pdf'), rollbackPdf)
    manifestSources.push({ code: 'GEN-ROLLBACK', sourceKind: 'AI_SHEET', sourceType: 'AI_SHEET', format: 'PDF', logicalPath: 'ai-bladen/rollback.pdf', sha256: rollbackChecksum })
    const rollbackPackage = structuredClone(representativePackage)
    Object.assign(rollbackPackage.source as Record<string, unknown>, { code: 'GEN-ROLLBACK', title: 'Rollbackbron', sourceType: 'AI_SHEET', sourceFamily: 'ROLLBACK_TEST', independenceGroup: 'ROLLBACK_TEST' })
    Object.assign(rollbackPackage.sourceVersion as Record<string, unknown>, { externalKey: 'gen-rollback:v1', checksum: rollbackChecksum })
    Object.assign((rollbackPackage.topics as Array<Record<string, unknown>>)[0], { externalKey: 'gen-rollback:topic', slug: 'gen-rollback-topic', title: 'Rollbackonderwerp' })
    Object.assign((rollbackPackage.fragments as Array<Record<string, unknown>>)[0], { externalKey: 'gen-rollback:fragment', sourceVersionKey: 'gen-rollback:v1' })
    Object.assign((rollbackPackage.claims as Array<Record<string, unknown>>)[0], { externalKey: 'gen-rollback:claim', topicKey: 'gen-rollback:topic', statement: 'Conceptclaim voor de rollbacktest.' })
    Object.assign((rollbackPackage.citations as Array<Record<string, unknown>>)[0], { claimKey: 'gen-rollback:claim', sourceVersionKey: 'gen-rollback:v1', fragmentKey: 'gen-rollback:fragment' })
    rollbackPackage.roles = [{ code: 'generic-import-conflict', title: 'Conflictrol', description: 'Bewuste rollbacktest.' }]
    const rollbackPackageFile = path.join(genericFixtureRoot, 'rollback.json')
    await writeFile(rollbackPackageFile, JSON.stringify(rollbackPackage))
    const genericManifest = path.join(genericFixtureRoot, 'manifest.json')
    await writeFile(genericManifest, JSON.stringify({ schemaVersion: '2.0', sources: manifestSources }))
    const genericEnv = { ...process.env, DATABASE_URL: target.toString(), KNOWLEDGE_SOURCE_ROOT: genericFixtureRoot, KNOWLEDGE_SOURCE_MANIFEST: genericManifest }
    for (const packageFile of packageFiles) {
      for (const command of ['validate', 'preview', 'import'] as const) {
        const args = [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/knowledge-import.ts', command, packageFile, ...(command === 'import' ? ['--confirm'] : [])]
        const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env: genericEnv, encoding: 'utf8' })
        if (result.status !== 0) throw new Error(`Generieke ${command} mislukt voor ${path.basename(packageFile)}:\n${result.stdout ?? ''}\n${result.stderr ?? ''}`)
      }
    }

    const correctionPackage = structuredClone(representativePackage)
    ;((correctionPackage.claims as Array<Record<string, unknown>>)[0]).statement = 'Inhoudelijk gecorrigeerde conceptclaim voor GEN-AI.'
    Object.assign((correctionPackage.fragments as Array<Record<string, unknown>>)[0], {
      pageFrom: 2,
      pageTo: 2,
      sectionPath: 'Gecorrigeerde sectie',
      internalExcerpt: 'Kort gecontroleerd bronfragment voor de correctietest.',
      excerptHash: '9dbb766a16a30499d4493bdc77b68530899e36b8284778c5d8638685ed878022',
    })
    ;((correctionPackage.citations as Array<Record<string, unknown>>)[0]).citationNote = 'Gecorrigeerde citatierelatie.'
    const correctionPackageFile = path.join(genericFixtureRoot, 'gen-ai-correction.json')
    await writeFile(correctionPackageFile, JSON.stringify(correctionPackage))

    const mismatchedReplay = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/knowledge-import.ts', 'import', correctionPackageFile, '--confirm'], { cwd: process.cwd(), env: genericEnv, encoding: 'utf8' })
    if (mismatchedReplay.status === 0 || !`${mismatchedReplay.stderr}`.includes('expliciete correctiepad')) throw new Error('Een inhoudelijk afwijkende replay had fail-closed moeten worden geweigerd.')

    const correction = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/knowledge-import.ts', 'correct', correctionPackageFile, '--confirm', '--reason=Bronverwijzingen in de historische import waren onjuist.'], { cwd: process.cwd(), env: genericEnv, encoding: 'utf8' })
    if (correction.status !== 0 || !`${correction.stdout}`.includes('"corrected": true')) throw new Error(`Immutable correctie mislukt:\n${correction.stdout ?? ''}\n${correction.stderr ?? ''}`)
    if (`${correction.stderr}`.includes('Calling client.query() when the client is already executing a query')) throw new Error(`Correctie start overlappende queries op dezelfde PostgreSQL-client:\n${correction.stderr}`)

    const repeatedCorrection = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/knowledge-import.ts', 'correct', correctionPackageFile, '--confirm', '--reason=Bronverwijzingen in de historische import waren onjuist.'], { cwd: process.cwd(), env: genericEnv, encoding: 'utf8' })
    if (repeatedCorrection.status !== 0 || !`${repeatedCorrection.stdout}`.includes('"reused": true')) throw new Error('Een identieke tweede correctierun is niet idempotent hergebruikt.')

    const correctionPool = new Pool({ connectionString: target.toString() })
    const correctionState = await correctionPool.query<{ versions: string; claims: string; activeClaims: string; audits: string }>(`
      SELECT
        (SELECT count(*)::text FROM "KnowledgeSourceVersion" v JOIN "KnowledgeSource" s ON s.id=v."sourceId" WHERE s.code='GEN-AI') versions,
        (SELECT count(DISTINCT c.id)::text FROM "KnowledgeClaim" c JOIN "KnowledgeCitation" ci ON ci."claimId"=c.id JOIN "KnowledgeSourceVersion" v ON v.id=ci."sourceVersionId" JOIN "KnowledgeSource" s ON s.id=v."sourceId" WHERE s.code='GEN-AI') claims,
        (SELECT count(DISTINCT c.id)::text FROM "KnowledgeClaim" c JOIN "KnowledgeCitation" ci ON ci."claimId"=c.id JOIN "KnowledgeSourceVersion" v ON v.id=ci."sourceVersionId" JOIN "KnowledgeSource" s ON s.id=v."sourceId" WHERE s.code='GEN-AI' AND NOT EXISTS (SELECT 1 FROM "KnowledgeSourceVersion" successor WHERE successor."supersedesVersionId"=v.id)) "activeClaims",
        (SELECT count(*)::text FROM "KnowledgeAuditEvent" WHERE "eventType"='IMPORT_CORRECTION_COMPLETED') audits
    `)
    if (JSON.stringify(correctionState.rows[0]) !== JSON.stringify({ versions: '2', claims: '2', activeClaims: '1', audits: '1' })) {
      throw new Error(`Onjuiste immutable correctietoestand: ${JSON.stringify(correctionState.rows[0])}`)
    }

    const failingCorrection = structuredClone(correctionPackage)
    ;((failingCorrection.claims as Array<Record<string, unknown>>)[0]).statement = 'Derde claimvariant die volledig moet terugrollen.'
    failingCorrection.roles = [{ code: 'generic-import-conflict', title: 'Afwijkende conflictrol', description: 'Bewuste rollbacktest.' }]
    const failingCorrectionFile = path.join(genericFixtureRoot, 'gen-ai-failing-correction.json')
    await writeFile(failingCorrectionFile, JSON.stringify(failingCorrection))
    await correctionPool.query(`INSERT INTO "KnowledgeRole" ("id","code","title","description","createdAt","updatedAt") VALUES (gen_random_uuid(),'generic-import-conflict','Bestaande rol','Bewuste rollbacktest.',now(),now())`)
    const rejectedCorrection = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/knowledge-import.ts', 'correct', failingCorrectionFile, '--confirm', '--reason=Bewuste fout om de transactionele rollback te bewijzen.'], { cwd: process.cwd(), env: genericEnv, encoding: 'utf8' })
    if (rejectedCorrection.status === 0) throw new Error('De bewuste correctiefout had moeten worden geweigerd.')
    const afterRejectedCorrection = await correctionPool.query<{ versions: string; claims: string }>(`SELECT (SELECT count(*)::text FROM "KnowledgeSourceVersion" v JOIN "KnowledgeSource" s ON s.id=v."sourceId" WHERE s.code='GEN-AI') versions, (SELECT count(DISTINCT c.id)::text FROM "KnowledgeClaim" c JOIN "KnowledgeCitation" ci ON ci."claimId"=c.id JOIN "KnowledgeSourceVersion" v ON v.id=ci."sourceVersionId" JOIN "KnowledgeSource" s ON s.id=v."sourceId" WHERE s.code='GEN-AI') claims`)
    if (afterRejectedCorrection.rows[0].versions !== '2' || afterRejectedCorrection.rows[0].claims !== '2') throw new Error('De mislukte correctie is niet volledig teruggerold.')
    await correctionPool.query(`DELETE FROM "KnowledgeRole" WHERE "code"='generic-import-conflict'`)
    await correctionPool.end()

    const rollbackPool = new Pool({ connectionString: target.toString() })
    await rollbackPool.query(`INSERT INTO "KnowledgeRole" ("id","code","title","description","createdAt","updatedAt") VALUES (gen_random_uuid(),'generic-import-conflict','Bestaande rol','Bewuste rollbacktest.',now(),now())`)
    const rejected = spawnSync(process.execPath, [path.resolve('node_modules/tsx/dist/cli.mjs'), 'scripts/knowledge-import.ts', 'import', rollbackPackageFile, '--confirm'], { cwd: process.cwd(), env: genericEnv, encoding: 'utf8' })
    if (rejected.status === 0) throw new Error('De generieke conflictimport had transactioneel moeten mislukken.')
    const rolledBack = await rollbackPool.query<{ sources: string; claims: string }>(`SELECT (SELECT count(*)::text FROM "KnowledgeSource" WHERE "code"='GEN-ROLLBACK') sources, (SELECT count(*)::text FROM "KnowledgeClaim" WHERE "externalKey"='gen-rollback:claim') claims`)
    if (rolledBack.rows[0].sources !== '0' || rolledBack.rows[0].claims !== '0') throw new Error('De generieke conflictimport is niet volledig teruggerold.')
    await rollbackPool.query(`DELETE FROM "KnowledgeRole" WHERE "code"='generic-import-conflict'`)
    await rollbackPool.end()
    const genericPool = new Pool({ connectionString: target.toString() })
    const genericCounts = await genericPool.query<{ sources: string; claims: string; citations: string }>(`SELECT count(*)::text sources, (SELECT count(*)::text FROM "KnowledgeClaim" WHERE "externalKey" LIKE 'gen-%') claims, (SELECT count(*)::text FROM "KnowledgeCitation" c JOIN "KnowledgeClaim" k ON k."id"=c."claimId" WHERE k."externalKey" LIKE 'gen-%') citations FROM "KnowledgeSource" WHERE "code" LIKE 'GEN-%'`)
    await genericPool.end()
    if (genericCounts.rows[0].sources !== '8' || genericCounts.rows[0].claims !== '9' || genericCounts.rows[0].citations !== '9') throw new Error(`Onverwachte generieke importtellingen: ${JSON.stringify(genericCounts.rows[0])}`)
    console.info(`Volledige migratieketen en Knowledge Engine-constraints geslaagd op tijdelijke database ${databaseName}.`)
  } finally {
    if (genericFixtureRoot) await rm(genericFixtureRoot, { recursive: true, force: true })
    await admin.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`, [databaseName])
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`)
    await admin.end()
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
