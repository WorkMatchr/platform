import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { PrismaClient, Prisma } from '../../src/generated/prisma/client'
import { complianceChecksum } from '../../src/lib/compliance/compliance-v2'
import { f4TestDefinition, f4PositiveAnswers } from '../../src/test-fixtures/compliance-f4'
import { v2Context } from '../../src/test-fixtures/compliance-v2'
import type { ArboGuideViewer } from '../../src/lib/arbo-guides/arbo-guide-run-service'
import { createReviewedTestCitation } from './compliance-knowledge-database'

// Called exclusively by the self-creating, localhost-only F1/F2 database harness.
export async function verifyComplianceF4Database(db: PrismaClient, viewer: ArboGuideViewer, other: ArboGuideViewer) {
  const historical = await db.arboGuideRun.findMany({ include: { results: true }, orderBy: { id: 'asc' } })
  const d = f4TestDefinition(), sources = [...new Map(d.modules.flatMap(m => m.rules.flatMap(r => r.sources)).map(s => [s.id, s])).values()]
  const topic = await db.knowledgeTopic.create({ data: { slug: 'synthetic-f4', title: 'Test', description: 'Test', domain: 'OTHER' } })
  const source = await db.knowledgeSource.create({ data: { code: 'SYNTHETIC_F4', title: sources[0].title, publisher: sources[0].publisher, sourceUrl: sources[0].url,
    sourceType: 'LEGISLATION', sourceFormat: 'HTML', copyrightClassification: 'PUBLIC_DOMAIN', authorityLevel: 'PRIMARY_LEGAL', sourceFamily: 'TEST', independenceGroup: 'TEST', temporalStatus: 'CURRENT' } })
  await db.knowledgeSourceVersion.create({ data: { id: sources[0].sourceVersionId, sourceId: source.id, versionLabel: 'test-f4', checksum: sources[0].sourceChecksum, reviewStatus: 'REVIEWED' } })
  for (const s of sources) {
    const recommendation = s.claimId.endsWith('2')
    const scope = s.claimId.endsWith('3')
    await db.knowledgeClaim.create({ data: { id: s.claimId, topicId: topic.id, externalKey: `synthetic-f4-${s.claimId}`, claimType: recommendation ? 'RECOMMENDATION' : scope ? 'CONDITION' : 'LEGAL_REQUIREMENT', statement: recommendation ? 'Synthetische aanbeveling' : scope ? 'Synthetische werkgeversscope' : 'Synthetische F4-testclaim', applicability: 'Test', createdByActor: 'F4_TEST', publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED', temporalStatus: 'CURRENT', sourceControlStatus: 'CONTROL_COMPLETE', copyrightCheckPassed: true, reviewedByUserId: viewer.userId, reviewedAt: new Date(v2Context.scannedAt) } })
    await createReviewedTestCitation(db, s, viewer.userId, new Date(v2Context.scannedAt))
  }
  await db.complianceFrameworkVersion.create({ data: { id: d.id, frameworkCode: d.frameworkCode, version: d.version, title: d.title, disclaimer: d.disclaimer, methodology: 'Uitsluitend synthetische F4-testbronbindingen', checksum: complianceChecksum(d) } })
  for (const [i, m] of d.modules.entries()) {
    const currentModule = await db.complianceModuleDefinition.create({ data: { frameworkVersionId: d.id, code: m.code, title: m.title, category: m.code.startsWith('R') ? 'RISK' : 'CORE', position: i + 1, defaultAssessmentMode: 'FULL' } })
    for (const [j, q] of m.questions.entries()) await db.complianceQuestionDefinition.create({ data: { id: q.id, moduleDefinitionId: currentModule.id, code: q.code, prompt: q.prompt, helpText: q.helpText, ...(q.visibleWhen ? { visibilityCondition: q.visibleWhen as Prisma.InputJsonValue } : {}), inputType: q.inputType, isRequired: q.required, position: j + 1,
      options: { create: q.options.map((o, k) => ({ value: o.value, label: o.label, isExclusive: o.exclusive, position: k + 1 })) } } })
    for (const [j, r] of m.rules.entries()) await db.complianceRuleDefinition.create({ data: { id: r.id, frameworkVersionId: d.id, moduleDefinitionId: currentModule.id, code: r.code, conditionSchema: r.condition, applicability: r.applicability, assessmentStatus: r.status, assessmentMode: r.mode, basis: r.basis, findingCode: r.code, findingTitle: m.title, findingBody: r.explanation, recommendedAction: r.nextStep, position: j + 1,
      knowledgeReferences: { create: r.sources.map((s, k) => ({ knowledgeClaimId: s.claimId, supportType: 'DIRECT_SUPPORT', isPrimary: k === 0, position: k + 1 })) } } })
  }
  const { POST } = await import('../../src/app/wijzers/compliance/v2/runs/route')
  const { inspectComplianceFramework } = await import('../../src/lib/compliance/compliance-v2-framework')
  const beforeInspection = await db.complianceFrameworkVersion.findUniqueOrThrow({ where: { id: d.id } })
  const inspection = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY')
    assert.deepEqual(await tx.$queryRawUnsafe('SHOW transaction_read_only'), [{ transaction_read_only: 'on' }])
    return inspectComplianceFramework(tx, d.id)
  }, { isolationLevel: 'RepeatableRead', timeout: 30_000 })
  assert.equal(inspection.decision, 'GO')
  assert.equal(inspection.status, 'DRAFT')
  assert.equal(inspection.rules.length, 141)
  assert.deepEqual(await db.complianceFrameworkVersion.findUniqueOrThrow({ where: { id: d.id } }), beforeInspection)
  const payload = { idempotencyKey: randomUUID(), startedAt: new Date(Date.now() - 60_000).toISOString(), completedAt: new Date().toISOString(), answers: f4PositiveAnswers }
  const post = (body: unknown = payload) => POST(new Request('http://localhost/wijzers/compliance/v2/runs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }))
  delete process.env.COMPLIANCE_F4_ENABLED
  assert.equal((await post()).status, 404)
  process.env.COMPLIANCE_F4_ENABLED = 'true'
  assert.equal((await post()).status, 400, 'DRAFT cannot be used')
  await db.complianceFrameworkVersion.update({ where: { id: d.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
  assert.equal((await post({ ...payload, organizationId: other.organizationId })).status, 400)
  assert.equal((await post({ ...payload, answers: { rie: 'INVALID' } })).status, 400)
  const responses = await Promise.all(Array.from({ length: 6 }, () => post()))
  assert.equal(responses.filter(r => r.status === 201).length, 1)
  assert.equal(responses.filter(r => r.status === 200).length, 5)
  const bodies = await Promise.all(responses.map(r => r.json())) as Array<{ runId: string; report: unknown }>
  assert.equal(new Set(bodies.map(b => b.runId)).size, 1)
  const run = await db.arboGuideRun.findUniqueOrThrow({ where: { id: bodies[0].runId }, include: { results: true } })
  assert.equal(run.results.length, 10)
  assert.deepEqual(run.reportSnapshot, bodies[0].report)
  const service = await import('../../src/lib/arbo-guides/arbo-guide-run-service')
  await assert.rejects(service.getArboGuideRun(other, run.id))
  await assert.rejects(db.complianceQuestionDefinition.update({ where: { id: d.modules[0].questions[1].id }, data: { visibilityCondition: { question: 'hasEmployees', equals: 'NO' } } }))
  for (const role of ['OWNER', 'ADMIN', 'MEMBER'] as const) {
    await db.organizationMembership.update({ where: { userId: viewer.userId }, data: { role } })
    assert.equal((await post()).status, 200)
  }
  await db.organizationMembership.update({ where: { userId: viewer.userId }, data: { status: 'SUSPENDED' } })
  assert.equal((await post()).status, 403)
  await db.organizationMembership.update({ where: { userId: viewer.userId }, data: { status: 'ACTIVE' } })
  await db.knowledgeSource.update({ where: { id: source.id }, data: { temporalStatus: 'WITHDRAWN' } })
  assert.equal((await post({ ...payload, idempotencyKey: randomUUID() })).status, 400, 'Withdrawn evidence blocks new runs')
  assert.deepEqual((await service.getArboGuideRun(viewer, run.id)).reportSnapshot, bodies[0].report, 'Historical report remains readable')
  await db.knowledgeSource.update({ where: { id: source.id }, data: { temporalStatus: 'CURRENT' } })
  await db.knowledgeSource.update({ where: { id: source.id }, data: { title: 'Gewijzigde testbron' } })
  assert.equal((await post({ ...payload, idempotencyKey: randomUUID() })).status, 400)
  for (const old of historical) assert.deepEqual(await db.arboGuideRun.findUniqueOrThrow({ where: { id: old.id }, include: { results: true } }), old)
  assert.equal(await db.arboGuideRun.count(), historical.length + 1)
  delete process.env.COMPLIANCE_F4_ENABLED
  console.log('F4 PostgreSQL PASS: real route/service, 48 fields, 10 results, six requests/one run; roles/tenant/membership; immutable visibility; source drift denied; historical runs unchanged.')
}
