import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { normalizeKnowledgeSourceText } from './knowledge-extractor'
import { fingerprintKnowledgeImportPackage } from './knowledge-import-fingerprint'
import { reviewedKnowledgeAttachmentPackageSchema, type ReviewedKnowledgeAttachmentPackage } from './knowledge-import-schema'
import { KnowledgeImportError, assertKnowledgeImportAuthorization, readKnowledgeImportPackage, verifyKnowledgePackageSource } from './knowledge-import-service'

type AttachOptions = { confirm: boolean; actorUserId?: string }

async function readAttachment(fileName: string) {
  const validated = await readKnowledgeImportPackage(fileName)
  const parsed = reviewedKnowledgeAttachmentPackageSchema.safeParse(validated.package)
  if (!parsed.success) throw new KnowledgeImportError('ATTACHMENT_VALIDATION_FAILED', parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('\n'))
  return { data: parsed.data, counts: validated.validation.counts }
}

function assertAttachmentCitationEvidence(data: ReviewedKnowledgeAttachmentPackage) {
  for (const citation of data.citations) {
    const fragment = data.fragments.find((entry) => entry.externalKey === citation.fragmentKey)
    if (!fragment?.sourceBlockEvidence?.length) throw new KnowledgeImportError('BLOCK_EVIDENCE_REQUIRED', `Fragment ${citation.fragmentKey ?? ''} mist bronblokevidence.`)
    const roles = new Set(fragment.sourceBlockEvidence.map((entry) => entry.evidenceRole))
    if (roles.size !== 1 || !roles.has(citation.supportType as 'DIRECT_SUPPORT' | 'CONTEXT')) {
      throw new KnowledgeImportError('EVIDENCE_ROLE_MISMATCH', `Evidence-rol van ${fragment.externalKey} komt niet overeen met de citatie.`)
    }
  }
}

function sameNullableDate(actual: Date | null, expected?: string) {
  return (actual?.toISOString().slice(0, 10) ?? null) === (expected ?? null)
}

async function findTargetVersion(data: ReviewedKnowledgeAttachmentPackage) {
  return getPrisma().knowledgeSourceVersion.findFirst({
    where: { source: { code: data.source.code }, versionLabel: data.sourceVersion.versionLabel, supersededByVersion: { is: null } },
    include: { source: true },
    orderBy: { importRevision: 'desc' },
  })
}

async function validateEvidence(
  tx: Prisma.TransactionClient,
  data: ReviewedKnowledgeAttachmentPackage,
  sourceVersionId: string,
) {
  const requested = data.fragments.flatMap((fragment) => fragment.sourceBlockEvidence ?? [])
  const uniqueIds = [...new Set(requested.map((entry) => entry.sourceBlockId))]
  const blocks = await tx.knowledgeSourceBlock.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, textHash: true, exactText: true, sourcePage: { select: { extractionRun: { select: { sourceVersionId: true, status: true } } } } },
  })
  const byId = new Map(blocks.map((block) => [block.id, block]))
  for (const fragment of data.fragments) {
    const normalizedExcerpt = normalizeKnowledgeSourceText(fragment.internalExcerpt ?? '')
    for (const evidence of fragment.sourceBlockEvidence ?? []) {
      if (evidence.sourceVersionId !== sourceVersionId) throw new KnowledgeImportError('SOURCE_VERSION_MISMATCH', `Evidence van ${fragment.externalKey} verwijst naar een andere bronversie.`)
      const block = byId.get(evidence.sourceBlockId)
      if (!block) throw new KnowledgeImportError('SOURCE_BLOCK_NOT_FOUND', `Bronblok van ${fragment.externalKey} bestaat niet.`)
      if (block.sourcePage.extractionRun.sourceVersionId !== sourceVersionId) throw new KnowledgeImportError('SOURCE_BLOCK_VERSION_MISMATCH', `Bronblok van ${fragment.externalKey} hoort bij een andere bronversie.`)
      if (block.sourcePage.extractionRun.status !== 'COMPLETED') throw new KnowledgeImportError('EXTRACTION_NOT_COMPLETED', `Bronblok van ${fragment.externalKey} hoort niet bij een voltooide extractie.`)
      if (block.textHash !== evidence.blockTextHash) throw new KnowledgeImportError('SOURCE_BLOCK_HASH_MISMATCH', `Bronblokhash van ${fragment.externalKey} wijkt af.`)
      if (!normalizedExcerpt || !normalizeKnowledgeSourceText(block.exactText).includes(normalizedExcerpt)) {
        throw new KnowledgeImportError('SOURCE_PASSAGE_MISMATCH', `Bronpassage van ${fragment.externalKey} komt niet exact voor in het opgegeven blok.`)
      }
    }
  }
}

async function exactReplay(
  tx: Prisma.TransactionClient,
  data: ReviewedKnowledgeAttachmentPackage,
  sourceVersionId: string,
) {
  const fragmentKeys = data.fragments.map((entry) => entry.externalKey)
  const claimKeys = data.claims.map((entry) => entry.externalKey)
  const [fragments, claims] = await Promise.all([
    tx.knowledgeFragment.findMany({ where: { externalKey: { in: fragmentKeys } }, include: { sourceBlocks: { orderBy: { sequence: 'asc' } } } }),
    tx.knowledgeClaim.findMany({ where: { externalKey: { in: claimKeys } }, include: { topic: true, citations: { include: { fragment: true } } } }),
  ])
  if (fragments.length === 0 && claims.length === 0) return false
  if (fragments.length !== data.fragments.length || claims.length !== data.claims.length) throw new KnowledgeImportError('ATTACHMENT_CONTENT_MISMATCH', 'De attachment bestaat gedeeltelijk of gebruikt reeds bestaande codes.')
  for (const expected of data.fragments) {
    const actual = fragments.find((entry) => entry.externalKey === expected.externalKey)
    const evidenceIds = expected.sourceBlockEvidence?.map((entry) => entry.sourceBlockId) ?? []
    if (!actual || actual.sourceVersionId !== sourceVersionId || actual.pageFrom !== (expected.pageFrom ?? null) || actual.pageTo !== (expected.pageTo ?? null) || actual.sectionPath !== (expected.sectionPath ?? null) || actual.fragmentType !== expected.fragmentType || actual.internalExcerpt !== (expected.internalExcerpt ?? null) || actual.excerptHash !== (expected.excerptHash ?? null) || actual.extractionMethod !== expected.extractionMethod || actual.requiresReview !== expected.requiresReview || JSON.stringify(actual.sourceBlocks.map((entry) => entry.blockId)) !== JSON.stringify(evidenceIds)) {
      throw new KnowledgeImportError('ATTACHMENT_CONTENT_MISMATCH', `Fragment ${expected.externalKey} wijkt af van de bestaande attachment.`)
    }
  }
  for (const expected of data.claims) {
    const actual = claims.find((entry) => entry.externalKey === expected.externalKey)
    const expectedCitations = data.citations.filter((entry) => entry.claimKey === expected.externalKey).map((entry) => `${entry.fragmentKey}:${entry.supportType}:${entry.citationNote ?? ''}`).sort()
    const actualCitations = actual?.citations.filter((entry) => entry.sourceVersionId === sourceVersionId).map((entry) => `${entry.fragment?.externalKey ?? ''}:${entry.supportType}:${entry.citationNote ?? ''}`).sort() ?? []
    if (!actual || actual.topic.slug !== data.topics.find((topic) => topic.externalKey === expected.topicKey)?.slug || actual.claimType !== expected.claimType || actual.statement !== expected.statement || actual.normalizedStatement !== (expected.normalizedStatement ?? null) || actual.applicability !== expected.applicability || actual.jurisdiction !== expected.jurisdiction || !sameNullableDate(actual.validFrom, expected.validFrom) || !sameNullableDate(actual.validUntil, expected.validUntil) || actual.temporalStatus !== expected.temporalStatus || actual.validationStatus !== expected.validationStatus || actual.publicationStatus !== expected.publicationStatus || actual.confidenceLevel !== expected.confidenceLevel || actual.accessTier !== expected.accessTier || actual.controlRisk !== expected.controlRisk || JSON.stringify(actualCitations) !== JSON.stringify(expectedCitations)) {
      throw new KnowledgeImportError('ATTACHMENT_CONTENT_MISMATCH', `Claim ${expected.externalKey} wijkt af van de bestaande attachment.`)
    }
  }
  return true
}

export async function previewReviewedKnowledgeAttachment(fileName: string) {
  const { data, counts } = await readAttachment(fileName)
  assertAttachmentCitationEvidence(data)
  await verifyKnowledgePackageSource(data.source.code, data.sourceVersion.checksum)
  const version = await findTargetVersion(data)
  if (!version) throw new KnowledgeImportError('SOURCE_VERSION_NOT_FOUND', 'De bestaande bronversie is niet gevonden.')
  const database = getPrisma()
  await validateEvidence(database as unknown as Prisma.TransactionClient, data, version.id)
  const completedRuns = await database.knowledgeExtractionRun.count({ where: { sourceVersionId: version.id, status: 'COMPLETED' } })
  const [claimConflicts, fragmentConflicts] = await Promise.all([
    database.knowledgeClaim.count({ where: { externalKey: { in: data.claims.map((entry) => entry.externalKey) } } }),
    database.knowledgeFragment.count({ where: { externalKey: { in: data.fragments.map((entry) => entry.externalKey) } } }),
  ])
  return { sourceId: version.sourceId, sourceVersionId: version.id, completedRuns, counts, claimConflicts, fragmentConflicts, attachmentFingerprint: fingerprintKnowledgeImportPackage(data), writable: completedRuns > 0 && claimConflicts === 0 && fragmentConflicts === 0 }
}

export async function attachReviewedKnowledgeToExistingSourceVersion(fileName: string, options: AttachOptions) {
  if (!options.confirm) throw new KnowledgeImportError('CONFIRMATION_REQUIRED', 'Attachment vereist expliciet --confirm.')
  const { data, counts } = await readAttachment(fileName)
  assertAttachmentCitationEvidence(data)
  await verifyKnowledgePackageSource(data.source.code, data.sourceVersion.checksum)
  const database = getPrisma()
  return database.$transaction(async (tx) => {
    await assertKnowledgeImportAuthorization(tx, options.actorUserId)
    const version = await tx.knowledgeSourceVersion.findFirst({ where: { source: { code: data.source.code }, versionLabel: data.sourceVersion.versionLabel, supersededByVersion: { is: null } }, include: { source: true }, orderBy: { importRevision: 'desc' } })
    if (!version) throw new KnowledgeImportError('SOURCE_VERSION_NOT_FOUND', 'De bestaande bronversie is niet gevonden.')
    await tx.$queryRaw`SELECT "id" FROM "KnowledgeSourceVersion" WHERE "id" = ${version.id}::uuid FOR UPDATE`
    if (version.checksum !== data.sourceVersion.checksum || version.source.title !== data.source.title || version.source.sourceType !== data.source.sourceType || version.source.sourceFormat !== data.source.sourceFormat) throw new KnowledgeImportError('SOURCE_VERSION_MISMATCH', 'Pakket en bestaande bronversie komen niet exact overeen.')
    await validateEvidence(tx, data, version.id)
    if (await exactReplay(tx, data, version.id)) return { sourceId: version.sourceId, sourceVersionId: version.id, counts, reused: true }

    const topics = new Map<string, string>()
    for (const topic of data.topics) {
      const existing = await tx.knowledgeTopic.findUnique({ where: { slug: topic.slug } })
      if (existing && (existing.title !== topic.title || existing.description !== topic.description || existing.domain !== topic.domain)) throw new KnowledgeImportError('TOPIC_CONFLICT', `Topic ${topic.slug} wijkt af.`)
      const stored = existing ?? await tx.knowledgeTopic.create({ data: { slug: topic.slug, title: topic.title, description: topic.description, domain: topic.domain } })
      topics.set(topic.externalKey, stored.id)
    }
    const fragmentIds = new Map<string, string>()
    for (const fragment of data.fragments) {
      const stored = await tx.knowledgeFragment.create({ data: { externalKey: fragment.externalKey, sourceVersionId: version.id, pageFrom: fragment.pageFrom, pageTo: fragment.pageTo, sectionPath: fragment.sectionPath, fragmentType: fragment.fragmentType, internalExcerpt: fragment.internalExcerpt, excerptHash: fragment.excerptHash, extractionMethod: fragment.extractionMethod, requiresReview: fragment.requiresReview } })
      fragmentIds.set(fragment.externalKey, stored.id)
      await tx.knowledgeFragmentBlock.createMany({ data: (fragment.sourceBlockEvidence ?? []).map((evidence, index) => ({ fragmentId: stored.id, blockId: evidence.sourceBlockId, sequence: index + 1 })) })
    }
    const claimIds = new Map<string, string>()
    for (const claim of data.claims) {
      const topicId = topics.get(claim.topicKey)
      if (!topicId) throw new KnowledgeImportError('UNKNOWN_TOPIC', `Claimtopic van ${claim.externalKey} ontbreekt.`)
      const stored = await tx.knowledgeClaim.create({ data: { externalKey: claim.externalKey, topicId, claimType: claim.claimType, statement: claim.statement, normalizedStatement: claim.normalizedStatement, applicability: claim.applicability, jurisdiction: claim.jurisdiction, validFrom: claim.validFrom ? new Date(claim.validFrom) : undefined, validUntil: claim.validUntil ? new Date(claim.validUntil) : undefined, temporalStatus: claim.temporalStatus, validationStatus: claim.validationStatus, publicationStatus: claim.publicationStatus, confidenceLevel: claim.confidenceLevel, accessTier: claim.accessTier, controlRisk: claim.controlRisk, sourceControlStatus: 'OUTDATED', createdByActor: data.importMetadata.createdBy, createdByUserId: options.actorUserId } })
      claimIds.set(claim.externalKey, stored.id)
    }
    for (const citation of data.citations) await tx.knowledgeCitation.create({ data: { claimId: claimIds.get(citation.claimKey)!, sourceVersionId: version.id, fragmentId: fragmentIds.get(citation.fragmentKey!)!, supportType: citation.supportType, citationNote: citation.citationNote } })
    await tx.knowledgeAuditEvent.create({ data: { eventType: 'IMPORT_COMPLETED', entityType: 'KnowledgeSourceVersion', entityId: version.id, actorUserId: options.actorUserId, actorType: options.actorUserId ? 'PLATFORM_ADMIN' : 'LOCAL_CLI', result: 'SUCCESS', metadata: { mode: 'REVIEWED_ATTACHMENT', fingerprint: fingerprintKnowledgeImportPackage(data), claimCount: data.claims.length, fragmentCount: data.fragments.length } } })
    return { sourceId: version.sourceId, sourceVersionId: version.id, counts, reused: false }
  }, { isolationLevel: 'Serializable' })
}
