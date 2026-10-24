import { describe, expect, it, vi } from 'vitest'
import { createLearningCertificateEmail, isCertificateAttachmentWithinLimit } from './learning-certificate-email-worker'
import { buildLearningCertificatePdf } from './learning-certificate-pdf'
import { LEARNING_CERTIFICATE_TEMPLATE_VERSION } from './learning-certificate-template'

vi.mock('server-only', () => ({}))

describe('Learning-certificaatmail', () => {
  it('bevat het certificaat als PDF-bijlage en alleen de bedoelde opleidingsinformatie', () => {
    const message = createLearningCertificateEmail({
      to: 'student@example.invalid', firstName: '<Frank>', courseTitle: 'RI&E in de praktijk',
      certificateNumber: 'WM-RIE-2026-0123456789ABCDEF01234567', downloadUrl: 'https://www.workmatchr.nl/e-learnings/mijn',
      filename: 'Certificaat-RIE-in-de-praktijk-Frank.pdf', pdfBytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      idempotencyKey: 'EMAIL:student:certificate-issued',
    })
    expect(message.subject).toBe('Je certificaat — RI&E in de praktijk')
    expect(message.text).toContain('Certificaatnummer:\nWM-RIE-2026-0123456789ABCDEF01234567')
    expect(message.text).toContain('certificaat van afronding')
    expect(message.text).toContain('Als het vrijwillige 12-weekse kennisbehoudprogramma beschikbaar komt')
    expect(message.text).toContain('Je wordt niet automatisch ingeschreven')
    expect(message.text).toContain('alleen e-mails als je daar zelf voor kiest')
    expect(message.html).toContain('Gefeliciteerd &lt;Frank&gt;')
    expect(message.attachments).toHaveLength(1)
    expect(message.attachments?.[0]).toMatchObject({ filename: 'Certificaat-RIE-in-de-praktijk-Frank.pdf', contentType: 'application/pdf' })
    expect(message.attachments?.[0]?.content).toEqual(Buffer.from('%PDF'))
    expect(message.text).not.toMatch(/score|werkgever|poging/i)
    expect(message.idempotencyKey).toBe('EMAIL:student:certificate-issued')
  })

  it('hanteert de interne attachmentgrens van 20 MiB zonder grote buffers te maken', () => {
    expect(isCertificateAttachmentWithinLimit(20 * 1024 * 1024)).toBe(true)
    expect(isCertificateAttachmentWithinLimit(20 * 1024 * 1024 + 1)).toBe(false)
    expect(isCertificateAttachmentWithinLimit(-1)).toBe(false)
    expect(isCertificateAttachmentWithinLimit(Number.POSITIVE_INFINITY)).toBe(false)
  })

  it('kan de gegenereerde snapshot-PDF als dezelfde certificaatbijlage verpakken', async () => {
    const certificateNumber = 'WM-RIE-2026-0123456789ABCDEF01234567'
    const pdfBytes = await buildLearningCertificatePdf({
      templateVersion: LEARNING_CERTIFICATE_TEMPLATE_VERSION,
      firstName: 'Johannes Cornelis', lastName: 'van den Berg-Smit', courseTitle: 'RI&E in de praktijk',
      certificateNumber, issuedAt: new Date('2026-09-30T12:00:00.000Z'),
    })
    const message = createLearningCertificateEmail({
      to: 'student@example.invalid', firstName: 'Johannes', courseTitle: 'RI&E in de praktijk',
      certificateNumber, downloadUrl: 'https://www.workmatchr.nl/e-learnings/mijn',
      filename: 'Certificaat-RIE-in-de-praktijk-Johannes-Cornelis-van-den-Berg-Smit.pdf',
      pdfBytes, idempotencyKey: 'EMAIL:student:certificate-issued',
    })
    const attachment = message.attachments?.[0]
    expect(attachment?.contentType).toBe('application/pdf')
    expect(attachment?.filename).toBe('Certificaat-RIE-in-de-praktijk-Johannes-Cornelis-van-den-Berg-Smit.pdf')
    const attachedPdf = Buffer.from(attachment!.content)
    expect(attachedPdf.subarray(0, 5).toString()).toBe('%PDF-')
    const parsed = await import('pdf-lib').then(({ PDFDocument }) => PDFDocument.load(attachedPdf))
    expect(parsed.getPageCount()).toBe(1)
    expect(parsed.getTitle()).toBe('Certificaat RI&E in de praktijk')
    expect(attachedPdf.toString('latin1')).not.toContain('student@example.invalid')
    expect(message.text).toContain(certificateNumber)
    expect(message.text).not.toMatch(/score|percentage/i)
  }, 30_000)
})
