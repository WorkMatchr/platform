import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { ComplianceReportData } from './compliance-report'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 54
const TOP = 58
const BOTTOM = 54
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const BODY_SIZE = 10
const LINE_HEIGHT = 14

function normalizePdfText(value: string): string {
  return value.replaceAll('\u0000', '').replaceAll('\u2011', '-').replaceAll('\u202f', ' ').replaceAll('\u00a0', ' ').replaceAll('\u2192', '->')
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

export async function buildComplianceReportPdf(report: ComplianceReportData): Promise<Uint8Array> {
  if (report.tier !== 'BASIC') throw new Error('De uitgebreide rapportage is nog niet beschikbaar.')

  const document = await PDFDocument.create()
  document.setTitle('WorkMatchr Compliance-wijzer rapport')
  document.setAuthor('WorkMatchr')
  document.setSubject(`Indicatieve Compliance-wijzer, beoordelingsset versie ${report.assessmentVersion}`)
  document.setCreationDate(new Date(report.scannedAt))
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const brandDark = rgb(0.02, 0.17, 0.29)
  const brandBlue = rgb(0.05, 0.43, 0.64)
  const textColor = rgb(0.13, 0.2, 0.27)
  const muted = rgb(0.35, 0.4, 0.46)
  const border = rgb(0.82, 0.85, 0.88)
  let page: PDFPage = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = 0

  function preparePage(): void {
    y = PAGE_HEIGHT - TOP
    page.drawText('WorkMatchr', { x: MARGIN_X, y, size: 12, font: bold, color: brandDark })
    page.drawLine({ start: { x: MARGIN_X, y: y - 10 }, end: { x: PAGE_WIDTH - MARGIN_X, y: y - 10 }, color: brandBlue, thickness: 1.2 })
    y -= 34
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

  const scanDate = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(report.scannedAt))
  preparePage()
  text('Compliance-wijzer', { font: bold, size: 25, color: brandDark, gapAfter: 10 })
  text('Indicatief basisrapport', { font: bold, size: 13, color: brandBlue, gapAfter: 18 })
  if (report.organizationName) text(`Organisatie: ${report.organizationName}`, { font: bold, gapAfter: 3 })
  text(`Datum van de scan: ${scanDate}`, { color: muted, gapAfter: 3 })
  text(`Beoordelingsset: versie ${report.assessmentVersion}`, { color: muted, gapAfter: 18 })
  text('Dit rapport vat de uitkomst van de gratis Compliance-wijzer samen. Het bevat geen algemene compliance-score en is geen certificaat.', { color: muted })

  heading('Samenvatting')
  text(`${report.summary.order} onderdelen op orde`)
  text(`${report.summary.action} onderdelen vragen actie`)
  text(`${report.summary.check} onderdelen moeten worden gecontroleerd`)
  text(`${report.summary.notApplicable} onderdelen niet van toepassing`)

  heading('Resultaten per onderwerp')
  for (const result of report.results) {
    ensureSpace(75)
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

  heading('Officiële bronnen')
  for (const source of report.sources) {
    text(`${source.title} - ${source.publisher}`, { font: bold, gapAfter: 1 })
    text(source.url, { color: brandBlue, gapAfter: 1 })
    text(`Door WorkMatchr gecontroleerd op ${source.reviewedAt}`, { size: 8.5, color: muted, gapAfter: 6 })
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
