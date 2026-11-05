import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/public-app-url', () => ({ getPublicAppBaseUrl: () => 'https://academy.example.invalid' }))
import { buildLearningCertificatePdf } from './learning-certificate-pdf'
afterEach(() => vi.useRealTimers())
describe('historical certificate PDF after one year', () => {
  it('reproduces the original snapshot content, one page, tags and verification code without issuance', async () => {
    const snapshot = Object.freeze({ templateVersion: 'ACADEMY-CERT-1.0', firstName: 'Johannes Cornelis', lastName: 'van den Berg-Smit', courseTitle: 'Veilig en gezond werken', certificateNumber: 'WM-ACA-2026-0123456789ABCDEF01234567', issuedAt: new Date('2026-10-29T10:00:00Z') })
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
    async function read(at: string) {
      vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(at))
      const bytes = await buildLearningCertificatePdf(snapshot)
      const loading = pdfjs.getDocument({ data: bytes, useSystemFonts: true })
      const doc = await loading.promise
      try {
        expect(doc.numPages).toBe(1); const page = await doc.getPage(1); const content = await page.getTextContent()
        expect(content.lang).toBe('nl'); expect(await page.getStructTree()).not.toBeNull()
        return content.items.flatMap(item => 'str' in item ? [item.str] : []).join(' ')
      } finally { await loading.destroy(); vi.useRealTimers() }
    }
    const original = await read('2026-10-29T12:00:00Z'), later = await read('2027-10-29T12:00:00Z')
    expect(later).toBe(original); expect(later).toContain('Johannes Cornelis van den Berg-Smit'); expect(later).toContain('29 oktober 2026'); expect(later).toContain(snapshot.certificateNumber); expect(later).not.toMatch(/@|score/i)
  }, 30_000)
})
