import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { Pool } from 'pg'
import { getPrisma } from '../src/lib/prisma'
import { extractPdfFullSource } from '../src/lib/knowledge/knowledge-extractor'
import { storeKnowledgeFullSource } from '../src/lib/knowledge/knowledge-full-source-service'
import { BHV_CHECKLIST_CODE, BHV_PROCEDURE_CODE, getBhvKnowledgeComponents, storeBhvKnowledgeComponents } from '../src/lib/knowledge/knowledge-bhv-components-service'

function required(name: 'DATABASE_URL' | 'KNOWLEDGE_AI10_TEST_PDF') {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is vereist.`)
  return value
}
const url = required('DATABASE_URL')
const pdfPath = required('KNOWLEDGE_AI10_TEST_PDF')
const target = new URL(url)
if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname) || !target.pathname.includes('workmatchr_bhv_components')) throw new Error('Alleen een tijdelijke lokale BHV-componentendatabase is toegestaan.')

function run(args: string[]) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env: process.env, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${args.join(' ')} mislukt:\n${result.stdout}\n${result.stderr}`)
}
async function rejected(action: () => Promise<unknown>, label: string) {
  try { await action(); throw new Error(`${label} werd niet geweigerd.`) } catch (error) { if (error instanceof Error && error.message.endsWith('werd niet geweigerd.')) throw error }
}

async function main() {
  run([path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'])
  const database = getPrisma()
  const pool = new Pool({ connectionString: url })
  const topic = await database.knowledgeTopic.create({ data: { slug: 'ai-10-bhv-components-test', title: 'BHV', description: 'Tijdelijke AI-10-componententest.', domain: 'EMERGENCY_RESPONSE', status: 'DRAFT' } })
  const source = await database.knowledgeSource.create({ data: { sourceType: 'AI_SHEET', sourceFormat: 'PDF', code: 'AI-10', title: 'Bedrijfshulpverlening', publisher: 'Sdu Uitgevers', edition: '2001', metadataStatus: 'INCOMPLETE', copyrightClassification: 'RESTRICTED_REFERENCE_ONLY', authorityLevel: 'PROFESSIONAL_GUIDANCE', temporalStatus: 'HISTORICAL', sourceFamily: 'SZW-AI-BLADEN', independenceGroup: 'SZW-AI-BLADEN', localReference: 'temporary-ai-10-component-test', versions: { create: { versionLabel: 'Uitgave 2001', checksum: 'a414107c8b11d0351311552e344fb0e1a95db171c7654c89fa5e083a1a60cae7', extractionStatus: 'EXTRACTED', reviewStatus: 'REVIEW_REQUIRED' } } }, include: { versions: true } })
  const version = source.versions[0]
  const claim = await database.knowledgeClaim.create({ data: { externalKey: 'ai-10-bhv-components-test-claim', topicId: topic.id, claimType: 'OTHER', statement: 'Historische testclaim voor topickoppeling.', applicability: 'Uitsluitend integratietest.', temporalStatus: 'HISTORICAL', validationStatus: 'UNVALIDATED', publicationStatus: 'DRAFT', confidenceLevel: 'UNKNOWN', accessTier: 'INTERNAL_REVIEWER', controlRisk: 'CRITICAL', sourceControlStatus: 'OUTDATED', createdByActor: 'BHV_COMPONENT_INTEGRATION_TEST' } })
  await database.knowledgeCitation.create({ data: { claimId: claim.id, sourceVersionId: version.id, supportType: 'CONTEXT', citationNote: 'Tijdelijke topickoppeling voor componententest.' } })
  await storeKnowledgeFullSource(version.id, await extractPdfFullSource(await readFile(pdfPath)), database)
  const baseline = await Promise.all([database.knowledgeSource.count(), database.knowledgeSourceVersion.count(), database.knowledgeClaim.count(), database.knowledgeFragment.count(), database.knowledgeCitation.count(), database.knowledgeExtractionRun.count(), database.knowledgeSourceBlock.count()])
  const first = await storeBhvKnowledgeComponents(database)
  const replay = await storeBhvKnowledgeComponents(database)
  if (!first.created || replay.created || first.checklistId !== replay.checklistId || first.procedureId !== replay.procedureId) throw new Error('Componentreplay is niet idempotent.')
  const loaded = await getBhvKnowledgeComponents(database)
  if (!loaded.checklist || !loaded.procedure || loaded.checklist.items.length !== 9 || loaded.procedure.steps.length !== 9) throw new Error('Geordende componentretrieval is onvolledig.')
  if (loaded.checklist.items.some((item, index) => item.order !== index + 1 || item.evidence.length === 0) || loaded.procedure.steps.some((step, index) => step.order !== index + 1 || step.evidence.length === 0)) throw new Error('Volgorde of evidence ontbreekt.')
  const serialized = JSON.stringify(loaded).toLowerCase()
  for (const forbidden of ['1-op-50', '1 op 50', 'zestien uur', 'acht uur per twee jaar', 'een keer per jaar']) if (serialized.includes(forbidden)) throw new Error(`Verboden historische uitvoerbare norm aanwezig: ${forbidden}`)
  await rejected(() => pool.query('UPDATE "KnowledgeChecklist" SET "title"="title" WHERE "id"=$1', [first.checklistId]), 'Checklist-UPDATE')
  await rejected(() => pool.query('DELETE FROM "KnowledgeProcedureStep" WHERE "procedureId"=$1', [first.procedureId]), 'Procedurestep-DELETE')
  await rejected(async () => { await pool.query('BEGIN'); try { await pool.query(`INSERT INTO "KnowledgeChecklistItem" ("id","checklistId","order","question","answerType","required","createdAt","updatedAt") VALUES (gen_random_uuid(),$1,99,'Geen bewijs','TEXT',true,now(),now())`, [first.checklistId]); await pool.query('COMMIT') } catch (error) { await pool.query('ROLLBACK'); throw error } }, 'Checklistregel zonder evidence')
  if (await database.knowledgeChecklistItem.count({ where: { checklistId: first.checklistId, order: 99 } })) throw new Error('Evidencefout liet een halfgeschreven regel achter.')
  const after = await Promise.all([database.knowledgeSource.count(), database.knowledgeSourceVersion.count(), database.knowledgeClaim.count(), database.knowledgeFragment.count(), database.knowledgeCitation.count(), database.knowledgeExtractionRun.count(), database.knowledgeSourceBlock.count()])
  if (after.join(',') !== baseline.join(',')) throw new Error('Bestaande AI-10 Knowledge-data is gewijzigd.')
  console.info(JSON.stringify({ checklistCode: BHV_CHECKLIST_CODE, checklistItems: 9, procedureCode: BHV_PROCEDURE_CODE, procedureSteps: 9, idempotentReplay: true, immutable: true, evidenceRequired: true }))
  await pool.end(); await database.$disconnect()
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
