import { randomUUID } from 'node:crypto'
import { AcademyCertificateRevoke } from '@/components/learning/academy-certificate-revoke'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requirePlatformOperator } from '@/lib/platform-admin/platform-admin-authorization'
import { AdminPageHeader } from '@/components/platform-admin/platform-admin-ui'
import { AcademyCertificateAdminError, readAcademyCertificate } from '@/lib/learning/academy-certificate-admin-service'
import { certificateDateLabel, certificateStatusLabel } from '@/lib/learning/academy-certificate-admin-model'
import { AcademyCertificateResendDialog } from '@/components/learning/academy-certificate-resend-dialog'
export const metadata: Metadata = { title:'Academy — Certificaatdetails',robots:{index:false,follow:false,nocache:true} }
export const dynamic='force-dynamic'
export default async function AcademyCertificatePage({params}:{params:Promise<{certificateId:string}>}) {
  await requirePlatformOperator('/platformbeheer/academy/certificaten')
  const {certificateId}=await params
  const certificate=await readAcademyCertificate(certificateId).catch(error=>{
    if(error instanceof AcademyCertificateAdminError){if(error.status===404)notFound();if([401,403].includes(error.status))redirect('/account')}
    throw error
  })
  const fields=[['Certificaatnummer',certificate.certificateNumber],['Naam op certificaat',certificate.firstName+' '+certificate.lastName],['Opleidingstitel',certificate.courseTitle],['Opleidingsversie',certificate.courseVersion],['Behaald op',certificateDateLabel(certificate.issuedAt)],['Verificatiecode',certificate.certificateNumber],['Status',certificateStatusLabel(certificate.status)],['Oorspronkelijke examenpoging (intern)',certificate.examAttemptId]]
  return <div className="min-w-0 [overflow-wrap:anywhere]"><AdminPageHeader eyebrow="Academy" title="Certificaatdetails" description="De oorspronkelijke certificaatsnapshot blijft behouden."/>
    <Link prefetch={false} className="inline-flex min-h-11 items-center underline focus-visible:outline-2" href="/platformbeheer/academy/certificaten">Terug naar certificaten</Link>
    <dl className="my-6 grid gap-5 rounded-card border border-border bg-surface p-5 sm:grid-cols-2">{fields.map(([label,value])=><div key={label} className="min-w-0"><dt className="font-semibold">{label}</dt><dd>{value}</dd></div>)}</dl>
    <div className="flex flex-wrap items-center gap-4">{certificate.status==='ACTIVE' && <a className="inline-flex min-h-11 items-center underline focus-visible:outline-2" href={'/platformbeheer/academy/certificaten/'+certificate.id+'/pdf'}>Download certificaat</a>}<Link prefetch={false} className="inline-flex min-h-11 items-center underline focus-visible:outline-2" href={'/certificaat/'+encodeURIComponent(certificate.certificateNumber)}>Verifieer certificaat</Link></div>
    {certificate.status==='ACTIVE' && <AcademyCertificateRevoke id={certificate.id} requestId={randomUUID()} decisionId={randomUUID()}/>}
    {certificate.status==='REVOKED' ? <p className="my-5">Dit certificaat is ingetrokken en kan niet als geldig certificaat worden verstrekt.</p> : certificate.recipientEmail && certificate.recipientFingerprint ?
      <div className="mt-5"><AcademyCertificateResendDialog certificateId={certificate.id} requestId={certificate.requestId} recipientFingerprint={certificate.recipientFingerprint} recipientEmail={certificate.recipientEmail} name={certificate.firstName+' '+certificate.lastName} courseTitle={certificate.courseTitle} certificateNumber={certificate.certificateNumber}/></div> :
      <p className="my-5">Herverzending is niet beschikbaar: de deelnemer moet een actief account met geverifieerd e-mailadres hebben.</p>}
  </div>
}
