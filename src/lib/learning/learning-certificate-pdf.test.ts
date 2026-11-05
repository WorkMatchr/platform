import { describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildLearningCertificatePdf, learningCertificateFilename, LEARNING_CERTIFICATE_DISCLAIMER } from './learning-certificate-pdf'
import { LEARNING_CERTIFICATE_TEMPLATE_VERSION } from './learning-certificate-template'

vi.mock('server-only', () => ({}))

describe('Learning-certificaat-PDF', () => {
  it('marks a separate name correction without losing the original certificate identity or PDF structure', async()=>{
    const bytes=await buildLearningCertificatePdf({templateVersion:'ACADEMY-CERT-1.0',firstName:'Johannes Cornelis',lastName:'van den Berg-Smit',courseTitle:'RI&E in de praktijk',certificateNumber:'WM-ACA-2026-0123456789ABCDEF01234567',issuedAt:new Date('2026-10-24'),correctionNotice:'Naamcorrectie van 2026-10-30; het oorspronkelijke certificaat blijft bewaard.'})
    const pdf=await PDFDocument.load(bytes);expect(pdf.getPageCount()).toBe(1)
    const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs'),loading=pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true}),doc=await loading.promise,page=await doc.getPage(1),content=await page.getTextContent()
    const text=content.items.flatMap(i=>'str' in i?[i.str]:[]).join(' ')
    expect(text).toContain('Naamcorrectie van 2026-10-30');expect(text).toContain('Johannes Cornelis van den Berg-Smit');expect(text).toContain('WM-ACA-2026-0123456789ABCDEF01234567');expect(text).not.toMatch(/@|Score/);expect(content.lang).toBe('nl');expect(await page.getStructTree()).not.toBeNull()
    await loading.destroy()
  },30000)

  it('uses the shared Academy template with the actual course title, tags and no WL-001 qualification copy', async () => {
    const title = 'Preventiemedewerker in de praktijk'
    const bytes = await buildLearningCertificatePdf({ templateVersion: 'ACADEMY-CERT-1.0', firstName: 'Johannes Cornelis', lastName: 'van den Berg-Smit', courseTitle: title, certificateNumber: 'WM-ACA-2026-0123456789ABCDEF01234567', issuedAt: new Date('2026-10-24T12:00:00Z') })
    const pdf = await PDFDocument.load(bytes)
    expect(pdf.getPageCount()).toBe(1); expect(pdf.getTitle()).toBe(`Certificaat ${title}`)
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const loading = pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true })
    const document = await loading.promise
    const page = await document.getPage(1), content = await page.getTextContent()
    const text = content.items.flatMap((item) => 'str' in item ? [item.str] : []).join(' ')
    expect(content.lang).toBe('nl'); expect(await page.getStructTree()).not.toBeNull()
    expect(text).toContain(title.toLocaleUpperCase('nl'))
    expect(text).toContain('Johannes Cornelis van den Berg-Smit')
    expect(text).toContain('WM-ACA-2026-0123456789ABCDEF01234567')
    expect(text).toContain('geen wettelijke beroepskwalificatie')
    expect(text).not.toMatch(/@|score|RI&E IN DE PRAKTIJK/)
    expect(learningCertificateFilename('Ada', 'Voorbeeld', title)).toBe('Certificaat-Preventiemedewerker-in-de-praktijk-Ada-Voorbeeld.pdf')
    await loading.destroy()
  }, 30_000)
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
