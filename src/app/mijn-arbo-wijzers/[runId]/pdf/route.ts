import { getArboGuideApiAccess } from '@/lib/arbo-guides/arbo-guide-access'
import { ArboGuideRunError, getArboGuideRun } from '@/lib/arbo-guides/arbo-guide-run-service'
import { buildComplianceReportPdf } from '@/lib/compliance-guide/compliance-report-pdf'

export const runtime = 'nodejs'

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const access = await getArboGuideApiAccess()
  if (!access.authorized) return new Response('Aanmelden vereist', { status: access.status })
  try {
    const { runId } = await params
    const run = await getArboGuideRun({ userId: access.userId, organizationId: access.organizationId }, runId)
    const guideTitle = run.guideType === 'BHV' ? 'BHV-wijzer' : 'Compliance-wijzer'
    const pdf = await buildComplianceReportPdf(run.reportSnapshot, { reportNumber: run.reportNumber, guideTitle })
    const body = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer
    return new Response(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="workmatchr-${run.guideType === 'BHV' ? 'bhv' : 'compliance'}-rapport-${run.reportNumber}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    })
  } catch (error) {
    if (error instanceof ArboGuideRunError) return new Response('Rapport niet gevonden', { status: 404 })
    return new Response('Het rapport kon niet worden gemaakt.', { status: 400 })
  }
}
