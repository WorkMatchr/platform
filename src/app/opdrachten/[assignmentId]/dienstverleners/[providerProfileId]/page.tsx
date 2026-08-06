import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Section } from '@/components/layout/section'
import { ProviderDecisionProfile } from '@/components/providers/provider-decision-profile'
import { requireUser } from '@/lib/authorization'
import { getAssignmentProviderDecisionProfile } from '@/lib/providers/provider-decision-profile-service'

export const metadata: Metadata = { title: 'Dienstverlenersprofiel | WorkMatchr' }

export default async function AssignmentProviderProfilePage({ params }: { params: Promise<{ assignmentId: string; providerProfileId: string }> }) {
  const { assignmentId, providerProfileId } = await params
  const user = await requireUser(`/opdrachten/${assignmentId}/dienstverleners/${providerProfileId}`)
  const result = await getAssignmentProviderDecisionProfile(user.id, assignmentId, providerProfileId).catch(() => null)
  if (!result) notFound()
  return <Section spacing="compact"><ProviderDecisionProfile profile={result.profile} backHref={`/opdrachten/${assignmentId}/offertes`} backLabel="Terug naar de opdracht" /></Section>
}
