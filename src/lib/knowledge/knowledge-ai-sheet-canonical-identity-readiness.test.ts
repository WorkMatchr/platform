import { describe, expect, it } from 'vitest'
import { resolveCanonicalIdentity } from './knowledge-canonical-source-identity'

const ready = [
  ['AI-03', 2001, 'Tweede herziene druk', '90 12 08941 7'],
  ['AI-04', 2000, 'Tweede herziene druk', '90 12 08921 2'],
  ['AI-05', 2000, 'Tweede herziene druk', '90 12 08920 4'],
  ['AI-06', 2000, 'Tweede herziene druk', '90 12 08960 3'],
  ['AI-07', 2000, 'Tweede herziene druk', '90 12 08909 3'],
  ['AI-08', 2000, 'Tweede herziene druk', '90 12 08942 5'],
  ['AI-09', 2000, 'Tweede herziene druk', '90 12 08904 2'],
  ['AI-11', 2000, 'Tweede herziene druk', '90 12 08905 0'],
  ['AI-12', 2000, 'Tweede herziene druk', '90 12 08917 4'],
  ['AI-13', 2000, 'Tweede herziene druk', '90 12 08943 3'],
  ['AI-14', 2000, 'Tweede herziene druk', '90 12 08919 0'],
  ['AI-15', 2001, 'Derde herziene druk', '90 12 09327 9'],
  ['AI-16', 2000, 'Tweede herziene druk', '90 12 08945 X'],
  ['AI-17', 2000, 'Tweede herziene druk', '90 12 08912 3'],
  ['AI-18', 2000, 'Tweede herziene druk', '90 12 08940 9'],
  ['AI-19', 2001, 'Tweede herziene druk', '90 12 08966 2'],
  ['AI-20', 2000, 'Tweede herziene druk', '90 12 08913 1'],
  ['AI-21', 2000, 'Tweede herziene druk', '90 12 08910 7'],
  ['AI-22', 2001, 'Tweede herziene druk', '90 12 08965 4'],
  ['AI-23', 1999, null, '90 12 08482 2'],
  ['AI-25', 1998, null, '90 12 08555 1'],
  ['AI-26', 2000, null, '90 12 08599 3'],
  ['AI-27', 1999, null, '90 12 08601 9'],
  ['AI-28', 2000, null, '90 12 08730 9'],
  ['AI-29', 2000, null, '90 12 08896 8'],
  ['AI-30', 2000, null, '90 12 08897 6'],
] as const

const insufficient = ['AI-24', 'AI-31', 'AI-32', 'AI-33', 'AI-34', 'AI-35', 'AI-36', 'AI-37', 'AI-38', 'AI-40']

describe('AI-sheet bibliografische identity-readiness', () => {
  it('classificeert 26 documentair bewezen identiteiten als ready', () => {
    const fingerprints = ready.map(([code, publicationYear, edition, isbn]) => resolveCanonicalIdentity({
      type: 'BIBLIOGRAPHIC', publisher: 'Sdu Uitgevers', series: 'Arbo-informatie', title: `Gecontroleerde titel ${code}`,
      publicationCode: code, publicationYear, edition: edition ?? undefined, isbn,
    }).canonicalFingerprint)
    expect(ready).toHaveLength(26)
    expect(new Set(fingerprints)).toHaveLength(26)
  })

  it('houdt de tien bronnen zonder voldoende bewezen discriminatoren fail-closed', () => {
    const results = insufficient.map((code) => {
      try {
        resolveCanonicalIdentity({ type: 'BIBLIOGRAPHIC', publisher: 'Sdu Uitgevers', series: 'Arbo-informatie', title: `Gecontroleerde titel ${code}`, publicationCode: code })
        return 'BIBLIOGRAPHIC_IDENTITY_READY'
      } catch {
        return 'BIBLIOGRAPHIC_IDENTITY_INSUFFICIENT'
      }
    })
    expect(insufficient).toHaveLength(10)
    expect(new Set(results)).toEqual(new Set(['BIBLIOGRAPHIC_IDENTITY_INSUFFICIENT']))
  })
})
