import { randomUUID } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import type { KnowledgeCanonicalSourceFamily, KnowledgeScopeEffect, KnowledgeSourceArtifactType, KnowledgeSourceAuthorityStatus, KnowledgeSourceFormat, KnowledgeSourceType, KnowledgeTemporalStatus } from '@/generated/prisma/enums'
import { getPrisma } from '@/lib/prisma'

type DatabaseClient = ReturnType<typeof getPrisma>
export type KnowledgeOnboardingInput = {
  source: { code: string; title: string; publisher: string; sourceType: KnowledgeSourceType; sourceFormat: KnowledgeSourceFormat; canonicalFamily: KnowledgeCanonicalSourceFamily; authorityStatus: KnowledgeSourceAuthorityStatus; canonicalUrl: string; jurisdiction: string; applicabilityScope: string; temporalStatus: KnowledgeTemporalStatus; sourceFamily: string; independenceGroup: string; isPrimarySource: boolean }
  version: { versionLabel: string; publicationDate?: Date; validFrom?: Date; validUntil?: Date; checksum: string }
  artifact: { type: KnowledgeSourceArtifactType; mediaType: string; locator: string; checksum: string; retrievedAt: Date }
  scopes: Array<{ jurisdiction: string; scopeCode: string; effect: KnowledgeScopeEffect; rationale: string }>
}

export class KnowledgeSourceOnboardingError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'KnowledgeSourceOnboardingError' }
}

function validate(input: KnowledgeOnboardingInput) {
  if (!/^[A-Z0-9][A-Z0-9._:-]{1,79}$/u.test(input.source.code)) throw new KnowledgeSourceOnboardingError('SOURCE_CODE_INVALID', 'Broncode is ongeldig.')
  let url: URL
  try { url = new URL(input.source.canonicalUrl) } catch { throw new KnowledgeSourceOnboardingError('CANONICAL_URL_INVALID', 'Canonieke bron-URL is ongeldig.') }
  if (url.protocol !== 'https:') throw new KnowledgeSourceOnboardingError('CANONICAL_URL_INVALID', 'Canonieke bron-URL moet HTTPS gebruiken.')
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

export async function onboardKnowledgeSource(input: KnowledgeOnboardingInput, database: DatabaseClient = getPrisma()) {
  validate(input)
  return database.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${input.source.code}))`)
    const existing = await tx.knowledgeSource.findUnique({ where: { code: input.source.code }, include: { versions: { include: { artifacts: true, applicabilityScopes: true } }, applicabilityScopes: true } })
    if (existing) {
      const version = existing.versions.find((candidate) => candidate.checksum === input.version.checksum)
      if (existing.sourceUrl !== input.source.canonicalUrl || existing.canonicalFamily !== input.source.canonicalFamily || existing.jurisdiction !== input.source.jurisdiction) throw new KnowledgeSourceOnboardingError('SOURCE_IDENTITY_CONFLICT', 'Broncode bestaat met een andere canonieke identiteit.')
      if (version) {
        const sameDate = (stored: Date | null, supplied?: Date) => (stored?.toISOString().slice(0, 10) ?? null) === (supplied?.toISOString().slice(0, 10) ?? null)
        if (version.versionLabel !== input.version.versionLabel
          || !sameDate(version.publicationDate, input.version.publicationDate)
          || !sameDate(version.validFrom, input.version.validFrom)
          || !sameDate(version.validUntil, input.version.validUntil)) throw new KnowledgeSourceOnboardingError('SOURCE_VERSION_METADATA_CONFLICT', 'Dezelfde artifactchecksum bestaat met afwijkende versiemetadata.')
        return { sourceId: existing.id, sourceVersionId: version.id, created: false }
      }
      if (existing.versions.some((candidate) => candidate.versionLabel === input.version.versionLabel)) throw new KnowledgeSourceOnboardingError('SOURCE_VERSION_CONFLICT', 'Versielabel bestaat met een andere checksum.')
      const sourceVersionId = randomUUID()
      await tx.knowledgeSourceVersion.create({ data: { id: sourceVersionId, sourceId: existing.id, versionLabel: input.version.versionLabel, publicationDate: input.version.publicationDate, validFrom: input.version.validFrom, validUntil: input.version.validUntil, checksum: input.version.checksum, extractionStatus: 'READY', reviewStatus: 'REVIEW_REQUIRED', artifacts: { create: { id: randomUUID(), artifactType: input.artifact.type, mediaType: input.artifact.mediaType, locator: input.artifact.locator, checksum: input.artifact.checksum, retrievedAt: input.artifact.retrievedAt } }, applicabilityScopes: { create: input.scopes.map((scope) => ({ id: randomUUID(), ...scope })) } } })
      return { sourceId: existing.id, sourceVersionId, created: true }
    }
    const sourceId = randomUUID(); const sourceVersionId = randomUUID()
    await tx.knowledgeSource.create({ data: {
      id: sourceId, code: input.source.code, title: input.source.title, publisher: input.source.publisher,
      sourceType: input.source.sourceType, sourceFormat: input.source.sourceFormat, canonicalFamily: input.source.canonicalFamily,
      authorityStatus: input.source.authorityStatus, sourceUrl: input.source.canonicalUrl, jurisdiction: input.source.jurisdiction,
      applicabilityScope: input.source.applicabilityScope, temporalStatus: input.source.temporalStatus, sourceFamily: input.source.sourceFamily,
      independenceGroup: input.source.independenceGroup, isPrimarySource: input.source.isPrimarySource,
      metadataStatus: 'COMPLETE', copyrightClassification: 'RESTRICTED_REFERENCE_ONLY', authorityLevel: input.source.authorityStatus === 'OFFICIAL_PRIMARY' ? 'PRIMARY_LEGAL' : 'OFFICIAL_GUIDANCE',
      versions: { create: { id: sourceVersionId, versionLabel: input.version.versionLabel, publicationDate: input.version.publicationDate, validFrom: input.version.validFrom, validUntil: input.version.validUntil, checksum: input.version.checksum, extractionStatus: 'READY', reviewStatus: 'REVIEW_REQUIRED', artifacts: { create: { id: randomUUID(), artifactType: input.artifact.type, mediaType: input.artifact.mediaType, locator: input.artifact.locator, checksum: input.artifact.checksum, retrievedAt: input.artifact.retrievedAt } }, applicabilityScopes: { create: input.scopes.map((scope) => ({ id: randomUUID(), ...scope })) } } },
    } })
    return { sourceId, sourceVersionId, created: true }
  }, { isolationLevel: 'Serializable' })
}
