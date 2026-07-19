import type { PublicSource } from './public-content-model'

export const publicSources = {
  'arbowet-current': {
    id: 'arbowet-current',
    title: 'Arbeidsomstandighedenwet',
    publisher: 'Overheid.nl',
    url: 'https://wetten.overheid.nl/arbowet',
    type: 'LAW',
    evidenceLevel: 'PRIMARY',
    reviewedAt: '2026-07-19',
    note: 'Primaire wettelijke bron voor arbobeleid, RI&E, voorlichting, ongevallen, deskundige bijstand, BHV en PAGO.',
  },
  'rijksoverheid-arbowet': {
    id: 'rijksoverheid-arbowet',
    title: 'Waar moet mijn werkgever voor zorgen volgens de Arbowet?',
    publisher: 'Rijksoverheid',
    url: 'https://www.rijksoverheid.nl/vraag-en-antwoord/arbeidsomstandigheden/waar-moet-mijn-werkgever-voor-zorgen-volgens-de-arbowet',
    type: 'OFFICIAL_GUIDANCE',
    evidenceLevel: 'AUTHORITATIVE',
    reviewedAt: '2026-07-19',
    note: 'Officiële publieksuitleg over de hoofdelementen van arbobeleid.',
  },
  'arbeidsinspectie-rie': {
    id: 'arbeidsinspectie-rie',
    title: 'Risico-inventarisatie en -evaluatie en plan van aanpak',
    publisher: 'Nederlandse Arbeidsinspectie',
    url: 'https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/risico-inventarisatie-evaluatie-en-plan-van-aanpak',
    type: 'ENFORCEMENT_GUIDANCE',
    evidenceLevel: 'AUTHORITATIVE',
    reviewedAt: '2026-07-19',
    note: 'Officiële uitleg over RI&E, plan van aanpak en toetsing.',
  },
  'arboportaal-preventiemedewerker': {
    id: 'arboportaal-preventiemedewerker',
    title: 'Wat zegt de wet over de preventiemedewerker?',
    publisher: 'Arboportaal',
    url: 'https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/preventiemedewerker/wat-zegt-de-wet-over-de-preventiemedewerker',
    type: 'OFFICIAL_GUIDANCE',
    evidenceLevel: 'AUTHORITATIVE',
    reviewedAt: '2026-07-19',
    note: 'Officiële uitleg over positie, taken en samenwerking van de preventiemedewerker.',
  },
  'arboportaal-bedrijfsarts': {
    id: 'arboportaal-bedrijfsarts',
    title: 'Bedrijfsarts',
    publisher: 'Arboportaal',
    url: 'https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/bedrijfsarts',
    type: 'OFFICIAL_GUIDANCE',
    evidenceLevel: 'AUTHORITATIVE',
    reviewedAt: '2026-07-19',
    note: 'Officiële uitleg over de onafhankelijke rol en toegankelijkheid van de bedrijfsarts.',
  },
  'arboportaal-basiscontract': {
    id: 'arboportaal-basiscontract',
    title: 'Waar moet het basiscontract aan voldoen?',
    publisher: 'Arboportaal',
    url: 'https://www.arboportaal.nl/onderwerpen/ondersteuning-bij-arbowet/basiscontract/waar-moet-het-basiscontract-aan-voldoen',
    type: 'OFFICIAL_GUIDANCE',
    evidenceLevel: 'AUTHORITATIVE',
    reviewedAt: '2026-07-19',
    note: 'Officiële uitleg over de minimale afspraken voor arbodienstverlening.',
  },
  'arboportaal-pago': {
    id: 'arboportaal-pago',
    title: 'PAGO (Periodiek Arbeidsgezondheidskundig Onderzoek)',
    publisher: 'Arboportaal',
    url: 'https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid/pago',
    type: 'OFFICIAL_GUIDANCE',
    evidenceLevel: 'AUTHORITATIVE',
    reviewedAt: '2026-07-19',
    note: 'Officiële uitleg over PAGO, de relatie met RI&E en het onderscheid met breder PMO.',
  },
  'arbeidsinspectie-ongevallen': {
    id: 'arbeidsinspectie-ongevallen',
    title: 'Arbeidsongevallen',
    publisher: 'Nederlandse Arbeidsinspectie',
    url: 'https://www.nlarbeidsinspectie.nl/onderwerpen/arbeidsomstandighedenwet/arbeidsongevallen',
    type: 'ENFORCEMENT_GUIDANCE',
    evidenceLevel: 'AUTHORITATIVE',
    reviewedAt: '2026-07-19',
    note: 'Actuele officiële uitleg over melding, registratie en leren van arbeidsongevallen.',
  },
  'arbeidsinspectie-sectoren': {
    id: 'arbeidsinspectie-sectoren',
    title: 'Sector- en beroepeninformatie Inspectiebrede Risicoanalyse',
    publisher: 'Nederlandse Arbeidsinspectie',
    url: 'https://www.nlarbeidsinspectie.nl/documenten/2026/07/03/sector-en-beroepeninformatie-inspectiebrede-risicoanalyse',
    type: 'OFFICIAL_RESEARCH',
    evidenceLevel: 'AUTHORITATIVE',
    reviewedAt: '2026-07-19',
    note: 'Officiële sector- en beroepeninformatie; indicatoren zijn richtinggevend en moeten met andere informatie worden gecombineerd.',
  },
  'arboportaal-arbobeleid': {
    id: 'arboportaal-arbobeleid',
    title: 'Arbobeleid',
    publisher: 'Arboportaal',
    url: 'https://www.arboportaal.nl/onderwerpen/arbowet--en--regelgeving/arbobeleid',
    type: 'OFFICIAL_GUIDANCE',
    evidenceLevel: 'AUTHORITATIVE',
    reviewedAt: '2026-07-19',
    note: 'Overzicht van wettelijke arbozorg, deskundigheid en preventieve instrumenten.',
  },
} as const satisfies Record<string, PublicSource>

export type PublicSourceId = keyof typeof publicSources

export function resolvePublicSources(sourceIds: readonly string[]): readonly PublicSource[] {
  return sourceIds.map((sourceId) => {
    const source = publicSources[sourceId as PublicSourceId]
    if (!source) throw new Error(`Onbekende publieke bron: ${sourceId}`)
    return source
  })
}

export function validatePublicSources(): string[] {
  const issues: string[] = []
  const sources = Object.values(publicSources)
  if (new Set(sources.map((source) => source.id)).size !== sources.length) issues.push('Bron-ID’s moeten uniek zijn.')
  for (const source of sources) {
    if (!source.url.startsWith('https://')) issues.push(`${source.id} gebruikt geen veilige URL.`)
    try { new URL(source.url) } catch { issues.push(`${source.id} gebruikt een ongeldige URL.`) }
    if (!source.title || !source.publisher || !source.reviewedAt) issues.push(`${source.id} mist verplichte bronmetadata.`)
  }
  return issues
}
