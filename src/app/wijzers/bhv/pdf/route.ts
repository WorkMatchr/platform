import { getOptionalActiveOrganizationContext } from '@/lib/organizations/organization-authorization'
import { normalizeBhvGuideAnswers, type BhvGuideAnswers } from '@/lib/bhv-guide/bhv-guide'
import { buildBhvReportData } from '@/lib/bhv-guide/bhv-report'
import { buildComplianceReportPdf } from '@/lib/compliance-guide/compliance-report-pdf'

export const runtime = 'nodejs'
const MAX_REQUEST_BYTES = 20_000

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return new Response('Ongeldige aanvraag', { status: 415 })
  try {
    const text = await request.text()
    if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) return new Response('Ongeldige aanvraag', { status: 413 })
    const body = JSON.parse(text) as { answers?: Partial<Record<keyof BhvGuideAnswers, unknown>>; tier?: unknown }
    if (body.tier !== undefined && body.tier !== 'BASIC') return new Response('Niet beschikbaar', { status: 403 })
    const organization = await getOptionalActiveOrganizationContext()
    const report = buildBhvReportData({ answers: normalizeBhvGuideAnswers(body.answers ?? {}), organizationName: organization?.activeMembership?.organization.name, scannedAt: new Date(), tier: 'BASIC' })
    const pdf = await buildComplianceReportPdf(report, { guideTitle: 'BHV-wijzer' })
    return new Response(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="workmatchr-bhv-rapport-${report.scannedAt.slice(0, 10)}.pdf"`, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' } })
  } catch { return new Response('Het rapport kon niet worden gemaakt.', { status: 400 }) }
}
