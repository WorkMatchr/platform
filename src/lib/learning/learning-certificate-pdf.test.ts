import { describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildLearningCertificatePdf, learningCertificateFilename, LEARNING_CERTIFICATE_DISCLAIMER } from './learning-certificate-pdf'
import { LEARNING_CERTIFICATE_TEMPLATE_VERSION } from './learning-certificate-template'

vi.mock('server-only', () => ({}))

describe('Learning-certificaat-PDF', () => {
  it('genereert een A4-landscape-pdf van één pagina met metadata en verificatie-QR', async () => {
    const date = new Date('2026-09-29T12:00:00.000Z')
    const bytes = await buildLearningCertificatePdf({
      templateVersion: LEARNING_CERTIFICATE_TEMPLATE_VERSION,
      firstName: 'Johannes Cornelis', lastName: 'van den Berg-Smit', courseTitle: 'RI&E in de praktijk',
      certificateNumber: 'WM-RIE-2026-0123456789ABCDEF01234567', issuedAt: date,
    })
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBe(1)
    expect(pdf.getTitle()).toBe('Certificaat RI&E in de praktijk')
    expect(pdf.getAuthor()).toBe('WorkMatchr Learning')
    expect(pdf.getSubject()).toBe('Certificaat van afronding')
    expect(pdf.getPages()[0]?.getSize()).toMatchObject({ width: 841.89, height: 595.28 })
    expect(Buffer.from(bytes).includes(Buffer.from('/Subtype /Image'))).toBe(true)
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const parsed = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise
    const metadata = await parsed.getMetadata()
    const markInfo = await parsed.getMarkInfo()
    const page = await parsed.getPage(1)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.flatMap((item) => 'str' in item ? [item.str] : []).join(' ')
    const structureTree = await page.getStructTree()
    const rawPdf = Buffer.from(bytes).toString('latin1')
    const roles: string[] = []
    const collectRoles = (node: NonNullable<typeof structureTree>) => {
      roles.push(node.role)
      for (const child of node.children) if ('role' in child) collectRoles(child)
    }
    if (structureTree) collectRoles(structureTree)

    expect(metadata.info).toMatchObject({ Title: 'Certificaat RI&E in de praktijk', Author: 'WorkMatchr Learning' })
    expect(textContent.lang).toBe('nl')
    expect(markInfo?.Marked).toBe(true)
    expect(structureTree).not.toBeNull()
    expect(rawPdf).toContain('/StructTreeRoot')
    expect(rawPdf).toContain('/Lang (nl)')
    expect(rawPdf).toContain('/Alt')
    expect(roles).toContain('Document')
    expect(roles).toContain('H1')
    expect(roles).toContain('H2')
    expect(roles.filter((role) => role === 'P').length).toBeGreaterThan(3)
    expect(roles).toContain('Figure')
    expect(roles.indexOf('H1')).toBeLessThan(roles.indexOf('Figure'))
    expect(pageText).toContain('Johannes Cornelis van den Berg-Smit')
    expect(pageText).toContain('RI&E in de praktijk')
    expect(pageText).toContain('WM-RIE-2026-0123456789ABCDEF01234567')
    expect(pageText).toContain('geen bewijs van certificering als arbokerndeskundige')
    expect(pageText).not.toContain('@')
    expect(pageText).not.toContain('Score')
    expect(pageText).not.toContain('example@')
    expect(LEARNING_CERTIFICATE_DISCLAIMER).toContain('geen bewijs van certificering als arbokerndeskundige')
    expect(pageText.replace(/\s+/g, ' ')).toContain(LEARNING_CERTIFICATE_DISCLAIMER.replace(/\s+/g, ' '))
    expect(learningCertificateFilename('Johannes Cornelis', 'van den Berg-Smit')).toBe('Certificaat-RIE-in-de-praktijk-Johannes-Cornelis-van-den-Berg-Smit.pdf')
  }, 30_000)

  it('rendert een onbekende templateversie niet stilzwijgend met de huidige template', async () => {
    await expect(buildLearningCertificatePdf({
      templateVersion: 'WL-001-CERT-2.0',
      firstName: 'Ada', lastName: 'Voorbeeld', courseTitle: 'RI&E in de praktijk',
      certificateNumber: 'WM-RIE-2026-0123456789ABCDEF01234567', issuedAt: new Date('2026-09-29T12:00:00.000Z'),
    })).rejects.toThrow('UNSUPPORTED_CERTIFICATE_TEMPLATE_VERSION')
  })
})
