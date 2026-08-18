import 'dotenv/config'

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { getPrisma } from '../src/lib/prisma'
import { storeKnowledgeCrossValidationAssessment, type KnowledgeCrossValidationAssessmentInput } from '../src/lib/knowledge/knowledge-cross-validation-service'

function required(name: 'DATABASE_URL') {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is vereist.`)
  return value
}

const url = required('DATABASE_URL')
const target = new URL(url)
if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname) || !target.pathname.includes('workmatchr_cross_validation')) {
  throw new Error('Alleen een tijdelijke lokale cross-validation-database is toegestaan.')
}

function run(args: string[]) {
  const result = spawnSync(process.execPath, args, { cwd: process.cwd(), env: process.env, encoding: 'utf8' })
  if (result.status !== 0) throw new Error(`${args.join(' ')} mislukt:\n${result.stdout}\n${result.stderr}`)
}

async function rejected(action: () => Promise<unknown>, label: string) {
  try {
    await action()
    throw new Error(`${label} werd niet geweigerd.`)
  } catch (error) {
    if (error instanceof Error && error.message.endsWith('werd niet geweigerd.')) throw error
  }
}

async function main() {
  run([path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'])
  const db = getPrisma()
  const organization = await db.organization.create({ data: { name: 'Cross-validation testplatform', organizationType: 'PLATFORM_OPERATOR', status: 'ACTIVE', systemKey: 'WORKMATCHR_PLATFORM' } })
  const reviewer = await db.user.create({ data: { email: 'cross-validation-reviewer@example.invalid', displayName: 'Cross-validation reviewer', emailVerified: true, status: 'ACTIVE', platformRole: 'ADMIN' } })
  await db.organizationMembership.create({ data: { organizationId: organization.id, userId: reviewer.id, role: 'OWNER', status: 'ACTIVE' } })
  const topic = await db.knowledgeTopic.create({ data: { slug: 'cross-validation-test', title: 'Cross-validation test', description: 'Tijdelijke integratietest.', domain: 'OTHER' } })
  const claim = await db.knowledgeClaim.create({ data: { externalKey: 'cross-validation:test:claim', topicId: topic.id, claimType: 'OTHER', statement: 'Historische testclaim.', applicability: 'Tijdelijke test.', temporalStatus: 'HISTORICAL', validationStatus: 'UNVALIDATED', publicationStatus: 'DRAFT', accessTier: 'INTERNAL_REVIEWER', createdByActor: 'CROSS_VALIDATION_TEST' } })
  const task = await db.knowledgeReviewTask.create({ data: { entityType: 'KnowledgeClaim', entityId: claim.id, claimId: claim.id, reviewReason: 'Cross-validation acceptatietest.' } })

  async function source(code: string, independenceGroup: string, hash: string, sequence: number) {
    const created = await db.knowledgeSource.create({ data: {
      sourceType: 'RESEARCH', sourceFormat: 'TEXT', code, title: code, publisher: 'Testuitgever', jurisdiction: 'NL', applicabilityScope: 'GENERAL',
      copyrightClassification: 'INTERNAL', authorityLevel: 'RESEARCH', temporalStatus: 'CURRENT', sourceFamily: code.split('-')[0], independenceGroup,
      versions: { create: { versionLabel: '2026', extractionStatus: 'EXTRACTED', reviewStatus: 'REVIEWED' } },
    }, include: { versions: true } })
    const version = created.versions[0]
    const extractionRun = await db.knowledgeExtractionRun.create({ data: { sourceVersionId: version.id, extractorName: 'TEST', extractorVersion: '1', configurationVersion: '1', status: 'COMPLETED', pageCount: 1, extractionFingerprint: hash, startedAt: new Date('2026-08-18T10:00:00Z'), completedAt: new Date('2026-08-18T10:00:01Z') } })
    const page = await db.knowledgeSourcePage.create({ data: { extractionRunId: extractionRun.id, pageNumber: 1, status: 'EXTRACTED', textHash: hash } })
    const block = await db.knowledgeSourceBlock.create({ data: { sourcePageId: page.id, extractionRunId: extractionRun.id, globalSequence: sequence, pageSequence: 1, sectionPath: 'Test', blockType: 'PARAGRAPH', exactText: `Actuele testpassage ${code}.`, normalizedSearchText: `actuele testpassage ${code.toLowerCase()}`, textHash: hash, extractionMethod: 'TEST' } })
    return { created, version, extractionRun, page, block }
  }

  const first = await source('TNO-TEST', 'TNO:TEST', '1'.repeat(64), 1)
  const second = await source('NLA-TEST', 'NLA:TEST', '2'.repeat(64), 1)
  const sameGroup = await source('NLA-TEST-2', 'NLA:TEST', '3'.repeat(64), 1)
  const baseline = {
    claim: await db.knowledgeClaim.findUniqueOrThrow({ where: { id: claim.id } }),
    sources: await db.knowledgeSource.count(), versions: await db.knowledgeSourceVersion.count(),
    runs: await db.knowledgeExtractionRun.count(), pages: await db.knowledgeSourcePage.count(), blocks: await db.knowledgeSourceBlock.count(),
  }
  const input: KnowledgeCrossValidationAssessmentInput = {
    claimId: claim.id, reviewTaskId: task.id, outcome: 'PARTIAL_CONDITIONAL', rationale: 'Twee onafhankelijke bronfamilies ondersteunen de claim gedeeltelijk.',
    checkedAt: new Date('2026-08-18T12:00:00Z'), reviewerUserId: reviewer.id,
    evidence: [
      { sourceBlockId: first.block.id, blockTextHash: first.block.textHash, supportType: 'DIRECT_SUPPORT', sequence: 1, rationale: 'TNO ondersteunt de kern.' },
      { sourceBlockId: second.block.id, blockTextHash: second.block.textHash, supportType: 'PARTIAL_SUPPORT', sequence: 2, rationale: 'NLA begrenst de toepassing.' },
      { sourceBlockId: sameGroup.block.id, blockTextHash: sameGroup.block.textHash, supportType: 'CONTEXT', sequence: 3, rationale: 'Tweede passage uit dezelfde NLA-independence group.' },
    ],
  }
  const stored = await storeKnowledgeCrossValidationAssessment(input, db)
  if (!stored.created || stored.revision !== 1) throw new Error('Eerste assessmentrevisie is niet opgeslagen.')
  const evidence = await db.knowledgeCrossValidationEvidence.findMany({ where: { assessmentId: stored.assessmentId }, orderBy: { sequence: 'asc' } })
  if (evidence.length !== 3 || new Set(evidence.map((item) => item.independenceGroupSnapshot)).size !== 2 || evidence.some((item) => item.jurisdictionSnapshot !== 'NL' || item.applicabilityScopeSnapshot !== 'GENERAL')) throw new Error('Evidence-snapshots of independence groups zijn onjuist.')
  const replay = await storeKnowledgeCrossValidationAssessment(input, db)
  if (replay.created || replay.assessmentId !== stored.assessmentId) throw new Error('Identieke replay is niet idempotent.')
  await rejected(() => storeKnowledgeCrossValidationAssessment({ ...input, outcome: 'CONFLICT' }, db), 'Conflicterende replay')
  await rejected(() => storeKnowledgeCrossValidationAssessment({ ...input, evidence: [] }, db), 'Evidence-loze assessment')
  await rejected(() => storeKnowledgeCrossValidationAssessment({ ...input, evidence: [{ ...input.evidence[0], sourceBlockId: '00000000-0000-4000-8000-000000000099' }] }, db), 'Onbekend bronblok')
  await rejected(() => storeKnowledgeCrossValidationAssessment({ ...input, evidence: [{ ...input.evidence[0], blockTextHash: 'f'.repeat(64) }] }, db), 'Onjuiste bronblokhash')
  const assessmentCount = await db.knowledgeCrossValidationAssessment.count()
  await rejected(() => storeKnowledgeCrossValidationAssessment({ ...input, checkedAt: new Date('2026-08-18T12:01:00Z'), supersedesAssessmentId: stored.assessmentId, evidence: [{ ...input.evidence[0], sequence: 1 }, { ...input.evidence[0], sequence: 2 }] }, db), 'Halverwege falende evidencewrite')
  if (await db.knowledgeCrossValidationAssessment.count() !== assessmentCount) throw new Error('De falende evidencewrite is niet volledig teruggerold.')
  const revised = await storeKnowledgeCrossValidationAssessment({ ...input, outcome: 'CONFLICT', rationale: 'Een actuele bron spreekt de historische claim tegen.', checkedAt: new Date('2026-08-18T13:00:00Z'), supersedesAssessmentId: stored.assessmentId, evidence: [{ ...input.evidence[1], supportType: 'CONTRADICTS', sequence: 1 }] }, db)
  if (!revised.created || revised.revision !== 2 || await db.knowledgeCrossValidationAssessment.count({ where: { claimId: claim.id } }) !== 2) throw new Error('Supersession heeft de oude assessment niet behouden.')
  await rejected(() => db.knowledgeCrossValidationAssessment.update({ where: { id: stored.assessmentId }, data: { rationale: 'Verboden wijziging.' } }), 'Assessment-update')
  await rejected(() => db.knowledgeCrossValidationEvidence.delete({ where: { id: evidence[0].id } }), 'Evidence-delete')
  await rejected(() => db.$transaction(async (tx) => { await tx.knowledgeCrossValidationAssessment.create({ data: { claimId: claim.id, reviewTaskId: task.id, revision: 3, outcome: 'CONFIRMED', rationale: 'Zonder evidence.', checkedAt: new Date(), reviewerUserId: reviewer.id, contentFingerprint: 'a'.repeat(64), supersedesAssessmentId: revised.assessmentId } }) }), 'Databasebrede evidenceplicht')
  await rejected(() => db.$transaction(async (tx) => {
    const direct = await tx.knowledgeCrossValidationAssessment.create({ data: { claimId: claim.id, reviewTaskId: task.id, revision: 3, outcome: 'CONFIRMED', rationale: 'Directe database-hashtest.', checkedAt: new Date(), reviewerUserId: reviewer.id, contentFingerprint: 'b'.repeat(64), supersedesAssessmentId: revised.assessmentId } })
    await tx.knowledgeCrossValidationEvidence.create({ data: { assessmentId: direct.id, sourceBlockId: first.block.id, blockTextHash: 'f'.repeat(64), supportType: 'DIRECT_SUPPORT', jurisdictionSnapshot: 'NL', applicabilityScopeSnapshot: 'GENERAL', independenceGroupSnapshot: 'TNO:TEST', sequence: 1, rationale: 'Deze onjuiste hash moet databasebreed worden geweigerd.' } })
  }), 'Databasebrede blockhashcontrole')
  await rejected(() => db.$transaction(async (tx) => {
    const direct = await tx.knowledgeCrossValidationAssessment.create({ data: { claimId: claim.id, reviewTaskId: task.id, revision: 3, outcome: 'CONFIRMED', rationale: 'Directe database-snapshottest.', checkedAt: new Date(), reviewerUserId: reviewer.id, contentFingerprint: 'c'.repeat(64), supersedesAssessmentId: revised.assessmentId } })
    await tx.knowledgeCrossValidationEvidence.create({ data: { assessmentId: direct.id, sourceBlockId: first.block.id, blockTextHash: first.block.textHash, supportType: 'DIRECT_SUPPORT', jurisdictionSnapshot: 'US', applicabilityScopeSnapshot: 'GENERAL', independenceGroupSnapshot: 'VERKEERD', sequence: 1, rationale: 'Deze onjuiste contextsnapshot moet databasebreed worden geweigerd.' } })
  }), 'Databasebrede contextsnapshotcontrole')
  if (await db.knowledgeCrossValidationAssessment.count({ where: { claimId: claim.id } }) !== 2) throw new Error('Een databasebreed geweigerde write liet een assessment achter.')
  const after = {
    claim: await db.knowledgeClaim.findUniqueOrThrow({ where: { id: claim.id } }),
    sources: await db.knowledgeSource.count(), versions: await db.knowledgeSourceVersion.count(),
    runs: await db.knowledgeExtractionRun.count(), pages: await db.knowledgeSourcePage.count(), blocks: await db.knowledgeSourceBlock.count(),
  }
  if (JSON.stringify(after) !== JSON.stringify(baseline)) throw new Error('Bestaande claim- of full-source-data is gewijzigd.')
  console.log(JSON.stringify({ assessmentRevision1: stored, idempotentReplay: replay, assessmentRevision2: revised, evidence: evidence.length, independentGroups: 2, rollback: true, immutable: true, sourceDataUnchanged: true }, null, 2))
  await db.$disconnect()
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
