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

export async function buildFinancialInvoicePdf(invoice: FinancialInvoicePdfSnapshot): Promise<Uint8Array> {
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
