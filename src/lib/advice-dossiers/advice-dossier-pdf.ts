import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib'
import type { AdviceDossierStatus } from '@/generated/prisma/client'
import {
  adviceDossierStatusLabels,
  type AdviceDossierSnapshot,
} from './advice-dossier-contract'

type PdfInput = Readonly<{
  dossierCode: string
  createdAt: Date
  status: AdviceDossierStatus
  versionNumber: number
  snapshot: AdviceDossierSnapshot
}>

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const MARGIN_X = 54
const TOP = 58
const BOTTOM = 54
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const BODY_SIZE = 10.5
const LINE_HEIGHT = 15

function normalizePdfText(value: string): string {
  return value
    .replaceAll('\u2011', '-')
    .replaceAll('\u202f', ' ')
    .replaceAll('\u00a0', ' ')
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  return normalizePdfText(text)
    .split(/\r?\n/)
    .flatMap((paragraph) => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean)
      if (words.length === 0) return ['']
      const lines: string[] = []
      let current = ''
      for (const word of words) {
        const candidate = current ? `${current} ${word}` : word
        if (
          current &&
          font.widthOfTextAtSize(candidate, size) > maxWidth
        ) {
          lines.push(current)
          current = word
        } else {
          current = candidate
        }
      }
      if (current) lines.push(current)
      return lines
    })
}

export async function buildAdviceDossierPdf(
  input: PdfInput,
): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  document.setTitle(
    `WorkMatchr Adviesdossier ${input.dossierCode}`,
  )
  document.setAuthor('WorkMatchr')
  document.setSubject(input.snapshot.subject)
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const brandDark = rgb(0.02, 0.17, 0.29)
  const brandBlue = rgb(0.05, 0.43, 0.64)
  const textColor = rgb(0.13, 0.2, 0.27)
  const muted = rgb(0.35, 0.4, 0.46)
  let page: PDFPage = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = 0

  function preparePage(): void {
    y = PAGE_HEIGHT - TOP
    page.drawText('WorkMatchr', {
      x: MARGIN_X,
      y,
      size: 12,
      font: bold,
      color: brandDark,
    })
    page.drawLine({
      start: { x: MARGIN_X, y: y - 10 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: y - 10 },
      color: brandBlue,
      thickness: 1.2,
    })
    y -= 34
  }

  function newPage(): void {
    page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    preparePage()
  }

  function ensureSpace(height: number): void {
    if (y - height < BOTTOM) newPage()
  }

  function text(
    value: string,
    options: {
      font?: PDFFont
      size?: number
      color?: ReturnType<typeof rgb>
      gapAfter?: number
      indent?: number
    } = {},
  ): void {
    const usedFont = options.font ?? regular
    const size = options.size ?? BODY_SIZE
    const indent = options.indent ?? 0
    const lines = wrapText(
      value,
      usedFont,
      size,
      CONTENT_WIDTH - indent,
    )
    for (const line of lines) {
      ensureSpace(LINE_HEIGHT)
      page.drawText(line, {
        x: MARGIN_X + indent,
        y,
        size,
        font: usedFont,
        color: options.color ?? textColor,
      })
      y -= LINE_HEIGHT
    }
    y -= options.gapAfter ?? 4
  }

  function heading(value: string): void {
    ensureSpace(34)
    y -= 7
    text(value, {
      font: bold,
      size: 14,
      color: brandDark,
      gapAfter: 6,
    })
  }

  function bullets(values: readonly string[]): void {
    for (const value of values) {
      text(`- ${value}`, { indent: 8, gapAfter: 2 })
    }
    y -= 2
  }

  function professionalRequirement(
    priority: 'Primair' | 'Aanvullend' | 'Mogelijk',
    requirement: Readonly<{
      label: string
      reason: string
      expertise: readonly string[]
    }>,
  ): void {
    text(priority, {
      font: bold,
      size: 9,
      color: brandBlue,
      gapAfter: 1,
    })
    text(requirement.label, { font: bold, gapAfter: 2 })
    text(requirement.reason)
    if (requirement.expertise.length > 0) {
      text(
        `Relevante expertise: ${requirement.expertise.join(', ')}`,
        { color: muted },
      )
    }
  }

  preparePage()
  text('WorkMatchr Adviesdossier', {
    font: bold,
    size: 23,
    color: brandDark,
    gapAfter: 12,
  })
  text(`Dossiercode: ${input.dossierCode}`, {
    font: bold,
    color: brandBlue,
    gapAfter: 2,
  })
  text(
    `Aangemaakt: ${new Intl.DateTimeFormat('nl-NL', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(input.createdAt)}`,
    { color: muted, gapAfter: 2 },
  )
  text(`Adviesversie: ${input.versionNumber}`, {
    color: muted,
    gapAfter: 2,
  })
  text(`Status: ${adviceDossierStatusLabels[input.status]}`, {
    color: muted,
    gapAfter: 14,
  })

  heading('Oorspronkelijke hulpvraag')
  text(input.snapshot.originalHelpRequest)
  heading('Dit begrijpen wij van uw situatie')
  text(input.snapshot.situationSummary)
  if (input.snapshot.uncertainties.length > 0) {
    text('Nog niet volledig duidelijk', { font: bold })
    bullets(input.snapshot.uncertainties)
  }
  heading('Ons advies')
  text(input.snapshot.adviceTitle, { font: bold })
  text(input.snapshot.adviceBody)
  heading('Waarom adviseren wij dit?')
  bullets(input.snapshot.adviceReasons)
  heading('Wat kunt u zelf al doen?')
  bullets(input.snapshot.selfActions)
  heading('Aanbevolen deskundigheid')
  if (input.snapshot.primaryProfessionalRequirement) {
    professionalRequirement(
      'Primair',
      input.snapshot.primaryProfessionalRequirement,
    )
  } else {
    text(
      'Op basis van de beschikbare informatie is nog geen specifieke deskundigheid aan te bevelen.',
    )
  }
  if (input.snapshot.additionalProfessionalRequirements.length > 0) {
    for (const requirement of input.snapshot
      .additionalProfessionalRequirements) {
      professionalRequirement('Aanvullend', requirement)
    }
  }
  if (input.snapshot.possibleProfessionalRequirements.length > 0) {
    for (const requirement of input.snapshot
      .possibleProfessionalRequirements) {
      professionalRequirement('Mogelijk', requirement)
    }
  }
  heading('Relevante kennis en bronnen')
  for (const reference of input.snapshot.knowledgeReferences) {
    text(reference.title, { font: bold, gapAfter: 1 })
    text(reference.summary, { gapAfter: 2 })
    text(reference.href, { color: muted })
  }
  for (const source of input.snapshot.sourceReferences) {
    text(`${source.title} (${source.publisher})`, {
      font: bold,
      gapAfter: 1,
    })
    text(source.url, { color: muted })
  }
  heading('Mogelijke vervolgstappen')
  text(
    'Gebruik dit advies om uw situatie verder te beoordelen. Wanneer u professionele ondersteuning overweegt, kan de genoemde deskundigheid helpen om de vraag gericht te bespreken.',
  )
  ensureSpace(70)
  y -= 10
  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_WIDTH - MARGIN_X, y },
    color: rgb(0.8, 0.82, 0.84),
    thickness: 0.7,
  })
  y -= 18
  text(input.snapshot.disclaimer, {
    size: 8.5,
    color: muted,
    gapAfter: 0,
  })

  const pages = document.getPages()
  pages.forEach((currentPage, index) => {
    const label = `Pagina ${index + 1} van ${pages.length}`
    currentPage.drawText(label, {
      x:
        PAGE_WIDTH -
        MARGIN_X -
        regular.widthOfTextAtSize(label, 8),
      y: 28,
      size: 8,
      font: regular,
      color: muted,
    })
  })

  return document.save()
}
