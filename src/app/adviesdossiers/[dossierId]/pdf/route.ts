import { getOptionalAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'
import { buildAdviceDossierPdf } from '@/lib/advice-dossiers/advice-dossier-pdf'
import {
  AdviceDossierError,
  getAdviceDossier,
  recordAdviceDossierPdfDownload,
} from '@/lib/advice-dossiers/advice-dossier-service'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ dossierId: string }> },
) {
  const viewer = await getOptionalAdviceDossierViewer()
  if (!viewer) return new Response('Niet gevonden', { status: 404 })
  const { dossierId } = await params

  try {
    const dossier = await getAdviceDossier(viewer, dossierId)
    const pdf = await buildAdviceDossierPdf({
      dossierCode: dossier.dossierCode,
      createdAt: dossier.createdAt,
      status: dossier.status,
      versionNumber: dossier.currentVersionNumber,
      snapshot: dossier.currentVersion.snapshot,
    })
    await recordAdviceDossierPdfDownload({
      viewer,
      dossierId: dossier.id,
      versionNumber: dossier.currentVersionNumber,
    })
    const body = pdf.buffer.slice(
      pdf.byteOffset,
      pdf.byteOffset + pdf.byteLength,
    ) as ArrayBuffer
    return new Response(body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="WorkMatchr-Adviesdossier-${dossier.dossierCode}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
      },
    })
  } catch (error) {
    if (
      error instanceof AdviceDossierError &&
      error.code === 'NOT_FOUND'
    ) {
      return new Response('Niet gevonden', { status: 404 })
    }
    throw error
  }
}
