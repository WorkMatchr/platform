import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Pool } from 'pg'
import { getPrisma } from '../src/lib/prisma'
import { extractPdfFullSource, normalizeKnowledgeSourceText } from '../src/lib/knowledge/knowledge-extractor'
import { storeKnowledgeFullSource } from '../src/lib/knowledge/knowledge-full-source-service'
import { getKnowledgeMethod, storeKnowledgeMethod, type KnowledgeMethodInput } from '../src/lib/knowledge/knowledge-method-service'

function required(name: 'DATABASE_URL' | 'KNOWLEDGE_AI10_TEST_PDF') {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is vereist.`)
  return value
}
const url = required('DATABASE_URL')
const pdfPath = required('KNOWLEDGE_AI10_TEST_PDF')
const target = new URL(url)
if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname) || !target.pathname.includes('workmatchr_knowledge_method')) throw new Error('Alleen een tijdelijke lokale KnowledgeMethod-database is toegestaan.')

function run(args: string[]) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env: process.env, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${args.join(' ')} mislukt:\n${result.stdout}\n${result.stderr}`)
}

async function expectRejected(action: () => Promise<unknown>, label: string) {
  try { await action(); throw new Error(`${label} werd niet geweigerd.`) } catch (error) { if (error instanceof Error && error.message.endsWith('werd niet geweigerd.')) throw error }
}

async function main() {
  run([path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'])
  const db = getPrisma()
  const pool = new Pool({ connectionString: url })
  const bytes = await readFile(pdfPath)
  const checksum = createHash('sha256').update(bytes).digest('hex')
  if (checksum !== 'a414107c8b11d0351311552e344fb0e1a95db171c7654c89fa5e083a1a60cae7') throw new Error('AI-10-checksum wijkt af.')
  const extraction = await extractPdfFullSource(bytes)
  if (extraction.pageCount !== 33) throw new Error(`AI-10 bevat onverwacht ${extraction.pageCount} pagina's.`)
  const source = await db.knowledgeSource.create({ data: {
    sourceType: 'AI_SHEET', sourceFormat: 'PDF', code: 'AI-10-METHOD-TEST', title: 'Bedrijfshulpverlening', publisher: 'Testfixture',
    edition: '2001', metadataStatus: 'INCOMPLETE', copyrightClassification: 'INTERNAL', authorityLevel: 'PROFESSIONAL_GUIDANCE',
    temporalStatus: 'HISTORICAL', sourceFamily: 'AI_BLAD', independenceGroup: 'AI_BLAD', localReference: 'manifest:ai-10-test',
    versions: { create: { versionLabel: '2001', checksum, extractionStatus: 'EXTRACTED', reviewStatus: 'NOT_REVIEWED' } },
  }, include: { versions: true } })
  const version = source.versions[0]
  const stored = await storeKnowledgeFullSource(version.id, extraction, db)
  const blocks = await db.knowledgeSourceBlock.findMany({ where: { extractionRunId: stored.extractionRunId }, orderBy: { globalSequence: 'asc' }, select: { id: true, exactText: true, sourcePage: { select: { pageNumber: true } } } })
  const findBlock = (terms: string[], pages: number[]) => {
    const block = blocks.find((candidate) => pages.includes(candidate.sourcePage.pageNumber) && terms.every((term) => normalizeKnowledgeSourceText(candidate.exactText).includes(term)))
    if (!block) throw new Error(`AI-10-bewijs ontbreekt: ${terms.join(' ')}`)
    return block.id
  }
  const basisBlock = findBlock(['maatgevende', 'factoren'], [9, 10])
  const scenarioBlock = findBlock(['incidentscenario'], [9, 10])
  const planBlock = findBlock(['bhv-plan'], [14, 15])
  const trainingBlock = findBlock(['opleiding', 'risico'], [17])
  const exerciseBlock = findBlock(['oefening', 'evaluatie'], [19, 20])
  const topic = await db.knowledgeTopic.create({ data: { slug: 'bhv-method-test', title: 'BHV-methodiek', description: 'Tijdelijke integratietest.', domain: 'EMERGENCY_RESPONSE', status: 'DRAFT' } })
  const checklist = await db.knowledgeChecklist.create({ data: { code: 'BHV_METHOD_INPUT_TEST', version: 1, title: 'BHV-invoer', description: 'RI&E, restrisico’s en beschikbaarheid.', topicId: topic.id, audience: 'INTERNAL_REVIEWER', scoringMethod: 'NONE' } })
  const procedure = await db.knowledgeProcedure.create({ data: { code: 'BHV_METHOD_FLOW_TEST', version: 1, title: 'Maatgevende scenarioanalyse', description: 'Scenario’s naar taken, plan, opleiding en evaluatie.', topicId: topic.id, audience: 'INTERNAL_REVIEWER', prerequisites: { requires: ['rie', 'residualRisks'] }, steps: { create: [
    { order: 1, title: 'Maatgevende factoren', instruction: 'Inventariseer maatgevende factoren en restrisico’s.' },
    { order: 2, title: 'Scenario’s', instruction: 'Werk geloofwaardige incidentscenario’s uit.' },
    { order: 3, title: 'Taken en inzet', instruction: 'Bepaal acties, taken, gelijktijdige inzet, beschikbaarheid en vervanging.' },
    { order: 4, title: 'BHV-plan', instruction: 'Leg de gekozen organisatie en procedures vast.' },
    { order: 5, title: 'Opleiden, oefenen en bijstellen', instruction: 'Stem opleiding af en evalueer oefeningen om bij te stellen.' },
  ] } } })
  const baseline = await Promise.all([db.knowledgeClaim.count(), db.knowledgeFragment.count(), db.knowledgeCitation.count(), db.knowledgeSource.count()])
  const input: KnowledgeMethodInput = {
    code: 'BHV_MAATGEVENDE_SCENARIOS', title: 'Maatgevende scenario’s voor de BHV-organisatie', purpose: 'Onderbouw taken en organisatie vanuit RI&E, restrisico’s en geloofwaardige incidentscenario’s.',
    applicability: { source: 'AI-10', historicalMethod: true }, inputContract: { required: ['rie', 'residualRisks', 'availability', 'replacement'] },
    outputContract: { produces: ['credibleScenarios', 'requiredActionsAndTasks', 'simultaneousDeployment', 'bhvPlan', 'trainingAndExerciseCycle'], explicitlyExcludes: ['fixedHeadcount'] },
    limitations: 'Historische vakmethodiek uit 2001; geen actuele wettelijke norm, vaste 1-op-50-regel, cursusduur of exact aantal BHV’ers.',
    temporalStatus: 'HISTORICAL', createdByActor: 'KNOWLEDGE_METHOD_INTEGRATION_TEST',
    evidence: [{ sourceBlockId: basisBlock, role: 'BASIS', rationale: 'AI-10 beschrijft maatgevende factoren als basis.' }],
    components: [
      { type: 'CHECKLIST', checklistId: checklist.id, sequence: 1, label: 'Benodigde invoer vaststellen', evidence: [{ sourceBlockId: basisBlock, role: 'INPUT', rationale: 'Maatgevende factoren en restrisico’s bepalen de invoer.' }] },
      { type: 'PROCEDURE', procedureId: procedure.id, sequence: 2, label: 'Scenario’s, taken en verbetercyclus', evidence: [
        { sourceBlockId: scenarioBlock, role: 'STEP', rationale: 'Onderbouwt geloofwaardige incidentscenario’s.' },
        { sourceBlockId: planBlock, role: 'OUTPUT', rationale: 'Onderbouwt vastlegging in het BHV-plan.' },
        { sourceBlockId: trainingBlock, role: 'STEP', rationale: 'Onderbouwt risicogestuurde opleiding.' },
        { sourceBlockId: exerciseBlock, role: 'STEP', rationale: 'Onderbouwt oefenen, evalueren en bijstellen.' },
      ] },
    ],
  }
  const first = await storeKnowledgeMethod(input, db)
  const replay = await storeKnowledgeMethod(input, db)
  if (!first.created || replay.created || replay.methodId !== first.methodId) throw new Error('Methode-replay is niet idempotent.')
  const loaded = await getKnowledgeMethod(input.code, db)
  if (!loaded || loaded.components.map((item) => item.sequence).join(',') !== '1,2' || loaded.components.some((item) => item.evidence.length === 0)) throw new Error('Complete methode is niet geordend met evidence geladen.')
  if (JSON.stringify(loaded).toLowerCase().includes('1 op 50') || JSON.stringify(loaded.outputContract).toLowerCase().includes('headcount":')) throw new Error('Historische aantalsnorm werd uitvoerbaar gemodelleerd.')
  const revised = await storeKnowledgeMethod({ ...input, supersedesMethodId: first.methodId, limitations: `${input.limitations} Voor actueel gebruik zijn gezaghebbende kruisbronnen vereist.` }, db)
  if (!revised.created || revised.revision !== 2) throw new Error('Nieuwe methoderevisie ontbreekt.')
  const old = await db.knowledgeMethod.findUniqueOrThrow({ where: { id: first.methodId } })
  if (old.revision !== 1 || old.supersedesMethodId !== null) throw new Error('Oude methoderevisie is gewijzigd.')
  await expectRejected(() => storeKnowledgeMethod({ ...input, supersedesMethodId: revised.methodId, evidence: [{ ...input.evidence[0], sourceBlockId: '00000000-0000-4000-8000-000000000000' }] }, db), 'Ongeldig bronblok')
  await expectRejected(() => pool.query(`INSERT INTO "KnowledgeMethodComponent" ("methodId","sequence","label","procedureId","checklistId") VALUES ($1,99,'invalid',$2,$3)`, [revised.methodId, procedure.id, checklist.id]), 'XOR-overtreding')
  await expectRejected(() => pool.query('BEGIN').then(() => pool.query(`INSERT INTO "KnowledgeMethodComponent" ("methodId","sequence","label","procedureId") VALUES ($1,98,'no evidence',$2)`, [revised.methodId, procedure.id])).then(() => pool.query('COMMIT')).finally(() => pool.query('ROLLBACK').catch(() => undefined)), 'Component zonder evidence')
  if (await db.knowledgeMethodComponent.count({ where: { methodId: revised.methodId, sequence: 98 } })) throw new Error('Evidence-fout liet een halfgeschreven component achter.')
  await expectRejected(() => pool.query(`UPDATE "KnowledgeMethod" SET "title"="title" WHERE "id"=$1`, [first.methodId]), 'Immutable UPDATE')
  await expectRejected(() => pool.query(`UPDATE "KnowledgeMethodComponent" SET "label"="label" WHERE "id"=$1`, [loaded.components[0].id]), 'Immutable component-UPDATE')
  await expectRejected(() => pool.query(`DELETE FROM "KnowledgeMethodEvidence" WHERE "methodId"=$1`, [first.methodId]), 'Immutable DELETE')
  const after = await Promise.all([db.knowledgeClaim.count(), db.knowledgeFragment.count(), db.knowledgeCitation.count(), db.knowledgeSource.count()])
  if (after.join(',') !== baseline.join(',')) throw new Error('Bestaande Knowledge-structuur is gewijzigd.')
  console.info(JSON.stringify({ pages: extraction.pageCount, blocks: blocks.length, firstRevision: first.revision, secondRevision: revised.revision, idempotentReplay: true, components: loaded.components.length, evidence: loaded.evidence.length + loaded.components.reduce((sum, item) => sum + item.evidence.length, 0) }))
  await db.$disconnect(); await pool.end()
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
