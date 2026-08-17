import { randomUUID } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import type { KnowledgeCanonicalSourceFamily, KnowledgeScopeEffect, KnowledgeSourceArtifactType, KnowledgeSourceAuthorityStatus, KnowledgeSourceFormat, KnowledgeSourceType, KnowledgeTemporalStatus } from '@/generated/prisma/enums'
import { type CanonicalIdentityInput, KnowledgeCanonicalIdentityError, resolveCanonicalIdentity } from '@/lib/knowledge/knowledge-canonical-source-identity'
import { getPrisma } from '@/lib/prisma'

type DatabaseClient = ReturnType<typeof getPrisma>
type TransactionClient = Prisma.TransactionClient
export type KnowledgeOnboardingInput = {
  source: { code: string; title: string; publisher: string; sourceType: KnowledgeSourceType; sourceFormat: KnowledgeSourceFormat; canonicalFamily: KnowledgeCanonicalSourceFamily; authorityStatus: KnowledgeSourceAuthorityStatus; canonicalUrl?: string; canonicalIdentity?: CanonicalIdentityInput; jurisdiction: string; applicabilityScope: string; temporalStatus: KnowledgeTemporalStatus; sourceFamily: string; independenceGroup: string; isPrimarySource: boolean }
  version: { versionLabel: string; publicationDate?: Date; validFrom?: Date; validUntil?: Date; checksum: string }
  artifact: { type: KnowledgeSourceArtifactType; mediaType: string; locator: string; checksum: string; retrievedAt: Date }
  scopes: Array<{ jurisdiction: string; scopeCode: string; effect: KnowledgeScopeEffect; rationale: string }>
}

export class KnowledgeSourceOnboardingError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'KnowledgeSourceOnboardingError' }
}

function identity(input: KnowledgeOnboardingInput) {
  const supplied = input.source.canonicalIdentity ?? { type: 'URL' as const, url: input.source.canonicalUrl ?? '' }
  let resolved: ReturnType<typeof resolveCanonicalIdentity>
  try { resolved = resolveCanonicalIdentity(supplied) } catch (error) {
    if (error instanceof KnowledgeCanonicalIdentityError) throw new KnowledgeSourceOnboardingError(error.code, error.message)
    throw error
  }
  if (resolved.identityType === 'URL' && input.source.canonicalUrl && input.source.canonicalUrl !== resolved.canonicalUrl) throw new KnowledgeSourceOnboardingError('CANONICAL_URL_CONFLICT', 'Canonieke URL en URL-identiteit verschillen.')
  if (resolved.identityType === 'BIBLIOGRAPHIC') {
    if (input.source.canonicalUrl) throw new KnowledgeSourceOnboardingError('BIBLIOGRAPHIC_URL_CONFLICT', 'Een bibliografische identiteit mag geen canonieke URL claimen.')
    if (input.source.publisher.trim() !== resolved.bibliographicPublisher || input.source.title.trim() !== resolved.bibliographicTitle) throw new KnowledgeSourceOnboardingError('BIBLIOGRAPHIC_SOURCE_METADATA_CONFLICT', 'Titel en uitgever moeten exact overeenkomen met de bibliografische identiteit.')
  }
  return resolved
}

function validate(input: KnowledgeOnboardingInput) {
  if (!/^[A-Z0-9][A-Z0-9._:-]{1,79}$/u.test(input.source.code)) throw new KnowledgeSourceOnboardingError('SOURCE_CODE_INVALID', 'Broncode is ongeldig.')
  identity(input)
  if (!/^[0-9a-f]{64}$/u.test(input.version.checksum) || input.version.checksum !== input.artifact.checksum) throw new KnowledgeSourceOnboardingError('ARTIFACT_CHECKSUM_INVALID', 'Artifact en bronversie moeten dezelfde geldige checksum hebben.')
  for (const value of [input.version.publicationDate, input.version.validFrom, input.version.validUntil]) {
    if (value && Number.isNaN(value.getTime())) throw new KnowledgeSourceOnboardingError('SOURCE_VERSION_DATE_INVALID', 'Bronversiedatum is ongeldig.')
  }
  if (input.version.validFrom && input.version.validUntil && input.version.validUntil < input.version.validFrom) throw new KnowledgeSourceOnboardingError('SOURCE_VERSION_DATE_RANGE_INVALID', 'De einddatum mag niet vóór de begindatum liggen.')
  if (!input.source.jurisdiction.trim() || !input.source.applicabilityScope.trim() || !input.scopes.length) throw new KnowledgeSourceOnboardingError('SOURCE_SCOPE_REQUIRED', 'Jurisdictie en toepassingsscope zijn verplicht.')
  if (input.source.canonicalFamily === 'PGS') {
    const hasOnlyRequiredScope = input.source.jurisdiction === 'NL'
      && input.scopes.every((scope) => scope.jurisdiction === 'NL' && scope.scopeCode === 'SEVESO' && scope.effect === 'CONDITIONAL')
    if (!hasOnlyRequiredScope) throw new KnowledgeSourceOnboardingError('PGS_SCOPE_REQUIRED', 'PGS moet fail-closed als NL / SEVESO / CONDITIONAL zijn begrensd.')
  }
}

export async function onboardKnowledgeSourceInTransaction(input: KnowledgeOnboardingInput, tx: TransactionClient) {
  validate(input)
  const canonicalIdentity = identity(input)
  await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${`${input.source.code}:${canonicalIdentity.canonicalFingerprint}`}))`)
  const existing = await tx.knowledgeSource.findUnique({ where: { code: input.source.code }, include: { canonicalIdentity: true, versions: { include: { artifacts: true, applicabilityScopes: true } }, applicabilityScopes: true } })
  const fingerprintOwner = await tx.knowledgeSourceCanonicalIdentity.findUnique({ where: { canonicalFingerprint: canonicalIdentity.canonicalFingerprint }, select: { sourceId: true } })
  if (fingerprintOwner && fingerprintOwner.sourceId !== existing?.id) throw new KnowledgeSourceOnboardingError('CANONICAL_IDENTITY_CONFLICT', 'Canonieke identiteit hoort al bij een andere bron.')
  if (canonicalIdentity.bibliographicIsbn) {
    const isbnOwner = await tx.knowledgeSourceCanonicalIdentity.findFirst({ where: { bibliographicIsbn: canonicalIdentity.bibliographicIsbn }, select: { sourceId: true, canonicalFingerprint: true } })
    if (isbnOwner && (isbnOwner.sourceId !== existing?.id || isbnOwner.canonicalFingerprint !== canonicalIdentity.canonicalFingerprint)) throw new KnowledgeSourceOnboardingError('BIBLIOGRAPHIC_ISBN_CONFLICT', 'ISBN hoort al bij conflicterende bibliografische metadata.')
  }
  if (existing) {
    const version = existing.versions.find((candidate) => candidate.checksum === input.version.checksum)
    const legacyUrlMatch = !existing.canonicalIdentity && canonicalIdentity.identityType === 'URL' && existing.sourceUrl === canonicalIdentity.canonicalUrl
    if ((!legacyUrlMatch && existing.canonicalIdentity?.canonicalFingerprint !== canonicalIdentity.canonicalFingerprint) || existing.canonicalFamily !== input.source.canonicalFamily || existing.jurisdiction !== input.source.jurisdiction) throw new KnowledgeSourceOnboardingError('SOURCE_IDENTITY_CONFLICT', 'Broncode bestaat met een andere canonieke identiteit.')
    if (version) {
      const sameDate = (stored: Date | null, supplied?: Date) => (stored?.toISOString().slice(0, 10) ?? null) === (supplied?.toISOString().slice(0, 10) ?? null)
      if (version.versionLabel !== input.version.versionLabel
        || !sameDate(version.publicationDate, input.version.publicationDate)
        || !sameDate(version.validFrom, input.version.validFrom)
        || !sameDate(version.validUntil, input.version.validUntil)) throw new KnowledgeSourceOnboardingError('SOURCE_VERSION_METADATA_CONFLICT', 'Dezelfde artifactchecksum bestaat met afwijkende versiemetadata.')
      return { sourceId: existing.id, sourceVersionId: version.id, created: false }
    }
    if (canonicalIdentity.identityType === 'BIBLIOGRAPHIC') throw new KnowledgeSourceOnboardingError('BIBLIOGRAPHIC_ARTIFACT_CONFLICT', 'Een bibliografische editie kan niet stilzwijgend een ander artifact krijgen; maak een nieuwe identiteit of supersession.')
    if (existing.versions.some((candidate) => candidate.versionLabel === input.version.versionLabel)) throw new KnowledgeSourceOnboardingError('SOURCE_VERSION_CONFLICT', 'Versielabel bestaat met een andere checksum.')
    const sourceVersionId = randomUUID()
    await tx.knowledgeSourceVersion.create({ data: { id: sourceVersionId, sourceId: existing.id, versionLabel: input.version.versionLabel, publicationDate: input.version.publicationDate, validFrom: input.version.validFrom, validUntil: input.version.validUntil, checksum: input.version.checksum, extractionStatus: 'READY', reviewStatus: 'REVIEW_REQUIRED', artifacts: { create: { id: randomUUID(), artifactType: input.artifact.type, mediaType: input.artifact.mediaType, locator: input.artifact.locator, checksum: input.artifact.checksum, retrievedAt: input.artifact.retrievedAt } }, applicabilityScopes: { create: input.scopes.map((scope) => ({ id: randomUUID(), ...scope })) } } })
    return { sourceId: existing.id, sourceVersionId, created: true }
  }
  const sourceId = randomUUID(); const sourceVersionId = randomUUID()
  await tx.knowledgeSource.create({ data: {
    id: sourceId, code: input.source.code, title: input.source.title, publisher: input.source.publisher,
    sourceType: input.source.sourceType, sourceFormat: input.source.sourceFormat, canonicalFamily: input.source.canonicalFamily,
    authorityStatus: input.source.authorityStatus, sourceUrl: canonicalIdentity.canonicalUrl, jurisdiction: input.source.jurisdiction,
    applicabilityScope: input.source.applicabilityScope, temporalStatus: input.source.temporalStatus, sourceFamily: input.source.sourceFamily,
    independenceGroup: input.source.independenceGroup, isPrimarySource: input.source.isPrimarySource,
    metadataStatus: 'COMPLETE', copyrightClassification: 'RESTRICTED_REFERENCE_ONLY', authorityLevel: input.source.authorityStatus === 'OFFICIAL_PRIMARY' ? 'PRIMARY_LEGAL' : 'OFFICIAL_GUIDANCE',
    canonicalIdentity: { create: { id: randomUUID(), ...canonicalIdentity } },
    versions: { create: { id: sourceVersionId, versionLabel: input.version.versionLabel, publicationDate: input.version.publicationDate, validFrom: input.version.validFrom, validUntil: input.version.validUntil, checksum: input.version.checksum, extractionStatus: 'READY', reviewStatus: 'REVIEW_REQUIRED', artifacts: { create: { id: randomUUID(), artifactType: input.artifact.type, mediaType: input.artifact.mediaType, locator: input.artifact.locator, checksum: input.artifact.checksum, retrievedAt: input.artifact.retrievedAt } }, applicabilityScopes: { create: input.scopes.map((scope) => ({ id: randomUUID(), ...scope })) } } },
  } })
  return { sourceId, sourceVersionId, created: true }
}

export async function onboardKnowledgeSource(input: KnowledgeOnboardingInput, database: DatabaseClient = getPrisma()) {
  validate(input)
  return database.$transaction((tx) => onboardKnowledgeSourceInTransaction(input, tx), { isolationLevel: 'Serializable' })
}
