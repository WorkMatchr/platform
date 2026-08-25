import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib'
import { getPrisma } from '@/lib/prisma'
import { resolveCanonicalIdentity } from './knowledge-canonical-source-identity'
import { storeKnowledgeDocumentFamily } from './knowledge-document-family-service'
import { extractPdfFullSource, normalizeKnowledgeSourceText, type ExtractedSourceBlock, type FullSourceExtraction } from './knowledge-extractor'
import { ingestKnowledgeLibraryDocument } from './knowledge-library-ingest-service'
import type { KnowledgeOnboardingInput } from './knowledge-source-onboarding-service'

const IMA_RIE_SERIES = 'IMA Online RI&E-deelrapporten'
const IMA_RIE_FAMILY_CODE = 'IMA-RIE-2016'
const IMA_RIE_FAMILY_TITLE = 'IMA Online RI&E-deelrapporten 2016'
const SAFE_FOLDER = 'knowledge-safe'
const A4 = { width: 595.28, height: 841.89 }
const MARGIN = 48

export type ImaRieDocumentDefinition = Readonly<{
  fileName: string
  sourceCode: string
  title: string
  publicationCode: string
  publicationDate: string
  topic: string
  sequence: number
}>

const definitions: ImaRieDocumentDefinition[] = [
  ['01 Arbobeleid.pdf', 'IMA-RIE-2016-01', 'Arbobeleid', 'IMA-RIE-01', '2016-07-22', 'ARBOBELEID'],
  ['02 Verzuimbeleid.pdf', 'IMA-RIE-2016-02', 'Verzuimbeleid', 'IMA-RIE-02', '2016-07-22', 'VERZUIMBELEID'],
  ['03 Algemene voorzieningen.pdf', 'IMA-RIE-2016-03', 'Algemene voorzieningen', 'IMA-RIE-03', '2016-07-22', 'ALGEMENE_VOORZIENINGEN'],
  ['04 Geluid.pdf', 'IMA-RIE-2016-04', 'Geluid', 'IMA-RIE-04', '2016-07-22', 'GELUID'],
  ['05 Verlichting en daglicht.pdf', 'IMA-RIE-2016-05', 'Verlichting en daglicht', 'IMA-RIE-05', '2016-07-22', 'VERLICHTING'],
  ['06 Klimaat en ventilatie.pdf', 'IMA-RIE-2016-06', 'Klimaat en ventilatie', 'IMA-RIE-06', '2016-07-22', 'KLIMAAT_EN_VENTILATIE'],
  ['07 Gassen, dampen en stof.pdf', 'IMA-RIE-2016-07', 'Gassen, dampen en stof', 'IMA-RIE-07', '2016-07-22', 'GEVAARLIJKE_STOFFEN'],
  ['08 Lichamelijke belasting.pdf', 'IMA-RIE-2016-08', 'Lichamelijke belasting', 'IMA-RIE-08', '2016-07-22', 'FYSIEKE_BELASTING'],
  ['09.2 Werkplekinrichting beeldschermwerk.pdf', 'IMA-RIE-2016-09-2', 'Werkplekinrichting beeldschermwerk', 'IMA-RIE-09.2', '2016-07-22', 'BEELDSCHERMWERK'],
  ['10.02 Machineveiligheid.pdf', 'IMA-RIE-2016-10-02', 'Machineveiligheid', 'IMA-RIE-10.02', '2016-07-22', 'MACHINEVEILIGHEID'],
  ['10.1 Gereedschappen, werktuigen en machines.pdf', 'IMA-RIE-2016-10-1', 'Gereedschappen, werktuigen en machines', 'IMA-RIE-10.1', '2016-07-22', 'ARBEIDSMIDDELEN'],
  ['11 Trillingen.pdf', 'IMA-RIE-2016-11', 'Trillingen', 'IMA-RIE-11', '2016-07-22', 'TRILLINGEN'],
  ['12 Informatie- en bedieningsmiddelen.pdf', 'IMA-RIE-2016-12', 'Informatie- en bedieningsmiddelen', 'IMA-RIE-12', '2016-07-22', 'BEDIENINGSMIDDELEN'],
  ['13 Psychosociale arbeidsbelasting.pdf', 'IMA-RIE-2016-13', 'Psychosociale arbeidsbelasting', 'IMA-RIE-13', '2016-07-22', 'PSA'],
  ['14 Werk- en rusttijden.pdf', 'IMA-RIE-2016-14', 'Werk- en rusttijden', 'IMA-RIE-14', '2016-07-22', 'ARBEIDSTIJDEN'],
  ['15 Re-integratie.pdf', 'IMA-RIE-2016-15', 'Re-integratie', 'IMA-RIE-15', '2016-07-22', 'RE_INTEGRATIE'],
  ['16 Toxische stoffen.pdf', 'IMA-RIE-2016-16', 'Toxische stoffen', 'IMA-RIE-16', '2016-07-22', 'GEVAARLIJKE_STOFFEN'],
  ['17 Biologische agentia.pdf', 'IMA-RIE-2016-17', 'Biologische agentia', 'IMA-RIE-17', '2016-07-22', 'BIOLOGISCHE_AGENTIA'],
  ['18 Straling.pdf', 'IMA-RIE-2016-18', 'Straling', 'IMA-RIE-18', '2016-07-22', 'STRALING'],
  ['20 Bedrijfshulperlening  BHV.pdf', 'IMA-RIE-2016-20', 'Bedrijfshulpverlening (BHV)', 'IMA-RIE-20', '2016-07-22', 'BHV'],
  ['21 Persoonlijke beschermingsmiddelen.pdf', 'IMA-RIE-2016-21', 'Persoonlijke beschermingsmiddelen', 'IMA-RIE-21', '2016-07-22', 'PBM'],
  ['22 Bijzondere groepen.pdf', 'IMA-RIE-2016-22', 'Bijzondere groepen', 'IMA-RIE-22', '2016-07-22', 'BIJZONDERE_GROEPEN'],
  ['23 Duurzame inzetbaarheid.pdf', 'IMA-RIE-2016-23', 'Duurzame inzetbaarheid', 'IMA-RIE-23', '2016-10-06', 'DUURZAME_INZETBAARHEID'],
  ['24 Ongevallen.pdf', 'IMA-RIE-2016-24', 'Ongevallen', 'IMA-RIE-24', '2016-07-22', 'ARBEIDSONGEVALLEN'],
  ['25 Opslag verpakte gevaarlijke stoffen.pdf', 'IMA-RIE-2016-25', 'Opslag verpakte gevaarlijke stoffen', 'IMA-RIE-25', '2016-07-22', 'OPSLAG_GEVAARLIJKE_STOFFEN'],
  ['26 Gasexplosieveiligheid.pdf', 'IMA-RIE-2016-26', 'Gasexplosieveiligheid', 'IMA-RIE-26', '2016-07-22', 'EXPLOSIEVEILIGHEID'],
  ['27 Stofexplosieveiligheid.pdf', 'IMA-RIE-2016-27', 'Stofexplosieveiligheid', 'IMA-RIE-27', '2016-07-22', 'EXPLOSIEVEILIGHEID'],
  ['28 Brandveiligheid.pdf', 'IMA-RIE-2016-28', 'Brandveiligheid', 'IMA-RIE-28', '2016-07-22', 'BRANDVEILIGHEID'],
  ['29 Gezondheidsmanagement.pdf', 'IMA-RIE-2016-29', 'Gezondheidsmanagement', 'IMA-RIE-29', '2016-07-22', 'GEZONDHEIDSMANAGEMENT'],
  ['30 Werken op hoogte.pdf', 'IMA-RIE-2016-30', 'Werken op hoogte', 'IMA-RIE-30', '2016-07-22', 'WERKEN_OP_HOOGTE'],
  ['31 Werken in besloten ruimten.pdf', 'IMA-RIE-2016-31', 'Werken in besloten ruimten', 'IMA-RIE-31', '2016-07-22', 'BESLOTEN_RUIMTEN'],
  ['32 Werken in magazijnen.pdf', 'IMA-RIE-2016-32', 'Werken in magazijnen', 'IMA-RIE-32', '2016-07-22', 'MAGAZIJNVEILIGHEID'],
  ['K-04 Kantoorwerkplekken.pdf', 'IMA-RIE-2016-K04', 'Kantoorwerkplekken', 'IMA-RIE-K04', '2016-08-25', 'KANTOORWERKPLEKKEN'],
].map(([fileName, sourceCode, title, publicationCode, publicationDate, topic], index) => ({ fileName, sourceCode, title, publicationCode, publicationDate, topic, sequence: index + 1 }))

export const IMA_RIE_DOCUMENTS = Object.freeze(definitions)
export const IMA_RIE_ACCEPTANCE_SOURCE_CODES = Object.freeze(['IMA-RIE-2016-01', 'IMA-RIE-2016-09-2', 'IMA-RIE-2016-30'])

export type ImaRieRedactionCategory = 'PERSON_NAME' | 'EMAIL_ADDRESS' | 'PHONE_NUMBER' | 'POSTAL_ADDRESS' | 'ORGANIZATION_IDENTIFIER' | 'DOSSIER_CONTACT_CONTEXT'
export type ImaRieRedactionReport = {
  schemaVersion: 1
  sourceCode: string
  originalChecksum: string
  sanitizedChecksum: string
  counts: Record<ImaRieRedactionCategory, number>
  sourcePageCount: number
  sanitizedPageCount: number
}

export type PreparedImaRieDocument = {
  definition: ImaRieDocumentDefinition
  originalPath: string
  sanitizedPath: string
  reportPath: string
  originalChecksum: string
  sanitizedChecksum: string
  extractionFingerprint: string
  pageCount: number
  blockCount: number
  redactionReport: ImaRieRedactionReport
}

const sha256 = (value: Uint8Array | string) => createHash('sha256').update(value).digest('hex')
const emptyCounts = (): Record<ImaRieRedactionCategory, number> => ({ PERSON_NAME: 0, EMAIL_ADDRESS: 0, PHONE_NUMBER: 0, POSTAL_ADDRESS: 0, ORGANIZATION_IDENTIFIER: 0, DOSSIER_CONTACT_CONTEXT: 0 })
const normalized = (value: string) => normalizeKnowledgeSourceText(value)

function containsDutchPhoneNumber(value: string) {
  const candidates = value.match(/(?:\+31|0)[\d\s().-]{8,16}/gu) ?? []
  return candidates.some((candidate) => {
    if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}$/u.test(candidate.trim())) return false
    const digits = candidate.replace(/\D/gu, '')
    return candidate.trim().startsWith('+31') ? digits.length === 11 : digits.length === 10
  })
}

function redactionCategory(value: string): ImaRieRedactionCategory {
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu.test(value)) return 'EMAIL_ADDRESS'
  if (containsDutchPhoneNumber(value)) return 'PHONE_NUMBER'
  if (/\b\d{4}\s?[A-Z]{2}\b/u.test(value)) return 'POSTAL_ADDRESS'
  if (/\b(?:OOCL|JISTARC|CLAS|Defensie)\b/iu.test(value)) return 'ORGANIZATION_IDENTIFIER'
  if (/\b(?:dhr|mevr|de heer|mevrouw)\.?\b/iu.test(value)) return 'PERSON_NAME'
  return 'DOSSIER_CONTACT_CONTEXT'
}

function coverBlocks(definition: ImaRieDocumentDefinition): ExtractedSourceBlock[] {
  const values: Array<[ExtractedSourceBlock['blockType'], string]> = [
    ['HEADING', 'Rapport Risico-Inventarisatie en -Evaluatie'],
    ['PARAGRAPH', `Titel: ${definition.title}`],
    ['PARAGRAPH', `Datum: ${definition.publicationDate.split('-').reverse().join('-')}`],
    ['PARAGRAPH', 'IMA-versie: IMA-A'],
    ['PARAGRAPH', 'Bron/herkomst: IMA Online'],
  ]
  return values.map(([blockType, exactText], index) => ({ globalSequence: index + 1, pageSequence: index + 1, sectionPath: index === 0 ? exactText : values[0][1], blockType, exactText, normalizedSearchText: normalized(exactText), textHash: sha256(exactText), extractionMethod: 'PDFJS_EMBEDDED_TEXT', confidence: 1, requiresReview: false }))
}

export function redactImaRieExtraction(extraction: FullSourceExtraction, definition: ImaRieDocumentDefinition) {
  const counts = emptyCounts()
  let globalSequence = 0
  const pages = extraction.pages.map((page, pageIndex) => {
    let retained = page.blocks
    if (pageIndex === 0) {
      const colophonIndex = page.blocks.findIndex((block) => /^colofon$/iu.test(block.exactText.trim()))
      if (colophonIndex < 0) throw new Error('IMA_RIE_REDACTION_BOUNDARY_MISSING')
      for (const block of page.blocks.slice(0, colophonIndex)) counts[redactionCategory(block.exactText)] += 1
      retained = [...coverBlocks(definition), ...page.blocks.slice(colophonIndex)]
    }
    const sanitized = retained.flatMap((block) => {
      if (/\b(?:OOCL|JISTARC|CLAS|Defensie)\b/iu.test(block.exactText)) {
        counts.ORGANIZATION_IDENTIFIER += 1
        return []
      }
      if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu.test(block.exactText)) { counts.EMAIL_ADDRESS += 1; return [] }
      if (containsDutchPhoneNumber(block.exactText)) { counts.PHONE_NUMBER += 1; return [] }
      if (/\b\d{4}\s?[A-Z]{2}\b/u.test(block.exactText)) { counts.POSTAL_ADDRESS += 1; return [] }
      globalSequence += 1
      return [{ ...block, globalSequence, pageSequence: globalSequence, normalizedSearchText: normalized(block.exactText), textHash: sha256(block.exactText) }]
    })
    return { pageNumber: page.pageNumber, blocks: sanitized }
  })
  return { pages, counts }
}

function pdfSafe(value: string) {
  return value.normalize('NFKC')
    .replace(/[☐□]/gu, '[ ]').replace(/[☒✓✔]/gu, '[x]').replace(/[•●▪◦]/gu, '- ')
    .replace(/[‐‑‒–—]/gu, '-').replace(/→/gu, '->').replace(/≤/gu, '<=').replace(/≥/gu, '>=').replace(/×/gu, 'x')
    .replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim()
}

function encodable(value: string, font: PDFFont) {
  return [...pdfSafe(value)].map((character) => {
    try { font.encodeText(character); return character } catch { return ' ' }
  }).join('').replace(/\s+/gu, ' ').trim()
}

function wrap(value: string, font: PDFFont, size: number, width: number) {
  const words = encodable(value, font).split(' ').filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= width || !line) line = candidate
    else { lines.push(line); line = word }
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

export async function renderPrivacySafeImaRiePdf(definition: ImaRieDocumentDefinition, pages: Array<{ pageNumber: number; blocks: ExtractedSourceBlock[] }>) {
  const document = await PDFDocument.create()
  document.setTitle(`${definition.title} - ${IMA_RIE_SERIES}`)
  document.setAuthor('IMA Online')
  document.setSubject('Privacyveilige afgeleide bronversie voor intern Knowledge Engine-gebruik')
  document.setProducer('WorkMatchr IMA RI&E privacyredactie v1')
  document.setCreator('WorkMatchr')
  const fixedDate = new Date(`${definition.publicationDate}T00:00:00.000Z`)
  document.setCreationDate(fixedDate)
  document.setModificationDate(fixedDate)
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  let outputPage = document.addPage([A4.width, A4.height])
  let y = A4.height - MARGIN
  let renderedPageCount = 1

  const addPage = () => {
    outputPage = document.addPage([A4.width, A4.height])
    renderedPageCount += 1
    y = A4.height - MARGIN
  }
  const footer = () => {
    outputPage.drawLine({ start: { x: MARGIN, y: 34 }, end: { x: A4.width - MARGIN, y: 34 }, color: rgb(0.82, 0.87, 0.91), thickness: 0.6 })
    outputPage.drawText(`IMA Online - privacyveilige kennisbron - pagina ${renderedPageCount}`, { x: MARGIN, y: 20, size: 7.5, font: regular, color: rgb(0.28, 0.35, 0.42) })
  }
  const ensure = (height: number) => { if (y - height < 48) { footer(); addPage() } }

  for (const sourcePage of pages) {
    if (sourcePage.pageNumber > 1) {
      ensure(26)
      outputPage.drawText(`Bronpagina ${sourcePage.pageNumber}`, { x: MARGIN, y, size: 8, font: bold, color: rgb(0.25, 0.43, 0.58) })
      y -= 16
    }
    for (const block of sourcePage.blocks) {
      const heading = block.blockType === 'HEADING'
      const font = heading ? bold : regular
      const size = heading ? 12 : 9.2
      const lineHeight = heading ? 15 : 12
      const prefix = block.blockType === 'LIST_ITEM' && !/^[-*]/u.test(block.exactText.trim()) ? '- ' : ''
      const lines = wrap(`${prefix}${block.exactText}`, font, size, A4.width - MARGIN * 2)
      ensure(lines.length * lineHeight + (heading ? 8 : 4))
      for (const line of lines) {
        outputPage.drawText(line, { x: MARGIN, y, size, font, color: heading ? rgb(0.04, 0.20, 0.34) : rgb(0.10, 0.14, 0.18) })
        y -= lineHeight
      }
      y -= heading ? 5 : 3
    }
  }
  footer()
  return document.save({ useObjectStreams: false, addDefaultPage: false, objectsPerTick: 50 })
}

function identityFor(definition: ImaRieDocumentDefinition) {
  return { type: 'BIBLIOGRAPHIC' as const, publisher: 'IMA Online', series: IMA_RIE_SERIES, title: definition.title, publicationCode: definition.publicationCode, edition: 'IMA-A', publicationYear: 2016 }
}

export function imaRieOnboardingInput(prepared: PreparedImaRieDocument, retrievedAt: Date): KnowledgeOnboardingInput {
  const definition = prepared.definition
  return {
    source: {
      code: definition.sourceCode, title: definition.title, publisher: 'IMA Online', sourceType: 'PROFESSIONAL_GUIDANCE', sourceFormat: 'PDF', canonicalFamily: 'IMA_ONLINE',
      authorityStatus: 'PROFESSIONAL_REFERENCE', canonicalIdentity: identityFor(definition), jurisdiction: 'NL', applicabilityScope: `Nederlandse arbeidsomstandighedenkennis voor RI&E; onderwerp ${definition.title}`,
      temporalStatus: 'HISTORICAL', sourceFamily: 'IMA_RIE', independenceGroup: 'IMA_ONLINE_RIE_2016', isPrimarySource: false,
    },
    version: { versionLabel: 'IMA-A (2016)', publicationDate: new Date(`${definition.publicationDate}T00:00:00.000Z`), checksum: prepared.sanitizedChecksum },
    artifact: { type: 'LOCAL_SNAPSHOT', mediaType: 'application/pdf', locator: `manifest:rie/${SAFE_FOLDER}/${path.basename(prepared.sanitizedPath)}`, checksum: prepared.sanitizedChecksum, retrievedAt },
    scopes: [{ jurisdiction: 'NL', scopeCode: 'NL_OCCUPATIONAL_HEALTH_AND_SAFETY', effect: 'APPLIES', rationale: `Historisch IMA Online RI&E-deelrapport over ${definition.title}; inhoudelijke actualiteitsreview vereist.` }],
  }
}

export async function prepareImaRieDocument(rootPath: string, outputPath: string, definition: ImaRieDocumentDefinition): Promise<PreparedImaRieDocument> {
  const originalPath = path.join(rootPath, definition.fileName)
  const original = await readFile(originalPath)
  const originalChecksum = sha256(original)
  const extraction = await extractPdfFullSource(original)
  const redacted = redactImaRieExtraction(extraction, definition)
  const firstRender = await renderPrivacySafeImaRiePdf(definition, redacted.pages)
  const replayRender = await renderPrivacySafeImaRiePdf(definition, redacted.pages)
  if (sha256(firstRender) !== sha256(replayRender)) throw new Error('IMA_RIE_SANITIZED_ARTIFACT_NON_DETERMINISTIC')
  const sanitizedExtraction = await extractPdfFullSource(firstRender)
  const sanitizedBlocks = sanitizedExtraction.pages.flatMap((page) => page.blocks.map((block) => block.exactText))
  const searchableText = sanitizedBlocks.join('\n')
  const privacyScan = {
    organizationIdentifier: /\b(?:OOCL|JISTARC|CLAS|Defensie)\b/iu.test(searchableText),
    emailAddress: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu.test(searchableText),
    phoneNumber: sanitizedBlocks.some(containsDutchPhoneNumber),
    postalAddress: /\b\d{4}\s?[A-Z]{2}\b/u.test(searchableText),
  }
  const failedCategories = Object.entries(privacyScan).filter(([, failed]) => failed).map(([category]) => category)
  if (failedCategories.length) throw new Error(`IMA_RIE_PRIVACY_SCAN_FAILED:${failedCategories.join(',')}`)
  const sanitizedChecksum = sha256(firstRender)
  const fileStem = definition.sourceCode.toLowerCase()
  const sanitizedPath = path.join(outputPath, `${fileStem}.pdf`)
  const reportPath = path.join(outputPath, `${fileStem}.redaction.json`)
  await mkdir(outputPath, { recursive: true })
  const report: ImaRieRedactionReport = { schemaVersion: 1, sourceCode: definition.sourceCode, originalChecksum, sanitizedChecksum, counts: redacted.counts, sourcePageCount: extraction.pageCount, sanitizedPageCount: sanitizedExtraction.pageCount }
  await writeFile(sanitizedPath, firstRender)
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  if (sha256(await readFile(originalPath)) !== originalChecksum) throw new Error('IMA_RIE_ORIGINAL_ARTIFACT_CHANGED')
  return { definition, originalPath, sanitizedPath, reportPath, originalChecksum, sanitizedChecksum, extractionFingerprint: sanitizedExtraction.extractionFingerprint, pageCount: sanitizedExtraction.pageCount, blockCount: sanitizedExtraction.pages.reduce((sum, page) => sum + page.blocks.length, 0), redactionReport: report }
}

export async function prepareImaRieSet(rootPath: string, outputPath = path.join(rootPath, SAFE_FOLDER)) {
  const prepared: PreparedImaRieDocument[] = []
  for (const definition of IMA_RIE_DOCUMENTS) prepared.push(await prepareImaRieDocument(rootPath, outputPath, definition))
  const manifest = {
    schemaVersion: 1,
    family: { code: IMA_RIE_FAMILY_CODE, title: IMA_RIE_FAMILY_TITLE },
    documents: prepared.map((entry) => ({ sourceCode: entry.definition.sourceCode, title: entry.definition.title, publicationCode: entry.definition.publicationCode, versionLabel: 'IMA-A (2016)', publicationDate: entry.definition.publicationDate, publisher: 'IMA Online', sourceType: 'PROFESSIONAL_GUIDANCE', sourceFamily: 'IMA_RIE', canonicalFamily: 'IMA_ONLINE', authorityStatus: 'PROFESSIONAL_REFERENCE', temporalStatus: 'HISTORICAL', canonicalUrl: null, canonicalIdentity: resolveCanonicalIdentity(identityFor(entry.definition)), checksum: entry.sanitizedChecksum, originalChecksum: entry.originalChecksum, extractionFingerprint: entry.extractionFingerprint, pageCount: entry.pageCount, blockCount: entry.blockCount, artifact: path.basename(entry.sanitizedPath), redactionReport: path.basename(entry.reportPath), familyRole: 'CHECKLIST', sequence: entry.definition.sequence, topic: entry.definition.topic, reviewStatus: 'REVIEW_REQUIRED' })),
  }
  await writeFile(path.join(outputPath, 'ima-rie-2016.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return prepared
}

type DatabaseClient = ReturnType<typeof getPrisma>

export async function preflightImaRieDocuments(prepared: PreparedImaRieDocument[], database: DatabaseClient = getPrisma()) {
  const fingerprints = prepared.map((entry) => resolveCanonicalIdentity(identityFor(entry.definition)).canonicalFingerprint)
  const [byCode, byChecksum, byFingerprint] = await Promise.all([
    database.knowledgeSource.findMany({ where: { code: { in: prepared.map((entry) => entry.definition.sourceCode) } }, select: { id: true, code: true } }),
    database.knowledgeSourceVersion.findMany({ where: { checksum: { in: prepared.map((entry) => entry.sanitizedChecksum) } }, select: { id: true, checksum: true, sourceId: true } }),
    database.knowledgeSourceCanonicalIdentity.findMany({ where: { canonicalFingerprint: { in: fingerprints } }, select: { sourceId: true, canonicalFingerprint: true } }),
  ])
  const documents = prepared.map((entry) => {
    const fingerprint = resolveCanonicalIdentity(identityFor(entry.definition)).canonicalFingerprint
    const codeOwner = byCode.find((candidate) => candidate.code === entry.definition.sourceCode)?.id
    const checksumOwner = byChecksum.find((candidate) => candidate.checksum === entry.sanitizedChecksum)?.sourceId
    const identityOwner = byFingerprint.find((candidate) => candidate.canonicalFingerprint === fingerprint)?.sourceId
    const owners = [...new Set([codeOwner, checksumOwner, identityOwner].filter((value): value is string => Boolean(value)))]
    const status = owners.length === 0 ? 'READY' : owners.length === 1 && codeOwner === owners[0] && checksumOwner === owners[0] && identityOwner === owners[0] ? 'IDENTICAL_REPLAY' : 'CONFLICT'
    return { sourceCode: entry.definition.sourceCode, status }
  })
  return { sourceCodeMatches: byCode, checksumMatches: byChecksum, canonicalIdentityMatches: byFingerprint, documents }
}

export async function inspectImaRieDocuments(sourceCodes: readonly string[], database: DatabaseClient = getPrisma()) {
  const sources = await database.knowledgeSource.findMany({
    where: { code: { in: [...sourceCodes] } },
    select: {
      id: true, code: true, publisher: true, sourceUrl: true, canonicalFamily: true, authorityStatus: true, authorityLevel: true, temporalStatus: true, sourceFamily: true, independenceGroup: true,
      canonicalIdentity: { select: { identityType: true, canonicalFingerprint: true, bibliographicPublisher: true, bibliographicPublicationCode: true, bibliographicYear: true } },
      versions: { select: { id: true, checksum: true, reviewStatus: true, extractionStatus: true, extractionRuns: { select: { id: true, status: true, pageCount: true, extractionFingerprint: true, _count: { select: { pages: true } } } } } },
    },
    orderBy: { code: 'asc' },
  })
  const runIds = sources.flatMap((source) => source.versions.flatMap((version) => version.extractionRuns.map((run) => run.id)))
  const blockCounts = runIds.length ? await database.knowledgeSourceBlock.groupBy({ by: ['extractionRunId'], where: { extractionRunId: { in: runIds } }, _count: { _all: true } }) : []
  return sources.map((source) => ({
    ...source,
    versions: source.versions.map((version) => ({ ...version, extractionRuns: version.extractionRuns.map((run) => ({ ...run, blockCount: blockCounts.find((entry) => entry.extractionRunId === run.id)?._count._all ?? 0 })) })),
  }))
}

export async function importImaRieDocuments(prepared: PreparedImaRieDocument[], sourceCodes: readonly string[], retrievedAt: Date, database: DatabaseClient = getPrisma()) {
  const selected = sourceCodes.map((sourceCode) => {
    const entry = prepared.find((candidate) => candidate.definition.sourceCode === sourceCode)
    if (!entry) throw new Error('IMA_RIE_IMPORT_SELECTION_INVALID')
    return entry
  })
  const results = []
  for (const entry of selected) {
    const bytes = await readFile(entry.sanitizedPath)
    if (sha256(bytes) !== entry.sanitizedChecksum) throw new Error('IMA_RIE_SANITIZED_ARTIFACT_CHANGED')
    results.push({ entry, result: await ingestKnowledgeLibraryDocument({ onboarding: imaRieOnboardingInput(entry, retrievedAt), extract: () => extractPdfFullSource(bytes) }, database) })
  }
  const family = sourceCodes.length === IMA_RIE_DOCUMENTS.length
    ? await storeKnowledgeDocumentFamily({ code: IMA_RIE_FAMILY_CODE, title: IMA_RIE_FAMILY_TITLE, members: results.sort((left, right) => left.entry.definition.sequence - right.entry.definition.sequence).map(({ entry, result }) => ({ sourceVersionId: result.sourceVersionId, role: 'CHECKLIST' as const, sequence: entry.definition.sequence })) }, database)
    : { documentFamilyId: null, created: false, plannedCode: IMA_RIE_FAMILY_CODE, reason: 'FAMILY_DEFERRED_UNTIL_COMPLETE_SET' as const }
  return { results, family }
}
