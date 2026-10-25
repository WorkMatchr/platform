import 'server-only'
import PDFDocument from 'pdfkit'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import QRCode from 'qrcode'
import { getPublicAppBaseUrl } from '@/lib/public-app-url'
import { LEARNING_CERTIFICATE_TEMPLATE_VERSION } from './learning-certificate-template'

export const LEARNING_CERTIFICATE_DISCLAIMER = 'Dit certificaat bevestigt de succesvolle afronding van de WorkMatchr-opleiding ‘RI&E in de praktijk’ en de bijbehorende eindtoets. Het certificaat is geen bewijs van certificering als arbokerndeskundige en verleent geen wettelijke beroepskwalificatie of bevoegdheid tot formele toetsing van een RI&E.'
const PAGE_WIDTH = 841.89
const LOGO_PATH = join(process.cwd(), 'public', 'branding', 'workmatchr-logo.png')

export type LearningCertificatePdfData = {
  templateVersion: string
  firstName: string
  lastName: string
  courseTitle: string
  certificateNumber: string
  issuedAt: Date
}

export function learningCertificateFilename(firstName: string, lastName: string) {
  const safe = `${firstName}-${lastName}`.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80)
  return `Certificaat-RIE-in-de-praktijk-${safe || 'deelnemer'}.pdf`
}

function cleanPdfText(value: string) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function buildLearningCertificatePdf(certificate: LearningCertificatePdfData) {
  if (certificate.templateVersion !== LEARNING_CERTIFICATE_TEMPLATE_VERSION) throw new Error('UNSUPPORTED_CERTIFICATE_TEMPLATE_VERSION')

  const fullName = cleanPdfText(`${certificate.firstName} ${certificate.lastName}`)
  const courseTitle = cleanPdfText(certificate.courseTitle)
  const certificateNumber = cleanPdfText(certificate.certificateNumber)
  const dateText = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'Europe/Amsterdam' }).format(certificate.issuedAt)
  const verifyUrl = new URL(`/certificaat/${encodeURIComponent(certificateNumber)}`, getPublicAppBaseUrl()).toString()
  const [logoBytes, qrBytes] = await Promise.all([
    readFile(LOGO_PATH),
    QRCode.toBuffer(verifyUrl, { type: 'png', errorCorrectionLevel: 'M', margin: 1, width: 220 }),
  ])

  const colors = { dark: '#052c4a', blue: '#0d6ea3', ink: '#213340', muted: '#596673', pale: '#e8f5fa' }
  const structure: PDFKit.PDFStructureElement[] = []
  const chunks: Buffer[] = []

  const pdfBytes = await new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      tagged: true,
      lang: 'nl',
      displayTitle: true,
      pdfVersion: '1.7',
      info: {
        Title: 'Certificaat RI&E in de praktijk',
        Author: 'WorkMatchr Learning',
        Subject: 'Certificaat van afronding',
        CreationDate: certificate.issuedAt,
        ModDate: certificate.issuedAt,
      },
    })

    document.on('data', (chunk: Buffer) => chunks.push(chunk))
    document.on('error', reject)
    document.on('end', () => resolve(Buffer.concat(chunks)))

    const artifact = (draw: () => void) => {
      document.markContent('Artifact', { type: 'Layout' })
      draw()
      document.endMarkedContent()
    }

    const taggedText = (tag: 'H1' | 'H2' | 'P', text: string, options: {
      x: number
      y: number
      width?: number
      size: number
      font: 'Helvetica' | 'Helvetica-Bold'
      color: string
      lineGap?: number
      align?: 'left' | 'center' | 'right'
    }) => {
      const content = document.markStructureContent(tag, { lang: 'nl' })
      document.font(options.font).fontSize(options.size).fillColor(options.color)
      document.text(text, options.x, options.y, {
        width: options.width,
        lineGap: options.lineGap,
        align: options.align,
        continued: false,
      })
      document.endMarkedContent()
      structure.push(document.struct(tag, {}, content))
    }

    const fullNameSize = Math.max(18, Math.min(30, 500 / Math.max(1, fullName.length) * 1.55))
    const nameWidth = 550
    const bodyCopy = `de WorkMatchr-opleiding ‘${courseTitle}’ succesvol heeft afgerond en de bijbehorende eindtoets met goed gevolg heeft behaald.`

    artifact(() => {
      document.rect(0, 0, PAGE_WIDTH, 12).fill(colors.blue)
      document.image(logoBytes, 56, 49, { width: 166, height: 46.8 })
      document.moveTo(58, 218).lineTo(PAGE_WIDTH - 58, 218).lineWidth(2).stroke(colors.pale)
    })

    taggedText('P', 'LEARNING', { x: 232, y: 61, size: 12, font: 'Helvetica-Bold', color: colors.blue })
    taggedText('H1', 'CERTIFICAAT', { x: 56, y: 142, size: 34, font: 'Helvetica-Bold', color: colors.dark })
    taggedText('H2', 'RI&E IN DE PRAKTIJK', { x: 58, y: 181, size: 16, font: 'Helvetica-Bold', color: colors.blue })
    taggedText('P', 'Dit certificaat bevestigt dat', { x: 58, y: 230, size: 11, font: 'Helvetica', color: colors.muted })
    taggedText('H2', fullName, { x: 58, y: 248, width: nameWidth, size: fullNameSize, font: 'Helvetica-Bold', color: colors.dark })
    taggedText('P', bodyCopy, { x: 58, y: 290, width: 650, size: 12, font: 'Helvetica', color: colors.ink, lineGap: 5 })

    const rows = [
      ['Behaald op', dateText],
      ['Opleiding', courseTitle],
      ['Omvang', '10 hoofdstukken + eindtoets'],
      ['Uitgegeven door', 'WorkMatchr Learning'],
    ] as const
    let rowY = 358
    for (const [label, value] of rows) {
      taggedText('P', `${label}: ${value}`, { x: 58, y: rowY, width: 600, size: 10, font: 'Helvetica', color: colors.ink })
      rowY += 20
    }

    taggedText('P', `Certificaatnummer: ${certificateNumber}`, { x: 58, y: 446, width: 620, size: 9, font: 'Helvetica-Bold', color: colors.dark })

    const qrX = PAGE_WIDTH - 145
    const qrY = 372
    const qrSize = 82
    const alt = `QR-code voor de verificatiepagina van certificaatnummer ${certificateNumber}. De verificatie-informatie staat ook in tekst op dit certificaat.`
    const qrContent = document.markStructureContent('Figure', { alt })
    document.image(qrBytes, qrX, qrY, { width: qrSize, height: qrSize })
    document.endMarkedContent()
    structure.push(document.struct('Figure', { alt, title: 'Certificaatverificatie' }, qrContent))
    taggedText('P', 'Scan voor online verificatie. Certificaatnummer staat hierboven.', {
      x: PAGE_WIDTH - 198, y: 458, width: 145, size: 8, font: 'Helvetica', color: colors.muted, align: 'center',
    })

    taggedText('P', LEARNING_CERTIFICATE_DISCLAIMER, {
      x: 58, y: 510, width: PAGE_WIDTH - 116, size: 9, font: 'Helvetica', color: colors.muted, lineGap: 3,
    })

    document.addStructure(document.struct('Document', {}, structure))
    document.end()
  })

  return new Uint8Array(pdfBytes)
}
