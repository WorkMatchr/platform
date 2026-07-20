import type { Metadata } from 'next'
import Link from 'next/link'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { requireUser } from '@/lib/authorization'
import { getProviderReviewWorklist } from '@/lib/marketplace/provider-review-query-service'

export const metadata: Metadata = { title: 'Dossierbeoordeling | WorkMatchr' }

export default async function ProviderReviewWorklistPage() {
  const user = await requireUser('/beheer/dossiers')
  const worklist = await getProviderReviewWorklist(user.id)
  return <Section spacing="compact"><Heading as="h1" size="h2">Dossiers voor beoordeling</Heading><p className="mt-3 text-text-secondary">De beoordeling leest uitsluitend de immutable indieningsversie. Uw bevoegdheden: {worklist.permissions.join(', ').toLowerCase()}.</p><div className="mt-8 grid gap-4">{worklist.submissions.map((submission) => <Card key={submission.id}><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="font-semibold">{submission.providerProfile.organization.name}</h2><p className="mt-1 text-sm text-text-secondary">Status {submission.status.toLowerCase()} · versie {submission.version}</p></div><Link className="font-semibold underline" href={`/beheer/dossiers/${submission.providerProfile.id}`}>Open dossier</Link></div></Card>)}{worklist.submissions.length === 0 ? <p className="text-text-secondary">Er staan geen dossiers in de beoordelingswachtrij.</p> : null}</div></Section>
}
