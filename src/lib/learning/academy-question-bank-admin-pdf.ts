import 'server-only'
import PDFDocument from 'pdfkit'
import { academyBanks, publicationLabel, type AdminQuestion } from './academy-question-bank-admin-model'

// The existing built-in certificate fonts use WinAnsi. Preserve mathematical
// meaning visibly instead of silently dropping unsupported glyphs. Canonical
// question text and keys are never changed by this export presentation step.
export function reviewPdfText(value: string) {
  const text = value.replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/→/g, ' -> ').replace(/←/g, ' <- ').replace(/×/g, ' x ').replace(/−/g, '-').replace(/[\u202F\u2009]/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
  if (/[^\n\r\t\u0020-\u00ff€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/u.test(text)) throw new Error('UNSUPPORTED_REVIEW_PDF_GLYPH')
  return text
}

/** In-memory review export. No student records, storage or public URLs. */
export async function buildAcademyReviewPdf(rows: AdminQuestion[], exportedAt = new Date()) {
  if (!rows.length || rows.length > 5000) throw new Error('REVIEW_EXPORT_SIZE')
  return new Promise<Uint8Array>((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({ size: 'A4', margins: { top: 48, bottom: 48, left: 48, right: 48 }, tagged: true, lang: 'nl', displayTitle: true, pdfVersion: '1.7', info: { Title: `Academy vraagbankreview ${rows[0].courseCode}`, Author: 'WorkMatchr Academy', CreationDate: exportedAt } })
    doc.on('data', (chunk: Buffer) => chunks.push(chunk)); doc.on('error', reject); doc.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))))
    const root = doc.struct('Document'); doc.addStructure(root)
    const prepare = (value: string, heading: boolean) => {
      doc.font(heading ? 'Helvetica-Bold' : 'Helvetica').fontSize(heading ? 14 : 10).fillColor('#052c4a')
      return reviewPdfText(value)
    }
    const height = (value: string, heading = false) => doc.heightOfString(prepare(value, heading), { width: doc.page.width - 96, paragraphGap: 6, lineGap: 3 }) + 6
    const text = (value: string, heading = false) => {
      const clean = prepare(value, heading)
      const needed = height(clean, heading)
      if (needed <= doc.page.height - 96 && doc.y + needed > doc.page.height - 48) doc.addPage()
      doc.text(clean, { paragraphGap: 6, lineGap: 3, structParent: root, structType: heading ? 'H2' : 'P' })
    }
    text('Vertrouwelijk — uitsluitend voor inhoudelijke review', true)
    text(`${rows[0].courseCode} — ${rows[0].courseTitle}\nVraagbank: ${academyBanks[rows[0].bank]}\nExportdatum: ${exportedAt.toISOString()}\nBevat antwoordsleutels. Deel uitsluitend met bevoegde reviewers.`)
    if (rows[0].bank === 'ANNUAL') text('Selectiebank voor de jaarcheck. Een individuele jaarcheck bevat een opgeslagen selectie uit deze bank.')
    for (const row of rows) {
      const title = `${row.code} — vraagversie ${row.questionVersion} — H${row.chapter}`
      const context = `Versie: ${row.referenceVersion}\nStatus vraag: ${publicationLabel(row.status)}; versie/bank: ${publicationLabel(row.referenceStatus)}\nReview: ${row.review.join('; ') || 'Geen aanvullende reviewmetadata beschikbaar'}\nType: ${row.type}; cognitief niveau: ${row.cognitiveLevel ?? 'Niet vastgelegd'}`
      const options = row.options.map((option) => `${option.value}. ${option.text}${option.isCorrect ? ' [CORRECT]' : ''}`)
      const feedback = [`Opgeslagen antwoordset / volgorde: ${JSON.stringify(row.correctAnswer)}\nToelichting: ${row.explanation}`, ...(row.correctFeedback ? [`Feedback bij juist antwoord: ${row.correctFeedback}`] : []), ...(row.incorrectFeedback ? [`Feedback bij onjuist antwoord: ${row.incorrectFeedback}`] : [])]
      const needed = height(title, true) + [context, row.text, ...options, ...feedback].reduce((sum, part) => sum + height(part), 0) + 12
      if (needed <= doc.page.height - 96 && doc.y + needed > doc.page.height - 48) doc.addPage()
      doc.moveDown(0.5)
      text(title, true)
      text(context)
      text(row.text)
      for (const option of options) text(option)
      for (const part of feedback) text(part)
    }
    root.end(); doc.end()
  })
}
