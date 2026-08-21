import { getArboGuideApiAccess } from '@/lib/arbo-guides/arbo-guide-access'
import { ArboGuideRunError, getArboGuideRun } from '@/lib/arbo-guides/arbo-guide-run-service'
import { buildComplianceReportPdf } from '@/lib/compliance-guide/compliance-report-pdf'

export const runtime = 'nodejs'
const MAX_REQUEST_BYTES = 1_024

export async function POST(request: Request) {
  const access = await getArboGuideApiAccess()
  if (!access.authorized) return new Response('Aanmelden vereist', { status: access.status })
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return new Response('Ongeldige aanvraag', { status: 415 })

  try {
    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) return new Response('Ongeldige aanvraag', { status: 413 })
    const body = JSON.parse(rawBody) as { runId?: unknown }
    if (typeof body.runId !== 'string' || body.runId.length > 100) return new Response('Ongeldige aanvraag', { status: 400 })
    const run = await getArboGuideRun({ userId: access.userId, organizationId: access.organizationId }, body.runId)
    if (run.guideType !== 'BHV') return new Response('Rapport niet gevonden', { status: 404 })
    const pdf = await buildComplianceReportPdf(run.reportSnapshot, { reportNumber: run.reportNumber, guideTitle: 'BHV-wijzer' })
    return new Response(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="workmatchr-bhv-rapport-${run.reportNumber}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    })
  } catch (error) {
    if (error instanceof ArboGuideRunError) return new Response('Rapport niet gevonden', { status: 404 })
    return new Response('Het rapport kon niet worden gemaakt.', { status: 400 })
  }
}
