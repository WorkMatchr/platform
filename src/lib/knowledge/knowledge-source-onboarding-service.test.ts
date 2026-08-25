import { describe, expect, it, vi } from 'vitest'
import { onboardKnowledgeSource, type KnowledgeOnboardingInput } from './knowledge-source-onboarding-service'

const base: KnowledgeOnboardingInput = {
  source: { code: 'PGS-6-2023', title: 'PGS 6:2023', publisher: 'PGS-beheerorganisatie', sourceType: 'PROFESSIONAL_GUIDANCE', sourceFormat: 'PDF', canonicalFamily: 'PGS', authorityStatus: 'AUTHORIZED_PUBLICATION', canonicalUrl: 'https://publicatiereeksgevaarlijkestoffen.nl/publicaties/online/pgs-6/2023', jurisdiction: 'NL', applicabilityScope: 'Seveso-inrichtingen', temporalStatus: 'CURRENT', sourceFamily: 'PGS', independenceGroup: 'PGS', isPrimarySource: false },
  version: { versionLabel: '2023-1.0', checksum: 'a'.repeat(64) },
  artifact: { type: 'BROWSER_RENDERED_SNAPSHOT', mediaType: 'application/pdf', locator: 'local-sources/pgs/PGS 6.pdf', checksum: 'a'.repeat(64), retrievedAt: new Date('2026-08-16T00:00:00Z') },
  scopes: [{ jurisdiction: 'NL', scopeCode: 'SEVESO', effect: 'CONDITIONAL', rationale: 'Alleen toepassen binnen de expliciete Seveso-scope.' }],
}

describe('multi-source onboarding', () => {
  const identityDelegate = () => ({ findUnique: vi.fn().mockResolvedValue(null), findFirst: vi.fn().mockResolvedValue(null) })
  it('staat uitsluitend NL / SEVESO / CONDITIONAL toe voor PGS', async () => {
    const allowedDatabase = { $transaction: vi.fn().mockResolvedValue({ created: true }) }
    await expect(onboardKnowledgeSource(base, allowedDatabase as never)).resolves.toEqual({ created: true })
    expect(allowedDatabase.$transaction).toHaveBeenCalledOnce()
  })

  it.each([
    ['bronjurisdictie US', { source: { ...base.source, jurisdiction: 'US' } }],
    ['applicability-jurisdictie US', { scopes: [{ ...base.scopes[0], jurisdiction: 'US' }] }],
    ['lege applicability-jurisdictie', { scopes: [{ ...base.scopes[0], jurisdiction: ' ' }] }],
    ['algemene scope', { scopes: [{ ...base.scopes[0], scopeCode: 'GENERAL' }] }],
    ['generiek effect', { scopes: [{ ...base.scopes[0], effect: 'APPLIES' as const }] }],
    ['geldige plus generieke scope', { scopes: [base.scopes[0], { ...base.scopes[0], scopeCode: 'GENERAL', effect: 'APPLIES' as const }] }],
    ['ontbrekende applicability', { scopes: [] }],
    ['lege bronjurisdictie', { source: { ...base.source, jurisdiction: ' ' } }],
  ])('weigert PGS met %s vóór databasetoegang', async (_label, change) => {
    const database = { $transaction: vi.fn() }
    const candidate = { ...base, ...change } as KnowledgeOnboardingInput
    await expect(onboardKnowledgeSource(candidate, database as never)).rejects.toMatchObject({ code: expect.stringMatching(/^(PGS_SCOPE_REQUIRED|SOURCE_SCOPE_REQUIRED)$/u) })
    expect(database.$transaction).not.toHaveBeenCalled()
  })

  it('weigert een niet-HTTPS canonieke bron en checksumverschil', async () => {
    const database = { $transaction: vi.fn() }
    await expect(onboardKnowledgeSource({ ...base, source: { ...base.source, canonicalUrl: 'http://example.invalid' } }, database as never)).rejects.toMatchObject({ code: 'CANONICAL_URL_INVALID' })
    await expect(onboardKnowledgeSource({ ...base, artifact: { ...base.artifact, checksum: 'b'.repeat(64) } }, database as never)).rejects.toMatchObject({ code: 'ARTIFACT_CHECKSUM_INVALID' })
  })

  it('weigert ongeldige geldigheidsdata en een omgekeerde periode vóór databasetoegang', async () => {
    const database = { $transaction: vi.fn() }
    await expect(onboardKnowledgeSource({ ...base, version: { ...base.version, validFrom: new Date('ongeldig') } }, database as never)).rejects.toMatchObject({ code: 'SOURCE_VERSION_DATE_INVALID' })
    await expect(onboardKnowledgeSource({ ...base, version: { ...base.version, validFrom: new Date('2026-07-02'), validUntil: new Date('2026-07-01') } }, database as never)).rejects.toMatchObject({ code: 'SOURCE_VERSION_DATE_RANGE_INVALID' })
    expect(database.$transaction).not.toHaveBeenCalled()
  })

  it('schrijft geldigheidsdata in het create-pad voor een nieuwe bron', async () => {
    const create = vi.fn().mockResolvedValue({})
    const transaction = { $executeRaw: vi.fn(), knowledgeSource: { findUnique: vi.fn().mockResolvedValue(null), create }, knowledgeSourceCanonicalIdentity: identityDelegate() }
    const database = { $transaction: vi.fn(async (callback) => callback(transaction)) }
    const validFrom = new Date('2026-07-01')
    const validUntil = new Date('2026-12-31')
    await onboardKnowledgeSource({ ...base, version: { ...base.version, validFrom, validUntil } }, database as never)
    expect(create.mock.calls[0][0].data.versions.create).toMatchObject({ validFrom, validUntil })
  })

  it('schrijft geldigheidsdata ook voor een nieuwe versie van een bestaande bron', async () => {
    const create = vi.fn().mockResolvedValue({})
    const transaction = {
      $executeRaw: vi.fn(),
      knowledgeSource: { findUnique: vi.fn().mockResolvedValue({ ...base.source, sourceUrl: base.source.canonicalUrl, versions: [] }) },
      knowledgeSourceCanonicalIdentity: identityDelegate(),
      knowledgeSourceVersion: { create },
    }
    const database = { $transaction: vi.fn(async (callback) => callback(transaction)) }
    const validFrom = new Date('2026-07-01')
    await onboardKnowledgeSource({ ...base, version: { ...base.version, validFrom } }, database as never)
    expect(create.mock.calls[0][0].data).toMatchObject({ validFrom })
  })

  it('weigert dezelfde checksum met afwijkende geldigheidsmetadata', async () => {
    const transaction = {
      $executeRaw: vi.fn(),
      knowledgeSource: { findUnique: vi.fn().mockResolvedValue({ ...base.source, sourceUrl: base.source.canonicalUrl, versions: [{ id: 'version-1', versionLabel: base.version.versionLabel, checksum: base.version.checksum, publicationDate: null, validFrom: new Date('2026-07-01'), validUntil: null, artifacts: [], applicabilityScopes: [] }] }) },
      knowledgeSourceCanonicalIdentity: identityDelegate(),
    }
    const database = { $transaction: vi.fn(async (callback) => callback(transaction)) }
    await expect(onboardKnowledgeSource({ ...base, version: { ...base.version, validFrom: new Date('2026-07-02') } }, database as never)).rejects.toMatchObject({ code: 'SOURCE_VERSION_METADATA_CONFLICT' })
  })

  it('schrijft een sterke bibliografische identiteit zonder canonieke URL', async () => {
    const create = vi.fn().mockResolvedValue({})
    const transaction = { $executeRaw: vi.fn(), knowledgeSource: { findUnique: vi.fn().mockResolvedValue(null), create }, knowledgeSourceCanonicalIdentity: identityDelegate() }
    const database = { $transaction: vi.fn(async (callback) => callback(transaction)) }
    const source = { ...base.source, code: 'AI-03', title: 'Asbest', publisher: 'Sdu Uitgevers', canonicalFamily: 'AI_SHEET' as const, sourceType: 'AI_SHEET' as const, temporalStatus: 'HISTORICAL' as const, authorityStatus: 'PROFESSIONAL_REFERENCE' as const, sourceFamily: 'SZW-AI-BLADEN', independenceGroup: 'SZW-AI-BLADEN', applicabilityScope: 'Historische Nederlandse arbo-informatie', canonicalUrl: undefined, canonicalIdentity: { type: 'BIBLIOGRAPHIC' as const, publisher: 'Sdu Uitgevers', series: 'Arbo-Informatiebladen', title: 'Asbest', publicationCode: 'AI-03', edition: 'Tweede herziene druk', publicationYear: 2001, isbn: '90-12-08941-7' } }
    await onboardKnowledgeSource({ ...base, source }, database as never)
    expect(create.mock.calls[0][0].data).toMatchObject({ sourceUrl: null, canonicalIdentity: { create: { identityType: 'BIBLIOGRAPHIC', bibliographicIsbn: '9012089417', bibliographicPublicationCode: 'AI-03' } } })
  })

  it('ondersteunt professionele bibliografische bronnen met een eigen canonieke bronfamilie', async () => {
    const create = vi.fn().mockResolvedValue({})
    const transaction = { $executeRaw: vi.fn(), knowledgeSource: { findUnique: vi.fn().mockResolvedValue(null), create }, knowledgeSourceCanonicalIdentity: identityDelegate() }
    const database = { $transaction: vi.fn(async (callback) => callback(transaction)) }
    const source = {
      ...base.source,
      code: 'IMA-RIE-2016-01',
      title: 'Arbobeleid',
      publisher: 'IMA Online',
      canonicalFamily: 'IMA_ONLINE' as const,
      canonicalUrl: undefined,
      authorityStatus: 'PROFESSIONAL_REFERENCE' as const,
      temporalStatus: 'HISTORICAL' as const,
      sourceFamily: 'IMA_RIE',
      independenceGroup: 'IMA_ONLINE_RIE_2016',
      canonicalIdentity: { type: 'BIBLIOGRAPHIC' as const, publisher: 'IMA Online', series: 'IMA Online RI&E-deelrapporten', title: 'Arbobeleid', publicationCode: 'IMA-RIE-01', edition: 'IMA-A', publicationYear: 2016 },
    }
    await onboardKnowledgeSource({ ...base, source }, database as never)
    expect(create.mock.calls[0][0].data).toMatchObject({ canonicalFamily: 'IMA_ONLINE', authorityLevel: 'PROFESSIONAL_GUIDANCE', sourceUrl: null })
  })

  it('weigert bibliografische metadata die niet met de bron overeenkomt vóór databasewrite', async () => {
    const database = { $transaction: vi.fn() }
    const source = { ...base.source, canonicalUrl: undefined, canonicalIdentity: { type: 'BIBLIOGRAPHIC' as const, publisher: 'Andere uitgever', series: 'AI', title: base.source.title, publicationCode: 'AI-03', edition: 'Tweede druk', publicationYear: 2001 } }
    await expect(onboardKnowledgeSource({ ...base, source }, database as never)).rejects.toMatchObject({ code: 'BIBLIOGRAPHIC_SOURCE_METADATA_CONFLICT' })
    expect(database.$transaction).not.toHaveBeenCalled()
  })
})
