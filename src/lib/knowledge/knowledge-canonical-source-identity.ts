import { createHash } from 'node:crypto'

export type UrlCanonicalIdentityInput = {
  type: 'URL'
  url: string
  supersedesIdentityId?: string
}

export type BibliographicCanonicalIdentityInput = {
  type: 'BIBLIOGRAPHIC'
  publisher: string
  series: string
  title: string
  publicationCode: string
  edition?: string
  publicationYear?: number
  isbn?: string
  supersedesIdentityId?: string
}

export type CanonicalIdentityInput = UrlCanonicalIdentityInput | BibliographicCanonicalIdentityInput

export class KnowledgeCanonicalIdentityError extends Error {
  constructor(public readonly code: string, message: string) { super(message); this.name = 'KnowledgeCanonicalIdentityError' }
}

function text(value: string, field: string) {
  const normalized = value.trim().replace(/\s+/gu, ' ')
  if (!normalized) throw new KnowledgeCanonicalIdentityError('BIBLIOGRAPHIC_IDENTITY_INSUFFICIENT', `${field} ontbreekt.`)
  return normalized
}

function isbn10Valid(value: string) {
  return [...value].reduce((sum, character, index) => sum + (character === 'X' ? 10 : Number(character)) * (10 - index), 0) % 11 === 0
}

function isbn13Valid(value: string) {
  return [...value].reduce((sum, character, index) => sum + Number(character) * (index % 2 === 0 ? 1 : 3), 0) % 10 === 0
}

export function normalizeIsbn(value?: string) {
  if (!value) return null
  const normalized = value.toUpperCase().replace(/[^0-9X]/gu, '')
  if ((normalized.length === 10 && isbn10Valid(normalized)) || (normalized.length === 13 && /^97[89]/u.test(normalized) && isbn13Valid(normalized))) return normalized
  throw new KnowledgeCanonicalIdentityError('BIBLIOGRAPHIC_ISBN_INVALID', 'ISBN is ongeldig.')
}

export type ResolvedCanonicalIdentity = {
  identityType: 'URL' | 'BIBLIOGRAPHIC'
  canonicalFingerprint: string
  canonicalUrl: string | null
  bibliographicPublisher: string | null
  bibliographicSeries: string | null
  bibliographicTitle: string | null
  bibliographicEdition: string | null
  bibliographicYear: number | null
  bibliographicIsbn: string | null
  bibliographicPublicationCode: string | null
  supersedesIdentityId: string | null
}

export function resolveCanonicalIdentity(input: CanonicalIdentityInput): ResolvedCanonicalIdentity {
  if (input.type === 'URL') {
    let url: URL
    try { url = new URL(input.url) } catch { throw new KnowledgeCanonicalIdentityError('CANONICAL_URL_INVALID', 'Canonieke bron-URL is ongeldig.') }
    if (url.protocol !== 'https:') throw new KnowledgeCanonicalIdentityError('CANONICAL_URL_INVALID', 'Canonieke bron-URL moet HTTPS gebruiken.')
    url.hash = ''
    const canonicalUrl = url.toString()
    const canonicalFingerprint = createHash('sha256').update(JSON.stringify({ type: 'URL', url: canonicalUrl })).digest('hex')
    return { identityType: 'URL', canonicalFingerprint, canonicalUrl, bibliographicPublisher: null, bibliographicSeries: null, bibliographicTitle: null, bibliographicEdition: null, bibliographicYear: null, bibliographicIsbn: null, bibliographicPublicationCode: null, supersedesIdentityId: input.supersedesIdentityId ?? null }
  }

  const publisher = text(input.publisher, 'Uitgever')
  const series = text(input.series, 'Reeks')
  const title = text(input.title, 'Titel')
  const publicationCode = text(input.publicationCode, 'Publicatiecode').toUpperCase()
  const edition = input.edition ? text(input.edition, 'Editie') : null
  const publicationYear = input.publicationYear ?? null
  if (publicationYear !== null && (!Number.isInteger(publicationYear) || publicationYear < 1800 || publicationYear > new Date().getUTCFullYear() + 1)) throw new KnowledgeCanonicalIdentityError('BIBLIOGRAPHIC_YEAR_INVALID', 'Publicatiejaar is ongeldig.')
  const isbn = normalizeIsbn(input.isbn)
  if (!edition && publicationYear === null) throw new KnowledgeCanonicalIdentityError('BIBLIOGRAPHIC_EDITION_REQUIRED', 'Editie of publicatiejaar is verplicht.')
  if (!isbn && !edition) throw new KnowledgeCanonicalIdentityError('BIBLIOGRAPHIC_DISCRIMINATOR_REQUIRED', 'ISBN of editie is verplicht om publicaties te onderscheiden.')
  const canonical = { type: 'BIBLIOGRAPHIC', publisher: publisher.toLocaleLowerCase('nl-NL'), series: series.toLocaleLowerCase('nl-NL'), title: title.toLocaleLowerCase('nl-NL'), publicationCode, edition: edition?.toLocaleLowerCase('nl-NL') ?? null, publicationYear, isbn }
  const canonicalFingerprint = createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
  return { identityType: 'BIBLIOGRAPHIC', canonicalFingerprint, canonicalUrl: null, bibliographicPublisher: publisher, bibliographicSeries: series, bibliographicTitle: title, bibliographicEdition: edition, bibliographicYear: publicationYear, bibliographicIsbn: isbn, bibliographicPublicationCode: publicationCode, supersedesIdentityId: input.supersedesIdentityId ?? null }
}
