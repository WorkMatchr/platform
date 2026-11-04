import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildAcademyReviewPdf, reviewPdfText } from './academy-question-bank-admin-pdf'
import type { AdminQuestion } from './academy-question-bank-admin-model'

const question: AdminQuestion = { courseCode: 'WL-002', courseTitle: 'Preventiemedewerker in de praktijk', bank: 'EXAM', referenceVersion: 'WL-002-EXAM-1.0', referenceStatus: 'DRAFT', code: 'WL002-EX-E17', questionVersion: 1, chapter: 4, type: 'MULTI_CHOICE', text: 'Welke twee activiteiten helpen bij preventie?', explanation: 'Beoordeel de omstandigheden en controleer de werking.', status: 'DRAFT', cognitiveLevel: 'T', knowledgeArea: 'Preventie', correctAnswer: ['A', 'C'], options: [{ value: 'A', text: 'Omstandigheden onderzoeken', isCorrect: true }, { value: 'B', text: 'Geen onderzoek nodig', isCorrect: false }, { value: 'C', text: 'Werking controleren', isCorrect: true }], review: ['Juridische review vereist', 'Toetsvalidatie vereist'] }
describe('Beveiligde Academy review-PDF', () => {
  it('preserves inequality and sequence meaning with visible equivalents and never silently drops an unsupported glyph', () => {
    expect(reviewPdfText('≤25 → ≥3 × 2')).toBe('<=25  ->  >=3  x  2')
    expect(() => reviewPdfText('未知')).toThrow('UNSUPPORTED_REVIEW_PDF_GLYPH')
  })
  it('contains every option, exact correct set, version, feedback and tagged Dutch text across pages', async () => {
    const bytes = await buildAcademyReviewPdf(Array.from({ length: 30 }, (_, index) => ({ ...question, code: `WL002-EX-E${index + 1}`, text: question.text + ' Lange casus met voldoende context. '.repeat(10) })), new Date('2026-10-25T10:00:00Z'))
    const pdf = await PDFDocument.load(bytes); expect(pdf.getPageCount()).toBeGreaterThan(1); expect(pdf.getTitle()).toContain('WL-002')
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const loading = pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }); const doc = await loading.promise
    let text = ''
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber), content = await page.getTextContent()
      expect(await page.getStructTree()).not.toBeNull(); expect(content.lang).toBe('nl')
      text += content.items.flatMap((item) => 'str' in item ? [item.str] : []).join(' ')
    }
    expect((await doc.getMarkInfo())?.Marked).toBe(true)
    for (const value of ['Vertrouwelijk', 'uitsluitend voor inhoudelijke review', 'WL-002-EXAM-1.0', '2026-10-25', 'vraagversie 1', 'A. Omstandigheden onderzoeken [CORRECT]', 'B. Geen onderzoek nodig', 'C. Werking controleren [CORRECT]', question.explanation, 'Juridische review vereist']) expect(text).toContain(value)
    expect(text).not.toMatch(/@|userId|ExamAttempt|examenresultaat/)
    await loading.destroy()
  }, 30_000)
  it('fails safely for empty or oversized exports', async () => {
    await expect(buildAcademyReviewPdf([])).rejects.toThrow('REVIEW_EXPORT_SIZE')
    await expect(buildAcademyReviewPdf(Array(5001).fill(question))).rejects.toThrow('REVIEW_EXPORT_SIZE')
  })
})
