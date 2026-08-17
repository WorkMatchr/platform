import { describe, expect, it } from 'vitest'
import { normalizeIsbn, resolveCanonicalIdentity } from './knowledge-canonical-source-identity'

describe('canonical Knowledge source identity', () => {
  it('houdt HTTPS-validatie voor URL-identiteit strikt', () => {
    expect(() => resolveCanonicalIdentity({ type: 'URL', url: 'http://example.invalid' })).toThrow('Canonieke bron-URL moet HTTPS gebruiken.')
    expect(resolveCanonicalIdentity({ type: 'URL', url: 'https://example.invalid/source#fragment' })).toMatchObject({ identityType: 'URL', canonicalUrl: 'https://example.invalid/source' })
  })

  it('maakt een deterministische bibliografische fingerprint', () => {
    const input = { type: 'BIBLIOGRAPHIC' as const, publisher: 'Sdu Uitgevers', series: 'Arbo-Informatiebladen', title: 'Asbest', publicationCode: 'AI-03', edition: 'Tweede herziene druk', publicationYear: 2001, isbn: '90-12-08941-7' }
    expect(resolveCanonicalIdentity(input)).toEqual(resolveCanonicalIdentity({ ...input, publisher: ' Sdu   Uitgevers ', isbn: '9012089417' }))
  })

  it('weigert zwakke identiteit en ongeldige ISBN', () => {
    expect(() => resolveCanonicalIdentity({ type: 'BIBLIOGRAPHIC', publisher: '', series: 'AI', title: 'Asbest', publicationCode: 'AI-03', publicationYear: 2001, edition: '2e druk' })).toThrow('Uitgever ontbreekt.')
    expect(() => resolveCanonicalIdentity({ type: 'BIBLIOGRAPHIC', publisher: 'Sdu', series: 'AI', title: 'Asbest', publicationCode: 'AI-03' })).toThrow('Editie of publicatiejaar is verplicht.')
    expect(() => normalizeIsbn('90-12-08941-8')).toThrow('ISBN is ongeldig.')
  })

  it('onderscheidt edities en jaren inhoudelijk', () => {
    const base = { type: 'BIBLIOGRAPHIC' as const, publisher: 'Sdu', series: 'AI', title: 'Asbest', publicationCode: 'AI-03', edition: 'Tweede druk', publicationYear: 2001 }
    expect(resolveCanonicalIdentity(base).canonicalFingerprint).not.toBe(resolveCanonicalIdentity({ ...base, edition: 'Derde druk', publicationYear: 2005 }).canonicalFingerprint)
  })
})
