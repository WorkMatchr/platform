import { getOptionalActiveOrganizationContext } from '@/lib/organizations/organization-authorization'
import { normalizeComplianceGuideAnswers, type ComplianceGuideAnswers } from '@/lib/compliance-guide/compliance-guide'
import { buildComplianceReportData } from '@/lib/compliance-guide/compliance-report'
import { buildComplianceReportPdf } from '@/lib/compliance-guide/compliance-report-pdf'

export const runtime = 'nodejs'
const MAX_REQUEST_BYTES = 16_384

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? '0')
  if (contentLength > MAX_REQUEST_BYTES) return new Response('Ongeldige aanvraag', { status: 413 })
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return new Response('Ongeldige aanvraag', { status: 415 })
  }

  try {
    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) return new Response('Ongeldige aanvraag', { status: 413 })
    const body = JSON.parse(rawBody) as { answers?: Partial<Record<keyof ComplianceGuideAnswers, unknown>>; tier?: unknown }
    if (body.tier !== undefined && body.tier !== 'BASIC') return new Response('Niet beschikbaar', { status: 403 })
    const answers = normalizeComplianceGuideAnswers(body.answers ?? {})
    const organizationContext = await getOptionalActiveOrganizationContext()
    const report = buildComplianceReportData({
      answers,
      organizationName: organizationContext?.activeMembership?.organization.name ?? null,
      scannedAt: new Date(),
      tier: 'BASIC',
    })
    const pdf = await buildComplianceReportPdf(report)
    const bodyBytes = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer
    const date = report.scannedAt.slice(0, 10)
    return new Response(bodyBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="workmatchr-compliance-rapport-${date}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    })
  } catch {
    return new Response('Het rapport kon niet worden gemaakt. Probeer het opnieuw.', { status: 400 })
  }
}
