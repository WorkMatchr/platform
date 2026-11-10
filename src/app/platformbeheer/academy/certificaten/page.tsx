import Link from 'next/link'
import type { Metadata } from 'next'
import { requirePlatformOperator } from '@/lib/platform-admin/platform-admin-authorization'
import { AdminPageHeader } from '@/components/platform-admin/platform-admin-ui'
import { listAcademyCertificateCourses, listAcademyCertificates } from '@/lib/learning/academy-certificate-admin-service'
import { AcademyCertificateList } from '@/components/learning/academy-certificate-list'

export const metadata: Metadata = { title: 'Academy — Certificaten', robots: { index: false, follow: false, nocache: true } }
export const dynamic = 'force-dynamic'
export default async function AcademyCertificatesPage() {
  await requirePlatformOperator('/platformbeheer/academy/certificaten')
  const [courses, initial] = await Promise.all([listAcademyCertificateCourses(), listAcademyCertificates({})])
  return <div className="min-w-0">
    <AdminPageHeader eyebrow="Academy" title="Certificaten" description="Bekijk oorspronkelijke certificaatgegevens, controleer de geldigheid en download het certificaat." />
    <p><Link className="inline-flex min-h-11 items-center underline" href="/platformbeheer/academy/certificaten/sjablonen">Certificaatsjablonen ontwerpen</Link></p>
    <AcademyCertificateList courses={courses} initial={initial} />
  </div>
}
