import assert from 'node:assert/strict'
import type { PrismaClient } from '../../src/generated/prisma/client'
import { buildComplianceV2Report, complianceChecksum } from '../../src/lib/compliance/compliance-v2'
import { v2Definition, v2Answers, v2Context } from '../../src/test-fixtures/compliance-v2'
import * as service from '../../src/lib/arbo-guides/arbo-guide-run-service'

export async function verifyComplianceV2Database(db: PrismaClient, viewer: service.ArboGuideViewer, other: service.ArboGuideViewer) {
  const historical = await db.arboGuideRun.findMany({ include: { results: true }, orderBy: { id: 'asc' } })
  const d = v2Definition(), src = d.modules[0].rules[0].sources[0]
  const topic = await db.knowledgeTopic.create({ data: { slug: 'synthetic-f2', title: 'Test', description: 'Test', domain: 'OTHER' } })
  const source = await db.knowledgeSource.create({ data: { code: 'SYNTHETIC_F2', title: src.title, publisher: src.publisher, sourceUrl: src.url,
    sourceType: 'LEGISLATION', sourceFormat: 'HTML', copyrightClassification: 'PUBLIC_DOMAIN', authorityLevel: 'PRIMARY_LEGAL', sourceFamily: 'TEST', independenceGroup: 'TEST',
  } })
  await db.knowledgeSourceVersion.create({ data: { id: src.sourceVersionId, sourceId: source.id, versionLabel: 'test-1', checksum: src.sourceChecksum } })
  await db.knowledgeClaim.create({ data: { id: src.claimId, topicId: topic.id, externalKey: 'synthetic-f2', claimType: 'LEGAL_REQUIREMENT', statement: 'Synthetische testclaim', applicability: 'Test', createdByActor: 'F2_TEST', publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED', copyrightCheckPassed: true, reviewedByUserId: viewer.userId, reviewedAt: new Date(v2Context.scannedAt) } })
  await db.knowledgeCitation.create({ data: { id: src.id, claimId: src.claimId, sourceVersionId: src.sourceVersionId, supportType: 'DIRECT_SUPPORT' } })
  await db.complianceFrameworkVersion.create({ data: { id: d.id, frameworkCode: d.frameworkCode, version: d.version, title: d.title, disclaimer: d.disclaimer, methodology: 'Synthetische F2-test', checksum: complianceChecksum(d) } })
  for (const [i, m] of d.modules.entries()) {
    const moduleDefinition = await db.complianceModuleDefinition.create({ data: { frameworkVersionId: d.id, code: m.code, title: m.title, category: 'CORE', position: i + 1, defaultAssessmentMode: 'FULL' } })
    for (const [position, q] of m.questions.entries()) await db.complianceQuestionDefinition.create({ data: { id: q.id, moduleDefinitionId: moduleDefinition.id, code: q.code, prompt: q.prompt, inputType: q.inputType, isRequired: q.required, position: position + 1 } })
    for (const [position, r] of m.rules.entries()) await db.complianceRuleDefinition.create({ data: {
      id: r.id, frameworkVersionId: d.id, moduleDefinitionId: moduleDefinition.id, code: r.code, conditionSchema: r.condition,
      applicability: r.applicability, assessmentStatus: r.status, assessmentMode: r.mode, basis: r.basis,
      findingCode: r.code, findingTitle: m.title, findingBody: r.explanation, recommendedAction: r.nextStep, position: position + 1,
      knowledgeReferences: { create: { knowledgeClaimId: src.claimId, supportType: 'DIRECT_SUPPORT', isPrimary: true, position: 1 } },
    } })
  }
  const report = buildComplianceV2Report(d, v2Answers, v2Context)
  const input = { guideType: 'COMPLIANCE', guideVersion: '2', reportVersion: '2.0', complianceFrameworkVersionId: d.id,
    organizationId: viewer.organizationId, completedByUserId: viewer.userId, startedAt: new Date(v2Context.scannedAt), completedAt: new Date(v2Context.scannedAt),
    answersSnapshot: v2Answers, reportSnapshot: report, idempotencyKey: 'v2-concurrent-test',
  }
  await assert.rejects(service.completeArboGuideRun(input), 'DRAFT cannot create results')
  await db.complianceFrameworkVersion.update({ where: { id: d.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
  const invalid = async (patch: object) => assert.rejects(service.completeArboGuideRun({ ...input, idempotencyKey: 'v2-invalid-test', ...patch }))
  await invalid({ guideVersion: '1' }); await invalid({ complianceFrameworkVersionId: '7e44a647-0549-4d96-a14c-c1d783d11e01' })
  await invalid({ completedByUserId: other.userId }); await invalid({ organizationId: other.organizationId })
  await invalid({ reportSnapshot: { ...report, results: report.results.map((r, i) => i ? r : { ...r, explanation: 'Forged' }) } })
  await invalid({ reportSnapshot: { ...report, framework: { ...report.framework, checksum: 'b'.repeat(64) } } })
  assert.equal(await db.arboGuideRun.count(), historical.length)

  const race = await Promise.all(Array.from({ length: 6 }, () => service.completeArboGuideRun(input)))
  assert.equal(race.filter(r => r.created).length, 1)
  assert.equal(new Set(race.map(r => r.id)).size, 1)
  const run = await service.getArboGuideRun(viewer, race[0].id)
  assert.deepEqual(run.reportSnapshot, report)
  assert.deepEqual(run.results.map(r => r.assessmentStatus), ['IN_ORDER', 'ATTENTION_REQUIRED', 'ACTION_REQUIRED', 'NOT_ASSESSED', 'NOT_APPLICABLE'])
  assert.ok(run.results.every(r => r.status === null && r.resultSchemaVersion === 2))
  await assert.rejects(service.getArboGuideRun(other, run.id))
  await assert.rejects(db.arboGuideRunResult.updateMany({ where: { arboGuideRunId: run.id }, data: { assessmentStatus: 'IN_ORDER' } }))
  await assert.rejects(db.arboGuideRunResult.create({ data: { arboGuideRunId: run.id, subjectCode: 'C10', position: 10, title: 'Test', status: null, assessmentStatus: 'IN_ORDER', resultSchemaVersion: 2, explanation: 'Test', recommendedAction: 'Test', sourceIdsSnapshot: [] } }))
  await assert.rejects(db.complianceRuleDefinition.update({ where: { id: d.modules[0].rules[0].id }, data: { basis: 'PRACTICAL_RECOMMENDATION' } }))
  for (const role of ['OWNER', 'ADMIN', 'MEMBER'] as const) {
    await db.organizationMembership.update({ where: { userId: viewer.userId }, data: { role } })
    assert.equal((await service.completeArboGuideRun(input)).created, false)
  }
  await db.organizationMembership.update({ where: { userId: viewer.userId }, data: { status: 'SUSPENDED' } })
  await assert.rejects(service.completeArboGuideRun(input))
  await db.organizationMembership.update({ where: { userId: viewer.userId }, data: { status: 'ACTIVE' } })

  // Content changes invalidate NEW writes; completed snapshots remain byte/semantic stable.
  await assert.rejects(db.knowledgeSourceVersion.update({ where: { id: src.sourceVersionId }, data: { checksum: 'b'.repeat(64) } }))
  await db.knowledgeSource.update({ where: { id: source.id }, data: { title: 'Gewijzigde synthetische bronmetadata' } })
  await invalid({ idempotencyKey: 'source-drift-v2' })
  assert.equal((await service.completeArboGuideRun(input)).created, false)
  assert.deepEqual((await service.getArboGuideRun(viewer, run.id)).reportSnapshot, report)
  await db.complianceFrameworkVersion.update({ where: { id: d.id }, data: { status: 'RETIRED', retiredAt: new Date() } })
  await invalid({ idempotencyKey: 'retired-v2-new' })
  assert.equal((await service.completeArboGuideRun(input)).created, false)
  for (const old of historical) assert.deepEqual(await db.arboGuideRun.findUniqueOrThrow({ where: { id: old.id }, include: { results: true } }), old)
  assert.equal(await db.arboGuideRun.count(), historical.length + 1)
  console.log('F2 PostgreSQL PASS: five-status roundtrip; six requests/one run; forged snapshots, cross-tenant, inactive membership, draft/retired and checksum drift denied; v1 snapshots unchanged.')
}
