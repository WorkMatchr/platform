import { NextResponse } from 'next/server'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getOwnedLearningCertificate } from '@/lib/learning/learning-certificate-service'
import { buildLearningCertificatePdf, learningCertificateFilename } from '@/lib/learning/learning-certificate-pdf'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(certificateId)) return NextResponse.json({ error: 'Niet gevonden.' }, { status: 404 })
  const user = await requireLearningUser('/e-learnings/mijn')
  const certificate = await getOwnedLearningCertificate(user.id, certificateId)
  if (!certificate) return NextResponse.json({ error: 'Niet gevonden.' }, { status: 404 })
  const pdf = await buildLearningCertificatePdf(certificate)
  return new NextResponse(Buffer.from(pdf), { headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${learningCertificateFilename(certificate.firstName, certificate.lastName)}"`,
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  } })
}
