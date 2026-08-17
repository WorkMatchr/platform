import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'
import type { KnowledgeSourceBlockType, KnowledgeSourcePageStatus } from '@/generated/prisma/enums'
import type { KnowledgeSourceManifest } from './knowledge-source-manifest'
import { verifyManifestSource } from './knowledge-source-manifest'

export const FULL_SOURCE_EXTRACTOR = {
  name: 'WORKMATCHR_PDFJS_EMBEDDED_TEXT',
  version: '1.0.0',
  configurationVersion: 'FULL_SOURCE_V1',
} as const

export type KnowledgeExtractionCandidate = {
  sourceCode: string
  status: 'READY_FOR_MANUAL_EXTRACTION' | 'UNSUPPORTED_FOR_EXTRACTION'
  uncertainties: string[]
}

export interface KnowledgeExtractor {
  supports(format: KnowledgeSourceManifest['sources'][number]['format']): boolean
  inspect(source: KnowledgeSourceManifest['sources'][number]): Promise<KnowledgeExtractionCandidate>
}

export type ExtractedSourceBlock = {
  globalSequence: number
  pageSequence: number
  sectionPath: string | null
  blockType: KnowledgeSourceBlockType
  exactText: string
  normalizedSearchText: string
  textHash: string
  extractionMethod: 'PDFJS_EMBEDDED_TEXT' | 'WORKMATCHR_HTML_TEXT' | 'WORKMATCHR_LEGAL_TEXT'
  confidence: number
  requiresReview: boolean
}

export type ExtractedSourcePage = {
  pageNumber: number
  status: KnowledgeSourcePageStatus
  textHash: string
  ocrUsed: false
  confidence: number | null
  blocks: ExtractedSourceBlock[]
}

export type FullSourceExtraction = {
  extractorName: string
  extractorVersion: string
  configurationVersion: string
  pageCount: number
  extractionFingerprint: string
  warningSummary: string | null
  pages: ExtractedSourcePage[]
}

type PositionedLine = {
  pageNumber: number
  text: string
  normalized: string
  y: number
  height: number
  pageHeight: number
  pageWidth: number
  x: number
  width: number
  column: number
}

const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')

export function removePostgresUnsafeNullBytes(value: string) {
  return value.replace(/\u0000/gu, '')
}

function countNullBytes(value: string) {
  return value.match(/\u0000/gu)?.length ?? 0
}

export function normalizeKnowledgeSourceText(value: string) {
  return removePostgresUnsafeNullBytes(value).normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('nl-NL')
}

function stableRepeatedLine(value: string) {
  return normalizeKnowledgeSourceText(value).replace(/\b\d+\b/g, '#')
}

function createLine(items: TextItem[], pageNumber: number, pageWidth: number, pageHeight: number): PositionedLine | null {
  const sorted = [...items].sort((left, right) => left.transform[4] - right.transform[4])
  let text = ''
  let previousEnd: number | null = null
  for (const item of sorted) {
    const x = item.transform[4]
    if (previousEnd !== null && x - previousEnd > Math.max(2, item.height * 0.35)) text += ' '
    text += item.str
    previousEnd = x + item.width
  }
  text = removePostgresUnsafeNullBytes(text).replace(/\s+/g, ' ').trim()
  if (!text) return null
  return {
    pageNumber,
    text,
    normalized: normalizeKnowledgeSourceText(text),
    y: items.reduce((total, item) => total + item.transform[5], 0) / items.length,
    height: Math.max(...items.map((item) => item.height || Math.abs(item.transform[3]))),
    pageHeight,
    pageWidth,
    x: Math.min(...items.map((item) => item.transform[4])),
    width: Math.max(...items.map((item) => item.transform[4] + item.width)) - Math.min(...items.map((item) => item.transform[4])),
    column: 0,
  }
}

function splitRowAtDocumentGutters(items: TextItem[], pageWidth: number) {
  const sorted = [...items].sort((left, right) => left.transform[4] - right.transform[4])
  const groups: TextItem[][] = []
  for (const item of sorted) {
    const previous = groups.at(-1)?.at(-1)
    const gap = previous ? item.transform[4] - (previous.transform[4] + previous.width) : 0
    if (!previous || gap > Math.max(12, pageWidth * 0.02)) groups.push([item])
    else groups.at(-1)!.push(item)
  }
  return groups
}

function orderPageLines(lines: PositionedLine[]) {
  if (lines.length === 0) return lines
  const pageWidth = lines[0].pageWidth
  const left = lines.filter((line) => line.x < pageWidth * 0.4 && line.width < pageWidth * 0.65)
  const right = lines.filter((line) => line.x >= pageWidth * 0.4 && line.width < pageWidth * 0.65)
  const hasColumns = left.length >= 5 && right.length >= 5
  if (!hasColumns) return lines.sort((first, second) => second.y - first.y || first.x - second.x)
  for (const line of lines) {
    line.column = line.width >= pageWidth * 0.65
      ? line.y >= line.pageHeight * 0.85 ? -1 : line.y <= line.pageHeight * 0.15 ? 2 : 0
      : line.x < pageWidth * 0.4 ? 0 : 1
  }
  return lines.sort((first, second) => first.column - second.column || second.y - first.y || first.x - second.x)
}

async function extractLines(bytes: Uint8Array) {
  const loadingTask = getDocument({ data: bytes, disableFontFace: true, useSystemFonts: false, verbosity: 0 })
  const document = await loadingTask.promise
  const pages: PositionedLine[][] = []
  let nulByteCount = 0
  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1 })
      const content = await page.getTextContent({ disableNormalization: false })
      const textItems = content.items.filter((item): item is TextItem => 'str' in item && item.str.trim().length > 0)
      nulByteCount += textItems.reduce((total, item) => total + countNullBytes(item.str), 0)
      const rows: TextItem[][] = []
      for (const item of textItems) {
        const y = item.transform[5]
        const existing = rows.find((row) => Math.abs(row[0].transform[5] - y) <= Math.max(1.5, item.height * 0.35))
        if (existing) existing.push(item)
        else rows.push([item])
      }
      pages.push(orderPageLines(rows
        .flatMap((row) => splitRowAtDocumentGutters(row, viewport.width))
        .map((row) => createLine(row, pageNumber, viewport.width, viewport.height))
        .filter((line): line is PositionedLine => Boolean(line))
      ))
    }
  } finally {
    await loadingTask.destroy()
  }
  return { pages, nulByteCount }
}

function repeatedMargins(pages: PositionedLine[][]) {
  const occurrences = new Map<string, Set<number>>()
  for (const lines of pages) {
    for (const line of lines.filter((entry) => entry.y >= entry.pageHeight * 0.9 || entry.y <= entry.pageHeight * 0.1)) {
      const key = stableRepeatedLine(line.text)
      if (key.length < 2) continue
      const pageNumbers = occurrences.get(key) ?? new Set<number>()
      pageNumbers.add(line.pageNumber)
      occurrences.set(key, pageNumbers)
    }
  }
  const threshold = Math.max(3, Math.ceil(pages.length * 0.6))
  return new Set([...occurrences.entries()].filter(([, pageNumbers]) => pageNumbers.size >= threshold).map(([key]) => key))
}

function looksLikeList(text: string) {
  return /^(?:[-•●▪◦*]|\d+[.)]|[a-z][.)])\s+/iu.test(text)
}

function looksLikeCaption(text: string) {
  return /^(?:figuur|afbeelding|tabel)\s+\d+/iu.test(text)
}

function looksLikeExample(text: string) {
  return /^(?:voorbeeld|praktijkvoorbeeld)\b/iu.test(text)
}

function looksLikeHeading(line: PositionedLine, medianHeight: number) {
  if (line.text.length > 160) return false
  if (line.height >= medianHeight * 1.2) return true
  if (/^\d+(?:\.\d+)*[.)]?\s+\p{Lu}/u.test(line.text)) return true
  return line.text.length <= 90 && !/[.!?;:]$/u.test(line.text) && line.text === line.text.toLocaleUpperCase('nl-NL')
}

function looksLikeTable(text: string) {
  return /\S\s{2,}\S/u.test(text) || (text.match(/\s[|]\s/g)?.length ?? 0) >= 1
}

function classifyLine(line: PositionedLine, medianHeight: number, repeated: Set<string>): KnowledgeSourceBlockType {
  if (repeated.has(stableRepeatedLine(line.text))) return 'HEADER_FOOTER'
  if (looksLikeCaption(line.text)) return 'CAPTION'
  if (looksLikeExample(line.text)) return 'EXAMPLE'
  if (looksLikeHeading(line, medianHeight)) return 'HEADING'
  if (looksLikeList(line.text)) return 'LIST_ITEM'
  if (looksLikeTable(line.text)) return 'TABLE'
  if (line.y <= line.pageHeight * 0.12 && line.height < medianHeight * 0.9) return 'FOOTNOTE'
  return 'PARAGRAPH'
}

export type FullSourceExtractorDescriptor = Readonly<{
  name: string
  version: string
  configurationVersion: string
}>

function canonicalFingerprint(pages: ExtractedSourcePage[], descriptor: FullSourceExtractorDescriptor) {
  return sha256(JSON.stringify({
    extractor: descriptor,
    pages: pages.map((page) => ({
      pageNumber: page.pageNumber,
      status: page.status,
      textHash: page.textHash,
      blocks: page.blocks.map(({ globalSequence, pageSequence, sectionPath, blockType, textHash }) => ({ globalSequence, pageSequence, sectionPath, blockType, textHash })),
    })),
  }))
}

export type StructuredSourceSection = { heading?: string; paragraphs: string[] }

function decodeHtml(value: string) {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (_, entity: string) => {
    if (entity.startsWith('#x')) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16))
    if (entity.startsWith('#')) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10))
    return entities[entity.toLowerCase()] ?? `&${entity};`
  })
}

export function extractStructuredTextFullSource(
  sections: StructuredSourceSection[],
  descriptor: FullSourceExtractorDescriptor = { name: 'WORKMATCHR_LEGAL_TEXT', version: '1.0.0', configurationVersion: 'STRUCTURED_TEXT_V1' },
): FullSourceExtraction {
  let globalSequence = 0
  let nulByteCount = 0
  const blocks = sections.flatMap((section) => {
    const result: ExtractedSourceBlock[] = []
    nulByteCount += countNullBytes(section.heading ?? '')
    const heading = removePostgresUnsafeNullBytes(section.heading ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim() || undefined
    if (heading) result.push({ globalSequence: ++globalSequence, pageSequence: globalSequence, sectionPath: heading, blockType: 'HEADING', exactText: heading, normalizedSearchText: normalizeKnowledgeSourceText(heading), textHash: sha256(heading), extractionMethod: descriptor.name === 'WORKMATCHR_HTML_TEXT' ? 'WORKMATCHR_HTML_TEXT' : 'WORKMATCHR_LEGAL_TEXT', confidence: 1, requiresReview: false })
    for (const raw of section.paragraphs) {
      nulByteCount += countNullBytes(raw)
      const exactText = removePostgresUnsafeNullBytes(raw).normalize('NFKC').replace(/\s+/g, ' ').trim()
      if (!exactText) continue
      result.push({ globalSequence: ++globalSequence, pageSequence: globalSequence, sectionPath: heading ?? null, blockType: looksLikeList(exactText) ? 'LIST_ITEM' : 'PARAGRAPH', exactText, normalizedSearchText: normalizeKnowledgeSourceText(exactText), textHash: sha256(exactText), extractionMethod: descriptor.name === 'WORKMATCHR_HTML_TEXT' ? 'WORKMATCHR_HTML_TEXT' : 'WORKMATCHR_LEGAL_TEXT', confidence: 1, requiresReview: false })
    }
    return result
  })
  if (!blocks.length) throw new Error('KNOWLEDGE_FULL_SOURCE_EMPTY_STRUCTURED_TEXT')
  const page: ExtractedSourcePage = { pageNumber: 1, status: 'EXTRACTED', textHash: sha256(blocks.map((block) => block.exactText).join('\n')), ocrUsed: false, confidence: 1, blocks }
  return { extractorName: descriptor.name, extractorVersion: descriptor.version, configurationVersion: descriptor.configurationVersion, pageCount: 1, extractionFingerprint: canonicalFingerprint([page], descriptor), warningSummary: nulByteCount > 0 ? `${nulByteCount} PostgreSQL-onveilige NUL-byte(s) deterministisch verwijderd.` : null, pages: [page] }
}

export function extractHtmlFullSource(html: string): FullSourceExtraction {
  const safe = html.replace(/<!--[\s\S]*?-->/gu, '').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/giu, '')
  const tokenPattern = /<(h[1-6]|p|li|caption|figcaption|th|td)\b[^>]*>([\s\S]*?)<\/\1>/giu
  const sections: StructuredSourceSection[] = []
  let active: StructuredSourceSection = { paragraphs: [] }
  for (const match of safe.matchAll(tokenPattern)) {
    const tag = match[1].toLowerCase()
    const text = decodeHtml(match[2].replace(/<br\s*\/?\s*>/giu, ' ').replace(/<[^>]+>/gu, ' ')).replace(/\s+/g, ' ').trim()
    if (!text) continue
    if (tag.startsWith('h')) {
      if (active.heading || active.paragraphs.length) sections.push(active)
      active = { heading: text, paragraphs: [] }
    } else active.paragraphs.push(tag === 'li' ? `- ${text}` : text)
  }
  if (active.heading || active.paragraphs.length) sections.push(active)
  return extractStructuredTextFullSource(sections, { name: 'WORKMATCHR_HTML_TEXT', version: '1.0.0', configurationVersion: 'HTML_TEXT_V1' })
}

export async function extractPdfFullSource(
  bytes: Uint8Array,
  descriptor: FullSourceExtractorDescriptor = FULL_SOURCE_EXTRACTOR,
): Promise<FullSourceExtraction> {
  if (new TextDecoder('ascii').decode(bytes.subarray(0, 5)) !== '%PDF-') throw new Error('KNOWLEDGE_FULL_SOURCE_INVALID_PDF')
  // PDF.js may transfer/detach its input buffer; callers retain ownership of their bytes.
  const { pages: linePages, nulByteCount } = await extractLines(Uint8Array.from(bytes))
  const repeated = repeatedMargins(linePages)
  let globalSequence = 0
  let activeSection: string | null = null
  const pages = linePages.map((lines, pageIndex): ExtractedSourcePage => {
    const heights = lines.map((line) => line.height).sort((left, right) => left - right)
    const medianHeight = heights[Math.floor(heights.length / 2)] || 10
    const grouped: Array<{ lines: PositionedLine[]; blockType: KnowledgeSourceBlockType; sectionPath: string | null }> = []
    for (const line of lines) {
      const blockType = classifyLine(line, medianHeight, repeated)
      if (blockType === 'HEADING') activeSection = line.text
      const previous = grouped.at(-1)
      const verticalGap = previous ? previous.lines.at(-1)!.y - line.y : Number.POSITIVE_INFINITY
      if (blockType === 'PARAGRAPH' && previous?.blockType === 'PARAGRAPH' && previous.lines[0].column === line.column && verticalGap >= 0 && verticalGap <= medianHeight * 1.8) {
        previous.lines.push(line)
      } else {
        grouped.push({ lines: [line], blockType, sectionPath: activeSection })
      }
    }
    const blocks: ExtractedSourceBlock[] = grouped.map((group, index) => {
      globalSequence += 1
      const exactText = group.lines.map((line) => line.text).join(' ').replace(/-\s+(?=\p{Ll})/gu, '')
      return {
        globalSequence,
        pageSequence: index + 1,
        sectionPath: group.sectionPath,
        blockType: group.blockType,
        exactText,
        normalizedSearchText: normalizeKnowledgeSourceText(exactText),
        textHash: sha256(exactText),
        extractionMethod: 'PDFJS_EMBEDDED_TEXT',
        confidence: group.blockType === 'PARAGRAPH' || group.blockType === 'LIST_ITEM' ? 0.98 : 0.9,
        requiresReview: group.blockType === 'TABLE',
      }
    })
    const pageText = blocks.filter((block) => block.blockType !== 'HEADER_FOOTER').map((block) => block.exactText).join('\n')
    return {
      pageNumber: pageIndex + 1,
      status: blocks.length ? 'EXTRACTED' : 'EMPTY',
      textHash: sha256(pageText),
      ocrUsed: false,
      confidence: blocks.length ? 0.95 : null,
      blocks,
    }
  })
  return {
    extractorName: descriptor.name,
    extractorVersion: descriptor.version,
    configurationVersion: descriptor.configurationVersion,
    pageCount: pages.length,
    extractionFingerprint: canonicalFingerprint(pages, descriptor),
    warningSummary: [
      pages.some((page) => page.status === 'EMPTY') ? 'Een of meer pagina\'s bevatten geen embedded tekst; OCR is in fase 1 uitgeschakeld.' : null,
      nulByteCount > 0 ? `${nulByteCount} PostgreSQL-onveilige NUL-byte(s) deterministisch verwijderd.` : null,
    ].filter(Boolean).join(' ') || null,
    pages,
  }
}

export class LocalPdfInspectionExtractor implements KnowledgeExtractor {
  supports(format: KnowledgeSourceManifest['sources'][number]['format']) {
    return format === 'PDF'
  }

  async inspect(source: KnowledgeSourceManifest['sources'][number]) {
    if (!this.supports(source.format)) {
      return { sourceCode: source.code, status: 'UNSUPPORTED_FOR_EXTRACTION' as const, uncertainties: ['Legacy DOC wordt in v1 niet geopend of geconverteerd.'] }
    }
    await verifyManifestSource(source)
    return {
      sourceCode: source.code,
      status: 'READY_FOR_MANUAL_EXTRACTION' as const,
      uncertainties: ['Volledige tekstextractie levert interne bronblokken op; inhoudelijke validatie blijft een afzonderlijke gecontroleerde stap.'],
    }
  }
}

export async function extractVerifiedManifestPdf(source: KnowledgeSourceManifest['sources'][number]) {
  const verified = await verifyManifestSource(source)
  if (verified.extractionStatus !== 'READY' || !('filePath' in verified)) throw new Error('KNOWLEDGE_FULL_SOURCE_UNSUPPORTED')
  return extractPdfFullSource(await readFile(verified.filePath))
}
