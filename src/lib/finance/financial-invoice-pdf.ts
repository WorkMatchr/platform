import 'server-only'

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { FinancialInvoice, FinancialInvoiceLine, FinancialInvoiceVatSummary } from '@/generated/prisma/client'
import { formatEuro } from './financial-contract'

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 54
const TOP = 58
const BOTTOM = 54
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const BODY_SIZE = 10
const LINE_HEIGHT = 14
const LOGO_WIDTH = 210
const LOGO_HEIGHT = LOGO_WIDTH / (1321 / 372)
const WORKMATCHR_LOGO_PATH = join(process.cwd(), 'public', 'branding', 'workmatchr-logo.png')

export type FinancialInvoicePdfSnapshot = Pick<FinancialInvoice,
  | 'documentType'
  | 'invoiceNumber'
  | 'issuedAt'
  | 'snapshotVersion'
  | 'supplyDate'
  | 'advancePaymentDate'
  | 'servicePeriodStart'
  | 'servicePeriodEnd'
  | 'sellerLegalName'
  | 'sellerTradeName'
  | 'sellerAddressLine'
  | 'sellerPostalCode'
  | 'sellerCity'
  | 'sellerCountryCode'
  | 'sellerKvKNumber'
  | 'sellerVatId'
  | 'customerOrganizationName'
  | 'customerAddressLine'
  | 'customerPostalCode'
  | 'customerCity'
  | 'customerCountryCode'
  | 'customerKvKNumber'
  | 'customerVatId'
  | 'packageLabel'
  | 'credits'
  | 'amountExclVatCents'
  | 'vatRateBps'
  | 'vatAmountCents'
  | 'amountInclVatCents'
> & { lines?: FinancialInvoiceLine[]; vatSummaries?: FinancialInvoiceVatSummary[] }

function normalize(value: string) {
  return value.replaceAll('\u0000', '').replaceAll('\u00a0', ' ').replaceAll('\u2011', '-').replaceAll('\u2013', '-')
}

function wrapText(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = normalize(value).split(/\s+/).filter(Boolean)
  if (!words.length) return ['']
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

function formatInvoiceDate(value: Date) {
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'Europe/Amsterdam' }).format(value)
}

export function financialInvoicePdfFilename(invoiceNumber: string) {
  return `WorkMatchr-factuur-${invoiceNumber}.pdf`
}

async function buildLegacyFinancialInvoicePdf(invoice: FinancialInvoicePdfSnapshot): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  document.setTitle(`WorkMatchr factuur ${invoice.invoiceNumber}`)
  document.setAuthor('WorkMatchr')
  document.setSubject(invoice.documentType === 'CREDIT_NOTE' ? 'Creditnota' : 'Factuur')
  document.setCreationDate(invoice.issuedAt)
  document.setModificationDate(invoice.issuedAt)

  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const logo = await document.embedPng(await readFile(WORKMATCHR_LOGO_PATH))
  const brandDark = rgb(0.02, 0.17, 0.29)
  const brandBlue = rgb(0.05, 0.43, 0.64)
  const textColor = rgb(0.13, 0.2, 0.27)
  const muted = rgb(0.35, 0.4, 0.46)
  let page: PDFPage = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - TOP

  const ensureSpace = (height: number) => {
    if (y - height >= BOTTOM) return
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y = PAGE_HEIGHT - TOP
    page.drawText('WorkMatchr', { x: MARGIN_X, y, size: 12, font: bold, color: brandDark })
    y -= 20
    page.drawLine({ start: { x: MARGIN_X, y }, end: { x: PAGE_WIDTH - MARGIN_X, y }, color: brandBlue, thickness: 1.1 })
    y -= 22
  }
  const text = (value: string, options: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gapAfter?: number } = {}) => {
    const font = options.font ?? regular
    const size = options.size ?? BODY_SIZE
    for (const paragraph of normalize(value).split('\n')) {
      for (const line of wrapText(paragraph, font, size, CONTENT_WIDTH)) {
        ensureSpace(LINE_HEIGHT)
        page.drawText(line, { x: MARGIN_X, y, size, font, color: options.color ?? textColor })
        y -= LINE_HEIGHT
      }
    }
    y -= options.gapAfter ?? 4
  }
  const heading = (value: string) => {
    ensureSpace(32)
    y -= 5
    text(value, { font: bold, size: 14, color: brandDark, gapAfter: 6 })
  }

  page.drawImage(logo, { x: MARGIN_X, y: y - LOGO_HEIGHT, width: LOGO_WIDTH, height: LOGO_HEIGHT })
  y -= LOGO_HEIGHT + 18
  page.drawLine({ start: { x: MARGIN_X, y }, end: { x: PAGE_WIDTH - MARGIN_X, y }, color: brandBlue, thickness: 1.2 })
  y -= 28
  text(invoice.documentType === 'CREDIT_NOTE' ? 'Creditnota' : 'Factuur', { font: bold, size: 24, color: brandDark, gapAfter: 8 })
  text(`Factuurnummer: ${invoice.invoiceNumber}`, { font: bold, color: brandBlue, gapAfter: 2 })
  text(`Factuurdatum: ${formatInvoiceDate(invoice.issuedAt)}`, { color: muted, gapAfter: 16 })
  if (invoice.snapshotVersion === 2) {
    if (!invoice.supplyDate || !invoice.lines?.length || !invoice.vatSummaries?.length) throw new Error('INVOICE_V2_PDF_SNAPSHOT_INCOMPLETE')
    text(`Lever-/prestatiedatum: ${formatInvoiceDate(invoice.supplyDate)}`, { color: muted, gapAfter: 2 })
    if (invoice.advancePaymentDate) text(`Vooruitbetalingsdatum: ${formatInvoiceDate(invoice.advancePaymentDate)}`, { color: muted, gapAfter: 2 })
    if (invoice.servicePeriodStart && invoice.servicePeriodEnd) {
      text(`Dienstperiode: ${formatInvoiceDate(invoice.servicePeriodStart)} t/m ${formatInvoiceDate(invoice.servicePeriodEnd)}`, { color: muted, gapAfter: 12 })
    }
  }

  heading('Leverancier')
  text(`${invoice.sellerTradeName}\n${invoice.sellerLegalName}\n${invoice.sellerAddressLine}\n${invoice.sellerPostalCode} ${invoice.sellerCity}\n${invoice.sellerCountryCode}\nKvK ${invoice.sellerKvKNumber}\nBtw ${invoice.sellerVatId}`, { gapAfter: 10 })
  heading('Klant')
  text(`${invoice.customerOrganizationName}\n${invoice.customerAddressLine}\n${invoice.customerPostalCode} ${invoice.customerCity}\n${invoice.customerCountryCode}${invoice.customerKvKNumber ? `\nKvK ${invoice.customerKvKNumber}` : ''}${invoice.customerVatId ? `\nBtw ${invoice.customerVatId}` : ''}`, { gapAfter: 10 })
  heading(invoice.snapshotVersion === 2 ? 'Factuurregels' : 'Omschrijving')
  if (invoice.snapshotVersion === 2 && invoice.lines) {
    for (const line of invoice.lines) {
      ensureSpace(104)
      text(line.description, { font: bold, color: brandDark, gapAfter: 2 })
      text(`${line.quantity} ${line.unit} x ${formatEuro(line.unitPriceExclVatCents)} excl. btw`, { gapAfter: 2 })
      if (line.servicePeriodStart && line.servicePeriodEnd) text(`Periode: ${formatInvoiceDate(line.servicePeriodStart)} t/m ${formatInvoiceDate(line.servicePeriodEnd)}`, { color: muted, gapAfter: 2 })
      if (line.discountAmountCents > 0) text(`Korting: -${formatEuro(line.discountAmountCents)}`, { color: muted, gapAfter: 2 })
      text(`Netto excl. btw: ${formatEuro(line.netAmountExclVatCents)} | Btw ${line.vatRateBps / 100}%: ${formatEuro(line.vatAmountCents)} | Incl. btw: ${formatEuro(line.amountInclVatCents)}`, { gapAfter: 10 })
      page.drawLine({ start: { x: MARGIN_X, y }, end: { x: PAGE_WIDTH - MARGIN_X, y }, color: rgb(0.82, 0.88, 0.92), thickness: 0.7 })
      y -= 10
    }
  } else {
    text(invoice.packageLabel, { font: bold, gapAfter: 2 })
    if (invoice.credits !== 0) text(`${invoice.credits} credits`, { color: muted, gapAfter: 10 })
  }
  heading('Bedragen')
  text(`Bedrag excl. btw: ${formatEuro(invoice.amountExclVatCents)}`, { gapAfter: 2 })
  if (invoice.snapshotVersion === 2 && invoice.vatSummaries) {
    for (const summary of invoice.vatSummaries) text(`Btw ${summary.vatRateBps / 100}% over ${formatEuro(summary.taxableAmountExclVatCents)}: ${formatEuro(summary.vatAmountCents)}`, { gapAfter: 2 })
    text(`Totaal btw: ${formatEuro(invoice.vatAmountCents)}`, { gapAfter: 2 })
  } else text(`Btw (${invoice.vatRateBps / 100}%): ${formatEuro(invoice.vatAmountCents)}`, { gapAfter: 2 })
  text(`Totaal incl. btw: ${formatEuro(invoice.amountInclVatCents)}`, { font: bold, size: 12, color: brandDark, gapAfter: 0 })

  const pages = document.getPages()
  pages.forEach((currentPage, index) => {
    const label = `Pagina ${index + 1} van ${pages.length}`
    currentPage.drawText(label, { x: PAGE_WIDTH - MARGIN_X - regular.widthOfTextAtSize(label, 8), y: 28, size: 8, font: regular, color: muted })
  })
  return document.save()
}

async function buildSnapshotV2FinancialInvoicePdf(invoice: FinancialInvoicePdfSnapshot): Promise<Uint8Array> {
  if (!invoice.supplyDate || !invoice.lines?.length || !invoice.vatSummaries?.length) {
    throw new Error('INVOICE_V2_PDF_SNAPSHOT_INCOMPLETE')
  }

  const document = await PDFDocument.create()
  const documentLabel = invoice.documentType === 'CREDIT_NOTE' ? 'Creditnota' : 'Factuur'
  document.setTitle(`WorkMatchr ${documentLabel.toLowerCase()} ${invoice.invoiceNumber}`)
  document.setAuthor('WorkMatchr')
  document.setSubject(documentLabel)
  document.setCreationDate(invoice.issuedAt)
  document.setModificationDate(invoice.issuedAt)

  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const logo = await document.embedPng(await readFile(WORKMATCHR_LOGO_PATH))
  const navy = rgb(0.025, 0.18, 0.29)
  const blue = rgb(0.05, 0.43, 0.64)
  const paleBlue = rgb(0.93, 0.97, 0.985)
  const lineBlue = rgb(0.78, 0.88, 0.92)
  const ink = rgb(0.12, 0.22, 0.29)
  const muted = rgb(0.34, 0.43, 0.49)
  const white = rgb(1, 1, 1)
  const footerHeight = 42
  const contentBottom = BOTTOM + footerHeight
  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - TOP

  const drawContinuationHeader = () => {
    page.drawText('WorkMatchr', { x: MARGIN_X, y, size: 11, font: bold, color: navy })
    const reference = `${documentLabel} ${normalize(invoice.invoiceNumber)}`
    page.drawText(reference, { x: PAGE_WIDTH - MARGIN_X - regular.widthOfTextAtSize(reference, 9), y, size: 9, font: regular, color: muted })
    y -= 14
    page.drawLine({ start: { x: MARGIN_X, y }, end: { x: PAGE_WIDTH - MARGIN_X, y }, color: lineBlue, thickness: 0.8 })
    y -= 22
  }

  const ensureSpace = (height: number) => {
    if (y - height >= contentBottom) return
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    y = PAGE_HEIGHT - TOP
    drawContinuationHeader()
  }

  const drawWrapped = (value: string, x: number, topY: number, maxWidth: number, options: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; lineHeight?: number } = {}) => {
    const font = options.font ?? regular
    const size = options.size ?? 9
    const lineHeight = options.lineHeight ?? size + 3
    const lines = normalize(value).split('\n').flatMap((paragraph) => wrapText(paragraph, font, size, maxWidth))
    lines.forEach((line, index) => page.drawText(line, { x, y: topY - index * lineHeight, size, font, color: options.color ?? ink }))
    return lines.length * lineHeight
  }

  const drawSectionTitle = (title: string) => {
    ensureSpace(30)
    page.drawText(title, { x: MARGIN_X, y, size: 12, font: bold, color: navy })
    y -= 8
    page.drawLine({ start: { x: MARGIN_X, y }, end: { x: PAGE_WIDTH - MARGIN_X, y }, color: lineBlue, thickness: 0.8 })
    y -= 18
  }

  page.drawImage(logo, { x: MARGIN_X, y: y - 48, width: 172, height: 172 / (1321 / 372) })
  const title = documentLabel.toUpperCase()
  page.drawText(title, { x: PAGE_WIDTH - MARGIN_X - bold.widthOfTextAtSize(title, 24), y: y - 3, size: 24, font: bold, color: navy })
  page.drawText(normalize(invoice.invoiceNumber), {
    x: PAGE_WIDTH - MARGIN_X - regular.widthOfTextAtSize(normalize(invoice.invoiceNumber), 10),
    y: y - 24,
    size: 10,
    font: regular,
    color: blue,
  })
  y -= 67
  page.drawLine({ start: { x: MARGIN_X, y }, end: { x: PAGE_WIDTH - MARGIN_X, y }, color: blue, thickness: 2 })
  y -= 20

  const metaHeight = invoice.advancePaymentDate || (invoice.servicePeriodStart && invoice.servicePeriodEnd) ? 76 : 54
  page.drawRectangle({ x: MARGIN_X, y: y - metaHeight, width: CONTENT_WIDTH, height: metaHeight, color: paleBlue, borderColor: lineBlue, borderWidth: 0.8 })
  const metaColumns = [MARGIN_X + 16, MARGIN_X + 176, MARGIN_X + 336]
  const meta = [
    ['Factuurdatum', formatInvoiceDate(invoice.issuedAt)],
    ['Lever-/prestatiedatum', formatInvoiceDate(invoice.supplyDate)],
    ['Status', invoice.documentType === 'CREDIT_NOTE' ? 'Verwerkt' : 'Betaald'],
  ]
  meta.forEach(([label, value], index) => {
    page.drawText(label, { x: metaColumns[index], y: y - 18, size: 7.5, font: regular, color: muted })
    drawWrapped(value, metaColumns[index], y - 34, 135, { font: bold, size: 9, color: navy, lineHeight: 10 })
  })
  if (invoice.advancePaymentDate) {
    page.drawText(`Vooruitbetalingsdatum: ${formatInvoiceDate(invoice.advancePaymentDate)}`, { x: MARGIN_X + 16, y: y - 61, size: 8, font: regular, color: muted })
  }
  if (invoice.servicePeriodStart && invoice.servicePeriodEnd) {
    const period = `Dienstperiode: ${formatInvoiceDate(invoice.servicePeriodStart)} t/m ${formatInvoiceDate(invoice.servicePeriodEnd)}`
    page.drawText(period, { x: MARGIN_X + 176, y: y - 61, size: 8, font: regular, color: muted })
  }
  y -= metaHeight + 24

  drawSectionTitle('Factuuradres en leverancier')
  const gap = 14
  const cardWidth = (CONTENT_WIDTH - gap) / 2
  const supplier = `${invoice.sellerTradeName}\n${invoice.sellerLegalName}\n${invoice.sellerAddressLine}\n${invoice.sellerPostalCode} ${invoice.sellerCity}\n${invoice.sellerCountryCode}\nKvK ${invoice.sellerKvKNumber}\nBtw-id ${invoice.sellerVatId}`
  const customer = `${invoice.customerOrganizationName}\n${invoice.customerAddressLine}\n${invoice.customerPostalCode} ${invoice.customerCity}\n${invoice.customerCountryCode}${invoice.customerKvKNumber ? `\nKvK ${invoice.customerKvKNumber}` : ''}${invoice.customerVatId ? `\nBtw-id ${invoice.customerVatId}` : ''}`
  const supplierHeight = normalize(supplier).split('\n').flatMap((line) => wrapText(line, regular, 8.5, cardWidth - 28)).length * 11
  const customerHeight = normalize(customer).split('\n').flatMap((line) => wrapText(line, regular, 8.5, cardWidth - 28)).length * 11
  const cardHeight = Math.max(116, Math.max(supplierHeight, customerHeight) + 38)
  ensureSpace(cardHeight + 10)
  page.drawRectangle({ x: MARGIN_X, y: y - cardHeight, width: cardWidth, height: cardHeight, color: white, borderColor: lineBlue, borderWidth: 0.8 })
  page.drawRectangle({ x: MARGIN_X + cardWidth + gap, y: y - cardHeight, width: cardWidth, height: cardHeight, color: white, borderColor: lineBlue, borderWidth: 0.8 })
  page.drawText('LEVERANCIER', { x: MARGIN_X + 14, y: y - 20, size: 7.5, font: bold, color: blue })
  page.drawText('AFNEMER', { x: MARGIN_X + cardWidth + gap + 14, y: y - 20, size: 7.5, font: bold, color: blue })
  drawWrapped(supplier, MARGIN_X + 14, y - 39, cardWidth - 28, { size: 8.5, lineHeight: 11 })
  drawWrapped(customer, MARGIN_X + cardWidth + gap + 14, y - 39, cardWidth - 28, { size: 8.5, lineHeight: 11 })
  y -= cardHeight + 26

  drawSectionTitle('Factuurregels')
  for (const line of invoice.lines) {
    const descriptionLines = wrapText(line.description, bold, 9.5, CONTENT_WIDTH - 24)
    const rowHeight = Math.max(74, 24 + descriptionLines.length * 12 + (line.servicePeriodStart && line.servicePeriodEnd ? 15 : 0))
    ensureSpace(rowHeight + 12)
    page.drawRectangle({ x: MARGIN_X, y: y - rowHeight, width: CONTENT_WIDTH, height: rowHeight, color: white, borderColor: lineBlue, borderWidth: 0.8 })
    drawWrapped(line.description, MARGIN_X + 12, y - 18, CONTENT_WIDTH - 24, { font: bold, size: 9.5, color: navy, lineHeight: 12 })
    let detailY = y - 23 - descriptionLines.length * 12
    if (line.servicePeriodStart && line.servicePeriodEnd) {
      page.drawText(`Dienstperiode: ${formatInvoiceDate(line.servicePeriodStart)} t/m ${formatInvoiceDate(line.servicePeriodEnd)}`, { x: MARGIN_X + 12, y: detailY, size: 7.5, font: regular, color: muted })
      detailY -= 16
    }
    const columns = [
      { label: 'Aantal', value: String(line.quantity), x: MARGIN_X + 12, width: 42 },
      { label: 'Eenheid', value: line.unit, x: MARGIN_X + 56, width: 48 },
      { label: 'Prijs excl.', value: formatEuro(line.unitPriceExclVatCents), x: MARGIN_X + 108, width: 68 },
      { label: 'Korting', value: line.discountAmountCents ? `-${formatEuro(line.discountAmountCents)}` : formatEuro(0), x: MARGIN_X + 180, width: 62 },
      { label: 'Netto', value: formatEuro(line.netAmountExclVatCents), x: MARGIN_X + 246, width: 64 },
      { label: `Btw ${line.vatRateBps / 100}%`, value: formatEuro(line.vatAmountCents), x: MARGIN_X + 314, width: 66 },
      { label: 'Incl. btw', value: formatEuro(line.amountInclVatCents), x: MARGIN_X + 384, width: 90 },
    ]
    columns.forEach((column) => {
      page.drawText(column.label, { x: column.x, y: detailY, size: 6.8, font: regular, color: muted })
      page.drawText(normalize(column.value), { x: column.x, y: detailY - 13, size: 7.8, font: bold, color: ink, maxWidth: column.width })
    })
    y -= rowHeight + 12
  }

  const summaryHeight = 52 + invoice.vatSummaries.length * 17
  ensureSpace(summaryHeight + 34)
  const summaryWidth = 252
  const summaryX = PAGE_WIDTH - MARGIN_X - summaryWidth
  page.drawRectangle({ x: summaryX, y: y - summaryHeight, width: summaryWidth, height: summaryHeight, color: paleBlue, borderColor: lineBlue, borderWidth: 0.8 })
  let summaryY = y - 18
  const summaryRow = (label: string, value: string, options: { bold?: boolean; size?: number; color?: ReturnType<typeof rgb> } = {}) => {
    const font = options.bold ? bold : regular
    const size = options.size ?? 8.5
    page.drawText(label, { x: summaryX + 14, y: summaryY, size, font, color: options.color ?? ink })
    page.drawText(normalize(value), { x: summaryX + summaryWidth - 14 - font.widthOfTextAtSize(normalize(value), size), y: summaryY, size, font, color: options.color ?? ink })
    summaryY -= 17
  }
  summaryRow('Totaal excl. btw', formatEuro(invoice.amountExclVatCents))
  invoice.vatSummaries.forEach((summary) => summaryRow(`Btw ${summary.vatRateBps / 100}%`, formatEuro(summary.vatAmountCents)))
  page.drawLine({ start: { x: summaryX + 14, y: summaryY + 10 }, end: { x: summaryX + summaryWidth - 14, y: summaryY + 10 }, color: blue, thickness: 1 })
  summaryY -= 4
  summaryRow('Totaal incl. btw', formatEuro(invoice.amountInclVatCents), { bold: true, size: 12, color: navy })
  y -= summaryHeight + 24

  const pages = document.getPages()
  pages.forEach((currentPage, index) => {
    currentPage.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: footerHeight, color: navy })
    currentPage.drawText('WorkMatchr', { x: MARGIN_X, y: 23, size: 8.5, font: bold, color: white })
    currentPage.drawText('www.workmatchr.nl', { x: MARGIN_X, y: 11, size: 7.5, font: regular, color: rgb(0.73, 0.86, 0.92) })
    const pageLabel = `Pagina ${index + 1} van ${pages.length}`
    currentPage.drawText(pageLabel, { x: PAGE_WIDTH - MARGIN_X - regular.widthOfTextAtSize(pageLabel, 7.5), y: 17, size: 7.5, font: regular, color: rgb(0.73, 0.86, 0.92) })
  })
  return document.save()
}

export async function buildFinancialInvoicePdf(invoice: FinancialInvoicePdfSnapshot): Promise<Uint8Array> {
  return invoice.snapshotVersion === 2
    ? buildSnapshotV2FinancialInvoicePdf(invoice)
    : buildLegacyFinancialInvoicePdf(invoice)
}
