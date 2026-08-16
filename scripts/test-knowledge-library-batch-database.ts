import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { getPrisma } from '../src/lib/prisma'
import { storeKnowledgeDocumentFamily } from '../src/lib/knowledge/knowledge-document-family-service'

async function main() {
  if (!process.env.DATABASE_URL || /neon|production/iu.test(process.env.DATABASE_URL)) throw new Error('TEST_DATABASE_REQUIRED')
  const database = getPrisma()
  const sourceId = randomUUID(); const firstVersionId = randomUUID(); const secondVersionId = randomUUID()
  await database.knowledgeSource.create({ data: {
    id: sourceId, code: `LIBRARY-${sourceId}`, title: 'Tijdelijke documentfamilie', sourceType: 'PROFESSIONAL_GUIDANCE', sourceFormat: 'PDF',
    metadataStatus: 'COMPLETE', copyrightClassification: 'INTERNAL', authorityLevel: 'PROFESSIONAL_GUIDANCE', temporalStatus: 'CURRENT', sourceFamily: 'NVAB',
    canonicalFamily: 'NVAB', authorityStatus: 'PROFESSIONAL_REFERENCE', independenceGroup: 'NVAB', versions: { create: [
      { id: firstVersionId, versionLabel: 'richtlijn-1', checksum: 'a'.repeat(64) },
      { id: secondVersionId, versionLabel: 'achtergrond-1', checksum: 'b'.repeat(64) },
    ] },
  } })
  const input = { code: `FAMILY-${sourceId}`, title: 'Richtlijn met achtergronddocument', members: [
    { sourceVersionId: firstVersionId, role: 'PRIMARY_GUIDELINE' as const, sequence: 1 },
    { sourceVersionId: secondVersionId, role: 'BACKGROUND_EVIDENCE' as const, sequence: 2 },
  ] }
  const first = await storeKnowledgeDocumentFamily(input, database)
  const replay = await storeKnowledgeDocumentFamily(input, database)
  assert.equal(first.created, true); assert.deepEqual(replay, { documentFamilyId: first.documentFamilyId, created: false })
  await assert.rejects(() => storeKnowledgeDocumentFamily({ ...input, title: 'Conflict' }, database), /KNOWLEDGE_DOCUMENT_FAMILY_CONFLICT/)
  await assert.rejects(() => database.knowledgeDocumentFamily.update({ where: { id: first.documentFamilyId }, data: { title: 'Mutatie' } }), /immutable/iu)
  await assert.rejects(() => database.knowledgeDocumentFamilyMember.deleteMany({ where: { documentFamilyId: first.documentFamilyId } }), /immutable/iu)
  const stored = await database.knowledgeDocumentFamily.findUniqueOrThrow({ where: { id: first.documentFamilyId }, include: { members: { orderBy: { sequence: 'asc' } } } })
  assert.deepEqual(stored.members.map(({ role, sequence }) => ({ role, sequence })), [{ role: 'PRIMARY_GUIDELINE', sequence: 1 }, { role: 'BACKGROUND_EVIDENCE', sequence: 2 }])
  console.info('Knowledge Library database-integratietest geslaagd.')
  await database.$disconnect()
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1 })
