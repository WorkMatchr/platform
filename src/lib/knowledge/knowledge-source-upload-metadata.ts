import { createHash } from 'node:crypto'
import path from 'node:path'
import type {
  KnowledgeCanonicalSourceFamily,
  KnowledgeDocumentFamilyRole,
  KnowledgeSourceAuthorityStatus,
  KnowledgeSourceType,
  KnowledgeTemporalStatus,
} from '@/generated/prisma/enums'
import type { FullSourceExtraction } from './knowledge-extractor'

export type ProposalConfidence = 'HIGH_CONFIDENCE' | 'REVIEW' | 'UNKNOWN'
export type MetadataProposal<T> = { value: T | null; confidence: ProposalConfidence; evidence: string | null }

export type KnowledgeSourceMetadataProposal = {
  title: MetadataProposal<string>
  publisher: MetadataProposal<string>
  publicationYear: MetadataProposal<number>
  versionLabel: MetadataProposal<string>
  series: MetadataProposal<string>
  publicationCode: MetadataProposal<string>
  edition: MetadataProposal<string>
  isbn: MetadataProposal<string>
  canonicalFamily: MetadataProposal<KnowledgeCanonicalSourceFamily>
  sourceType: MetadataProposal<KnowledgeSourceType>
  authorityStatus: MetadataProposal<KnowledgeSourceAuthorityStatus>
  temporalStatus: MetadataProposal<KnowledgeTemporalStatus>
  jurisdiction: MetadataProposal<string>
  applicabilityScope: MetadataProposal<string>
  scopeCode: MetadataProposal<string>
  topics: MetadataProposal<string[]>
  sourceCode: MetadataProposal<string>
}

export type UploadComparisonProfile = {
  normalizedTitle: string
  publisher: string | null
  publicationYear: number | null
  canonicalFamily: KnowledgeCanonicalSourceFamily | null
  publicationCode: string | null
  roleHint: KnowledgeDocumentFamilyRole | null
  significantTerms: string[]
  explicitReferences: string[]
}

const currentYear = new Date().getUTCFullYear()
const normalize = (value: string) => value.normalize('NFKC').replace(/\s+/gu, ' ').trim()
const lower = (value: string) => normalize(value).toLocaleLowerCase('nl-NL')
const slug = (value: string, maximum = 48) => lower(value).normalize('NFD').replace(/[\u0300-\u036f]/gu, '').replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0, maximum).replace(/-$/u, '')
const unknown = <T>(): MetadataProposal<T> => ({ value: null, confidence: 'UNKNOWN', evidence: null })
const proposal = <T>(value: T, confidence: ProposalConfidence, evidence: string): MetadataProposal<T> => ({ value, confidence, evidence })

function extractedText(extraction: FullSourceExtraction) {
  return extraction.pages.flatMap((page) => page.blocks.map((block) => block.exactText)).filter(Boolean)
}

function titleProposal(fileName: string, extraction: FullSourceExtraction) {
  const firstPage = extraction.pages[0]?.blocks ?? []
  const heading = firstPage.find((block) => block.blockType === 'HEADING' && normalize(block.exactText).length >= 8)?.exactText
  if (heading) return proposal(normalize(heading).slice(0, 300), 'HIGH_CONFIDENCE', 'Eerste herkende kop op de titelpagina.')
  const candidates = firstPage.map((block) => normalize(block.exactText)).filter((value) => value.length >= 12 && value.length <= 220)
  const candidate = candidates.find((value) => !/^(inhoud|voorwoord|samenvatting|pagina\s+\d+)/iu.test(value))
  if (candidate) return proposal(candidate.slice(0, 300), 'REVIEW', 'Eerste titelachtige tekst op pagina 1.')
  const fallback = normalize(path.basename(fileName, path.extname(fileName)).replace(/[_+]+/gu, ' '))
  return proposal(fallback || 'Titel controleren', 'REVIEW', 'Afgeleid uit de bestandsnaam; documentcontrole nodig.')
}

const publishers: Array<{ pattern: RegExp; name: string; family: KnowledgeCanonicalSourceFamily; type: KnowledgeSourceType; authority: KnowledgeSourceAuthorityStatus }> = [
  { pattern: /\bNVAB\b/iu, name: 'NVAB', family: 'NVAB', type: 'PROFESSIONAL_GUIDANCE', authority: 'PROFESSIONAL_REFERENCE' },
  { pattern: /Nederlandse\s+Arbeidsinspectie|Inspectie\s+SZW/iu, name: 'Nederlandse Arbeidsinspectie', family: 'LABOUR_INSPECTORATE', type: 'INSPECTORATE_GUIDANCE', authority: 'OFFICIAL_GUIDANCE' },
  { pattern: /\bRIVM\b/iu, name: 'RIVM', family: 'RIVM', type: 'RESEARCH', authority: 'OFFICIAL_GUIDANCE' },
  { pattern: /\bTNO\b/iu, name: 'TNO', family: 'TNO', type: 'RESEARCH', authority: 'PROFESSIONAL_REFERENCE' },
  { pattern: /Sociaal[- ]Economische\s+Raad|\bSER\b/iu, name: 'SER', family: 'SER', type: 'PROFESSIONAL_GUIDANCE', authority: 'AUTHORIZED_PUBLICATION' },
]

function detectPublisher(text: string) {
  return publishers.find((candidate) => candidate.pattern.test(text)) ?? null
}

function detectYear(text: string) {
  const years = [...text.matchAll(/\b(19\d{2}|20\d{2})\b/gu)].map((match) => Number(match[1])).filter((year) => year >= 1900 && year <= currentYear + 1)
  return years[0] ?? null
}

function detectEdition(text: string) {
  return text.match(/\b((?:eerste|tweede|derde|vierde|vijfde|\d+(?:e|de))\s+(?:herziene\s+)?druk)\b/iu)?.[1]
    ?? text.match(/\bversie\s+([0-9]+(?:\.[0-9]+)*)\b/iu)?.[0]
    ?? null
}

function detectIsbn(text: string) {
  return text.match(/\bISBN(?:-1[03])?\s*[: ]\s*((?:97[89][- ]?)?[0-9X][- 0-9X]{8,20})\b/iu)?.[1]?.trim() ?? null
}

function detectPublicationCode(text: string, fileName: string) {
  return text.match(/\bAI[- ]?\d{1,3}\b/iu)?.[0].replace(/\s/gu, '').toUpperCase()
    ?? text.match(/\bPGS\s*\d{1,3}\b/iu)?.[0].replace(/\s/gu, '-').toUpperCase()
    ?? text.match(/\bBWBR\d{7}\b/iu)?.[0].toUpperCase()
    ?? fileName.match(/\bAI[- _]?\d{1,3}\b/iu)?.[0].replace(/[_ ]/gu, '-').toUpperCase()
    ?? null
}

function roleHint(title: string, text: string): KnowledgeDocumentFamilyRole | null {
  const value = `${title} ${text.slice(0, 4000)}`
  if (/achtergronddocument/iu.test(value)) return 'BACKGROUND_EVIDENCE'
  if (/\bbijlage\b/iu.test(title)) return 'APPENDIX'
  if (/\bsamenvatting\b|factsheet/iu.test(title)) return 'SUMMARY'
  if (/\bchecklist\b/iu.test(title)) return 'CHECKLIST'
  if (/\b(multidisciplinaire\s+)?richtlijn\b/iu.test(title)) return 'PRIMARY_GUIDELINE'
  return null
}

const topicRules: Array<[RegExp, string]> = [
  [/veilig\s+gedrag|veiligheidscultuur/iu, 'veilig gedrag'],
  [/productieomgeving|maakindustrie/iu, 'productieomgevingen'],
  [/bedrijfshulpverlening|\bBHV\b/iu, 'bedrijfshulpverlening'],
  [/asbest/iu, 'asbest'],
  [/geluid|lawaai/iu, 'geluid'],
  [/ergonom|fysieke\s+belasting/iu, 'fysieke belasting'],
  [/biologische\s+agentia/iu, 'biologische agentia'],
  [/machineveiligheid|arbeidsmiddelen/iu, 'machineveiligheid'],
]

function significantTerms(value: string) {
  const stop = new Set(['de','het','een','en','van','voor','met','naar','bij','in','op','als','dit','dat','wordt','zijn','document','richtlijn'])
  return [...new Set(lower(value).replace(/[^a-z0-9\s-]/gu, ' ').split(/\s+/gu).filter((term) => term.length >= 5 && !stop.has(term)))].slice(0, 80)
}

export function proposeKnowledgeSourceMetadata(fileName: string, extraction: FullSourceExtraction): { metadata: KnowledgeSourceMetadataProposal; comparison: UploadComparisonProfile } {
  const blocks = extractedText(extraction)
  const text = blocks.join('\n').slice(0, 250_000)
  const title = titleProposal(fileName, extraction)
  const publisher = detectPublisher(text)
  const year = detectYear(text.slice(0, 30_000))
  const edition = detectEdition(text.slice(0, 30_000))
  const isbn = detectIsbn(text.slice(0, 30_000))
  const publicationCode = detectPublicationCode(text.slice(0, 30_000), fileName)
  const aiSheet = publicationCode?.startsWith('AI-') ?? false
  const detectedFamily = aiSheet
    ? { name: publisher?.name ?? 'SZW Arbo-Informatiebladen', family: 'AI_SHEET' as const, type: 'AI_SHEET' as const, authority: 'PROFESSIONAL_REFERENCE' as const }
    : publisher
  const topics = topicRules.filter(([pattern]) => pattern.test(text)).map(([, topic]) => topic)
  const scope = topics.includes('productieomgevingen')
    ? 'Veilig gedrag en arbeidsomstandigheden in productieomgevingen en de maakindustrie'
    : topics.length ? `Arbeidsomstandigheden: ${topics.join(', ')}` : null
  const sourceCodeBase = publicationCode ?? [detectedFamily?.name ?? 'BRON', slug(title.value ?? fileName, 32), year].filter(Boolean).join('-')
  const sourceCode = sourceCodeBase.toUpperCase().replace(/[^A-Z0-9._:-]+/gu, '-').replace(/^-|-$/gu, '').slice(0, 80)
  const old = year !== null && year < currentYear - 5
  const familyRole = roleHint(title.value ?? '', text)
  const explicitReferences = [...text.matchAll(/(?:behorend(?:e)?\s+bij|zie\s+ook|achtergronddocument\s+bij)\s+([^\n.]{12,180})/giu)].map((match) => normalize(match[1])).slice(0, 10)
  const family = detectedFamily?.family ?? null
  const series = aiSheet ? 'Arbo-Informatiebladen' : family === 'NVAB' ? 'NVAB-richtlijnen' : familyRole ? 'Gerelateerde arbo-publicaties' : null
  const metadata: KnowledgeSourceMetadataProposal = {
    title,
    publisher: detectedFamily ? proposal(detectedFamily.name, 'HIGH_CONFIDENCE', `Uitgever herkenbaar in het document: ${detectedFamily.name}.`) : unknown(),
    publicationYear: year ? proposal(year, 'REVIEW', `Publicatiejaar ${year} gevonden in de documenttekst.`) : unknown(),
    versionLabel: edition ? proposal(normalize(edition), 'HIGH_CONFIDENCE', 'Expliciete editie-/versievermelding gevonden.') : year ? proposal(String(year), 'REVIEW', 'Versielabel voorlopig gebaseerd op het gevonden publicatiejaar.') : unknown(),
    series: series ? proposal(series, aiSheet ? 'HIGH_CONFIDENCE' : 'REVIEW', 'Reeks afgeleid uit publicatiecode en documenttype.') : unknown(),
    publicationCode: publicationCode ? proposal(publicationCode, 'HIGH_CONFIDENCE', 'Publicatiecode herkenbaar in document of bestandsnaam.') : proposal(sourceCode, 'REVIEW', 'Voorstel op basis van uitgever, titel en jaar.'),
    edition: edition ? proposal(normalize(edition), 'HIGH_CONFIDENCE', 'Expliciete editie gevonden.') : unknown(),
    isbn: isbn ? proposal(isbn, 'REVIEW', 'ISBN-vermelding gevonden; controleer het nummer.') : unknown(),
    canonicalFamily: family ? proposal(family, 'HIGH_CONFIDENCE', 'Bronfamilie afgeleid uit herkenbare uitgever/publicatiecode.') : unknown(),
    sourceType: detectedFamily ? proposal(detectedFamily.type, 'HIGH_CONFIDENCE', 'Documenttype volgt uit herkenbare reeks/uitgever.') : familyRole ? proposal('PROFESSIONAL_GUIDANCE', 'REVIEW', 'Richtlijn- of achtergrondsignaal gevonden.') : unknown(),
    authorityStatus: detectedFamily ? proposal(detectedFamily.authority, 'REVIEW', 'Autoriteitsstatus voorgesteld vanuit bronfamilie; menselijke controle blijft vereist.') : unknown(),
    temporalStatus: old ? proposal('UNDER_REVIEW', 'HIGH_CONFIDENCE', `Publicatiejaar ${year} vereist expliciete actualiteitscontrole.`) : proposal('UNKNOWN', 'REVIEW', 'Actualiteit kan niet uitsluitend uit de PDF worden vastgesteld.'),
    jurisdiction: /\b(Nederland|Nederlandse|Arbowet|arbeidsomstandigheden)\b/iu.test(text) || detectedFamily ? proposal('NL', 'HIGH_CONFIDENCE', 'Nederlandse bron- en terminologiesignalen gevonden.') : unknown(),
    applicabilityScope: scope ? proposal(scope, 'REVIEW', 'Voorgesteld uit herkende onderwerpen.') : unknown(),
    scopeCode: scope ? proposal(slug(scope, 80).replace(/-/gu, '_').toUpperCase(), 'REVIEW', 'Deterministisch afgeleid uit het toepassingsgebied.') : unknown(),
    topics: topics.length ? proposal(topics, 'REVIEW', 'Onderwerpen herkend in de documenttekst.') : unknown(),
    sourceCode: proposal(sourceCode || 'BRON-CONTROLEREN', publicationCode ? 'HIGH_CONFIDENCE' : 'REVIEW', publicationCode ? 'Afgeleid uit de expliciete publicatiecode.' : 'Deterministisch voorstel; controle op uniciteit nodig.'),
  }
  return {
    metadata,
    comparison: {
      normalizedTitle: lower(title.value ?? fileName),
      publisher: metadata.publisher.value,
      publicationYear: year,
      canonicalFamily: family,
      publicationCode,
      roleHint: familyRole,
      significantTerms: significantTerms(`${title.value ?? ''} ${text.slice(0, 50_000)}`),
      explicitReferences,
    },
  }
}

export type KnowledgeBatchFamilySuggestion = {
  id: string
  code: string
  title: string
  confidence: ProposalConfidence
  rationale: string[]
  members: Array<{ checksum: string; fileName: string; role: KnowledgeDocumentFamilyRole }>
}

export type KnowledgeBatchAnalysis = {
  familySuggestions: KnowledgeBatchFamilySuggestion[]
  sharedMetadata: Partial<{ publisher: string; publicationYear: number; canonicalFamily: KnowledgeCanonicalSourceFamily; jurisdiction: string; applicabilityScope: string; topics: string[] }>
}

function overlap(left: string[], right: string[]) {
  const a = new Set(left); const b = new Set(right)
  const intersection = [...a].filter((value) => b.has(value)).length
  return intersection / Math.max(1, new Set([...a, ...b]).size)
}

export function analyzeKnowledgeSourceUploadBatch(documents: Array<{ checksum: string; fileName: string; proposal: KnowledgeSourceMetadataProposal; comparison: UploadComparisonProfile }>): KnowledgeBatchAnalysis {
  if (documents.length < 1 || documents.length > 10) throw new Error('KNOWLEDGE_UPLOAD_BATCH_SIZE_INVALID')
  const groups: typeof documents[] = []
  for (const document of documents) {
    const group = groups.find((candidate) => candidate.some((member) => {
      const samePublisher = Boolean(document.comparison.publisher && document.comparison.publisher === member.comparison.publisher)
      const sameYear = Boolean(document.comparison.publicationYear && document.comparison.publicationYear === member.comparison.publicationYear)
      const similar = overlap(document.comparison.significantTerms, member.comparison.significantTerms) >= 0.2
      const explicit = document.comparison.explicitReferences.some((reference) => member.comparison.normalizedTitle.includes(lower(reference).slice(0, 40)))
        || member.comparison.explicitReferences.some((reference) => document.comparison.normalizedTitle.includes(lower(reference).slice(0, 40)))
      return samePublisher && sameYear && (similar || explicit)
    }))
    if (group) group.push(document); else groups.push([document])
  }
  const familySuggestions = groups.filter((group) => group.length >= 2).map((group) => {
    const primary = group.find((document) => document.comparison.roleHint === 'PRIMARY_GUIDELINE') ?? group[0]
    const titleStem = (primary.proposal.title.value ?? primary.fileName).replace(/^(multidisciplinaire\s+)?richtlijn\s*/iu, '').trim()
    const familyTitle = titleStem || primary.proposal.title.value || primary.fileName
    const code = `FAMILY-${slug(familyTitle, 110).toUpperCase()}`.slice(0, 160)
    const rationale = ['Overeenkomstige uitgever en publicatieperiode.', 'Inhoudelijke titel-/termovereenkomst binnen dezelfde uploadbatch.']
    if (group.some((document) => document.comparison.explicitReferences.length)) rationale.push('Expliciete verwijzing tussen documenten gevonden.')
    return {
      id: createHash('sha256').update(group.map((document) => document.checksum).sort().join(':')).digest('hex').slice(0, 16),
      code,
      title: familyTitle,
      confidence: group.some((document) => document.comparison.explicitReferences.length) ? 'HIGH_CONFIDENCE' as const : 'REVIEW' as const,
      rationale,
      members: group.map((document) => ({ checksum: document.checksum, fileName: document.fileName, role: document.comparison.roleHint ?? (document === primary ? 'PRIMARY_GUIDELINE' : 'BACKGROUND_EVIDENCE') })),
    }
  })
  const values = <T>(select: (document: typeof documents[number]) => T | null) => documents.map(select).filter((value): value is T => value !== null)
  const shared = <T>(items: T[]) => items.length === documents.length && new Set(items.map((item) => JSON.stringify(item))).size === 1 ? items[0] : undefined
  return { familySuggestions, sharedMetadata: {
    publisher: shared(values((document) => document.proposal.publisher.value)),
    publicationYear: shared(values((document) => document.proposal.publicationYear.value)),
    canonicalFamily: shared(values((document) => document.proposal.canonicalFamily.value)),
    jurisdiction: shared(values((document) => document.proposal.jurisdiction.value)),
    applicabilityScope: shared(values((document) => document.proposal.applicabilityScope.value)),
    topics: shared(values((document) => document.proposal.topics.value)),
  } }
}
