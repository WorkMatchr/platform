import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLearningRuntimeEnabled } from '@/lib/learning/learning-runtime-policy'
import { Container } from '@/components/layout/container'
import { Card } from '@/components/ui/card'
import { getPublicLearningCertificate } from '@/lib/learning/learning-certificate-service'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Certificaat controleren | WorkMatchr', robots: { index: false, follow: false, noarchive: true } }

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'Europe/Amsterdam' }).format(date)
}

export default async function PublicCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  if (!isLearningRuntimeEnabled()) notFound()
  const { code } = await params
  const certificate = await getPublicLearningCertificate(code)
  return <Container className="py-10 sm:py-14">
    <Card className="mx-auto max-w-2xl space-y-5">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-primary">WorkMatchr Learning</p>
      {!certificate && <><h1 className="text-3xl font-bold text-brand-dark">Certificaat niet gevonden</h1><p className="leading-7 text-text-secondary">Controleer het certificaatnummer en probeer het opnieuw.</p></>}
      {certificate?.status === 'REVOKED' && <><h1 className="text-3xl font-bold text-brand-dark">Dit certificaat is niet geldig</h1><p className="leading-7 text-text-secondary">De geldigheid van dit certificaat kan niet worden bevestigd.</p></>}
      {certificate?.status === 'ACTIVE' && <>
        <h1 className="text-3xl font-bold text-brand-dark">Geldig certificaat</h1>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div><dt className="text-sm text-text-secondary">Opleiding</dt><dd className="font-semibold">{certificate.courseTitle}</dd></div>
          <div><dt className="text-sm text-text-secondary">Deelnemer</dt><dd className="font-semibold">{certificate.firstName} {certificate.lastName}</dd></div>
          <div><dt className="text-sm text-text-secondary">Behaald op</dt><dd className="font-semibold">{dateLabel(certificate.issuedAt)}</dd></div>
          <div><dt className="text-sm text-text-secondary">Uitgegeven door</dt><dd className="font-semibold">WorkMatchr Learning</dd></div>
          <div className="sm:col-span-2"><dt className="text-sm text-text-secondary">Certificaatnummer</dt><dd className="font-mono font-semibold">{certificate.certificateNumber}</dd></div>
        </dl>
        <p className="border-t border-border pt-4 text-sm leading-6 text-text-secondary">Deze pagina toont uitsluitend gegevens die nodig zijn om de echtheid van het certificaat te controleren.</p>
      </>}
    </Card>
  </Container>
}
