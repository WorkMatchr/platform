import type { Metadata } from 'next'
import { ArboGuidePageLayout } from '@/components/public/arbo-guide-layout'
import { SimpleAdviceForm } from '@/components/requests/simple-advice-form'
import { getOptionalAdviceDossierViewer } from '@/lib/advice-dossiers/advice-dossier-authorization'
import { getPrisma } from '@/lib/prisma'
import { publishSimpleAdviceAction } from '../advieswijzer/simple-actions'

export const metadata: Metadata = { title: 'Opdracht starten | WorkMatchr', description: 'Kies uw deskundigheid of onderwerp en beschrijf uw opdracht.', alternates: { canonical: '/opdracht-starten' }, openGraph: { title: 'Opdracht starten | WorkMatchr', url: '/opdracht-starten' } }
export default async function AdviceGuidePage({ searchParams }: { searchParams?: Promise<{ start?: string | string[] }> }) {
  const start = (await searchParams)?.start
  const viewer = await getOptionalAdviceDossierViewer()
  const locations = viewer?.organizationId ? await getPrisma().organizationLocation.findMany({
    where: { organizationId: viewer.organizationId, archivedAt: null }, select: { id: true, city: true }, orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  }) : []
  return <ArboGuidePageLayout currentLabel="Opdracht starten" title="Maak uw opdracht" description="Kies een deskundigheid of onderwerp. Beschrijf daarna waar u hulp bij nodig heeft.">
    <SimpleAdviceForm start={typeof start === 'string' ? start : undefined} action={publishSimpleAdviceAction} viewerId={viewer?.organizationId ? viewer.userId : null} locations={locations} />
  </ArboGuidePageLayout>
}
