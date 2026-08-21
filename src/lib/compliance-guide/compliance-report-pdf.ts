import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { ArboGuideReportSnapshot } from '@/lib/arbo-guides/arbo-guide-run-service'
import { groupArboGuideSources, normalizeArboGuideReportSource } from '@/lib/arbo-guides/arbo-guide-sources'
import type { ComplianceReportData } from './compliance-report'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 54
const TOP = 58
const BOTTOM = 54
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const BODY_SIZE = 10
const LINE_HEIGHT = 14
export const WORKMATCHR_LOGO_WIDTH_PX = 1321
export const WORKMATCHR_LOGO_HEIGHT_PX = 372
export const WORKMATCHR_LOGO_ASPECT_RATIO = WORKMATCHR_LOGO_WIDTH_PX / WORKMATCHR_LOGO_HEIGHT_PX
const PDF_LOGO_WIDTH = 230
export const PDF_LOGO_HEIGHT = PDF_LOGO_WIDTH / WORKMATCHR_LOGO_ASPECT_RATIO
const WORKMATCHR_LOGO_PATH = join(process.cwd(), 'public', 'branding', 'workmatchr-logo.png')

function normalizePdfText(value: string): string {
  return value.replaceAll('\u0000', '').replaceAll('\u2011', '-').replaceAll('\u2013', '-').replaceAll('\u2014', '-').replaceAll('\u202f', ' ').replaceAll('\u00a0', ' ').replaceAll('\u2192', '->')
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const splitWord = (word: string): string[] => {
    if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word]
    const parts: string[] = []
    let part = ''
    for (const character of word) {
      const candidate = `${part}${character}`
      if (part && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        parts.push(part)
        part = character
      } else part = candidate
    }
    if (part) parts.push(part)
    return parts
  }

  return normalizePdfText(text).split(/\r?\n/).flatMap((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean).flatMap(splitWord)
    if (words.length === 0) return ['']
    const lines: string[] = []
    let current = ''
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) {
        lines.push(current)
        current = word
      } else current = candidate
    }
    if (current) lines.push(current)
    return lines
  })
}

export async function buildComplianceReportPdf(report: ArboGuideReportSnapshot | ComplianceReportData, options: { reportNumber?: string | null; guideTitle?: string } = {}): Promise<Uint8Array> {
  if (report.tier !== 'BASIC') throw new Error('De uitgebreide rapportage is nog niet beschikbaar.')

  const document = await PDFDocument.create()
  const guideTitle = options.guideTitle ?? 'Compliance-wijzer'
  document.setTitle(`WorkMatchr ${guideTitle} rapport`)
  document.setAuthor('WorkMatchr')
  document.setSubject(`Indicatieve ${guideTitle}, beoordelingsset versie ${report.assessmentVersion}`)
  document.setCreationDate(new Date(report.scannedAt))
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const workmatchrLogo = await document.embedPng(await readFile(WORKMATCHR_LOGO_PATH))
  const brandDark = rgb(0.02, 0.17, 0.29)
  const brandBlue = rgb(0.05, 0.43, 0.64)
  const textColor = rgb(0.13, 0.2, 0.27)
  const muted = rgb(0.35, 0.4, 0.46)
  const border = rgb(0.82, 0.85, 0.88)
  let page: PDFPage = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const coverPage = page
  let y = 0

  function preparePage(cover = false): void {
    y = PAGE_HEIGHT - TOP
    if (cover) {
      page.drawImage(workmatchrLogo, { x: MARGIN_X, y: y - PDF_LOGO_HEIGHT + 8, width: PDF_LOGO_WIDTH, height: PDF_LOGO_HEIGHT })
      y -= PDF_LOGO_HEIGHT + 8
    } else {
      page.drawText('WorkMatchr', { x: MARGIN_X, y, size: 12, font: bold, color: brandDark })
      y -= 18
    }
    page.drawLine({ start: { x: MARGIN_X, y }, end: { x: PAGE_WIDTH - MARGIN_X, y }, color: brandBlue, thickness: 1.2 })
    y -= 24
  }
  function newPage(): void { page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]); preparePage() }
  function ensureSpace(height: number): void { if (y - height < BOTTOM) newPage() }
  function text(value: string, options: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gapAfter?: number; indent?: number } = {}): void {
    const usedFont = options.font ?? regular
    const size = options.size ?? BODY_SIZE
    const indent = options.indent ?? 0
    for (const line of wrapText(value, usedFont, size, CONTENT_WIDTH - indent)) {
      ensureSpace(LINE_HEIGHT)
      page.drawText(line, { x: MARGIN_X + indent, y, size, font: usedFont, color: options.color ?? textColor })
      y -= LINE_HEIGHT
    }
    y -= options.gapAfter ?? 4
  }
  function heading(value: string): void {
    ensureSpace(34)
    y -= 7
    text(value, { font: bold, size: 14, color: brandDark, gapAfter: 6 })
  }
  function divider(): void {
    ensureSpace(18)
    page.drawLine({ start: { x: MARGIN_X, y }, end: { x: PAGE_WIDTH - MARGIN_X, y }, color: border, thickness: 0.7 })
    y -= 14
  }
  function twoColumnList(values: readonly string[]): void {
    const columnGap = 18
    const columnWidth = (CONTENT_WIDTH - columnGap) / 2
    const rows = Math.ceil(values.length / 2)
    for (let row = 0; row < rows; row += 1) {
      const left = values[row]
      const right = values[row + rows]
      const leftLines = left ? wrapText(`- ${left}`, regular, BODY_SIZE, columnWidth) : []
      const rightLines = right ? wrapText(`- ${right}`, regular, BODY_SIZE, columnWidth) : []
      const rowLines = Math.max(leftLines.length, rightLines.length)
      ensureSpace(rowLines * LINE_HEIGHT)
      leftLines.forEach((line, index) => page.drawText(line, { x: MARGIN_X, y: y - index * LINE_HEIGHT, size: BODY_SIZE, font: regular, color: textColor }))
      rightLines.forEach((line, index) => page.drawText(line, { x: MARGIN_X + columnWidth + columnGap, y: y - index * LINE_HEIGHT, size: BODY_SIZE, font: regular, color: textColor }))
      y -= rowLines * LINE_HEIGHT
    }
    y -= 4
  }

  function measuredTextHeight(value: string, font: PDFFont = regular, size = BODY_SIZE, width = CONTENT_WIDTH): number {
    return wrapText(value, font, size, width).length * LINE_HEIGHT
  }

  const scanDate = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(report.scannedAt))
  preparePage(true)
  text(guideTitle, { font: bold, size: 25, color: brandDark, gapAfter: 10 })
  text('Indicatief basisrapport', { font: bold, size: 13, color: brandBlue, gapAfter: 18 })
  if (report.organizationName) text(`Organisatie: ${report.organizationName}`, { font: bold, gapAfter: 3 })
  if (options.reportNumber) text(`Rapportnummer: ${options.reportNumber}`, { font: bold, gapAfter: 3 })
  text(`Datum van de scan: ${scanDate}`, { color: muted, gapAfter: 3 })
  text(`Beoordelingsset: versie ${report.assessmentVersion}`, { color: muted, gapAfter: 18 })
  text(`Rapportstructuur: versie ${report.reportVersion}`, { color: muted, gapAfter: 18 })
  text(`Dit rapport vat de uitkomst van de gratis ${guideTitle} samen. Het bevat geen formele goedkeuring, score of certificaat.`, { color: muted })

  const managementSummary = 'managementSummary' in report ? report.managementSummary : undefined
  const scenarioLabels = 'scenarioLabels' in report ? report.scenarioLabels : undefined
  if (managementSummary) {
    heading('Managementsamenvatting')
    text(managementSummary)
  }
  if (scenarioLabels?.length) {
    heading('Relevante incidentscenario’s')
    twoColumnList(scenarioLabels)
  }

  heading('Samenvatting')
  text(`${report.summary.order} onderdelen op orde`)
  text(`${report.summary.action} onderdelen vragen actie`)
  text(`${report.summary.check} onderdelen moeten worden gecontroleerd`)
  text(`${report.summary.notApplicable} onderdelen niet van toepassing`)

  if (report.attentionItems.length > 0) {
    heading('Belangrijkste aandachtspunten')
    for (const result of report.attentionItems.slice(0, 5)) text(`- ${result.title}: ${result.statusLabel}`)
  }

  if (page !== coverPage) throw new Error('De samenvatting past niet volledig op de voorpagina.')

  // Detailresultaten beginnen voor iedere Arbo-wijzer op een nieuwe pagina.
  newPage()
  text('Resultaten per onderwerp', { font: bold, size: 18, color: brandDark, gapAfter: 10 })
  for (const result of report.results) {
    const estimatedHeight = 48
      + measuredTextHeight(result.title, bold, 12)
      + measuredTextHeight(result.explanation)
      + measuredTextHeight(`Vervolgstap: ${result.nextStep}`)
    ensureSpace(Math.min(estimatedHeight, PAGE_HEIGHT - TOP - BOTTOM))
    divider()
    text(result.title, { font: bold, size: 12, color: brandDark, gapAfter: 2 })
    text(`Status: ${result.statusLabel}`, { font: bold, color: brandBlue, gapAfter: 3 })
    text(result.explanation)
    text(`Vervolgstap: ${result.nextStep}`, { color: muted, gapAfter: 7 })
  }

  heading('Belangrijkste aandachtspunten')
  if (report.attentionItems.length === 0) text('Op basis van de ingevoerde antwoorden zijn geen onderdelen als Actie nodig of Controleren aangemerkt.')
  for (const result of report.attentionItems) {
    text(`${result.statusLabel} - ${result.title}`, { font: bold, gapAfter: 2 })
    text(result.nextStep, { indent: 8, gapAfter: 6 })
  }

  heading('Geraadpleegde bronnen')
  const sourceGroups = groupArboGuideSources(report.sources.map(normalizeArboGuideReportSource))
  for (const group of sourceGroups) {
    text(group.label, { font: bold, size: 11, color: brandDark, gapAfter: 3 })
    for (const source of group.sources) {
      text(`${source.title} - ${source.publisher}`, { font: bold, gapAfter: 1 })
      text(source.url, { color: brandBlue, gapAfter: 1 })
      text(`Door WorkMatchr gecontroleerd op ${source.reviewedAt}`, { size: 8.5, color: muted, gapAfter: 6 })
    }
  }

  heading('Disclaimer')
  text(report.disclaimer, { size: 9, color: muted, gapAfter: 0 })

  const pages = document.getPages()
  pages.forEach((currentPage, index) => {
    const label = `Pagina ${index + 1} van ${pages.length}`
    currentPage.drawText(label, { x: PAGE_WIDTH - MARGIN_X - regular.widthOfTextAtSize(label, 8), y: 28, size: 8, font: regular, color: muted })
  })
  return document.save()
}
