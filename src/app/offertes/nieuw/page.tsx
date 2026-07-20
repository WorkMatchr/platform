import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { saveQuoteDraftAction } from '@/app/marktplaats/actions'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { getProviderParticipationForQuote } from '@/lib/marketplace/dashboard-query-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Offerte opstellen | WorkMatchr' }

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ deelname?: string }> }) {
  const participationId = (await searchParams).deelname
  if (!participationId) notFound()
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/offertes/nieuw?deelname=${participationId}`)
  const result = await getProviderParticipationForQuote(user.id, activeMembership.organization.id, participationId).catch(() => null)
  if (!result) notFound()
  return <Section spacing="compact"><Heading as="h1" size="h2">Offerte opstellen</Heading><p className="mt-3 text-text-secondary">Voor {result.participation.assignment.title}. U kunt het concept aanpassen tot u het indient en zolang de deadline niet is verstreken.</p><form action={saveQuoteDraftAction} className="mt-8 grid max-w-3xl gap-5"><input type="hidden" name="participationId" value={participationId}/><input type="hidden" name="expectedQuoteVersion" value={result.participation.quote?.version ?? 0}/><label className="grid gap-2 font-semibold">Prijs inclusief toelichting in euro<input name="price" type="number" min="0.01" step="0.01" required className="rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><label className="grid gap-2 font-semibold">Toelichting op de prijs<textarea name="priceExplanation" required minLength={10} maxLength={1000} className="min-h-28 rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><label className="grid gap-2 font-semibold">Aanpak<textarea name="approach" required minLength={20} className="min-h-40 rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><label className="grid gap-2 font-semibold">Planning<textarea name="planning" required minLength={10} maxLength={2000} className="min-h-28 rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><label className="grid gap-2 font-semibold">Voorwaarden, optioneel<textarea name="terms" maxLength={2000} className="min-h-28 rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><label className="grid gap-2 font-semibold">Geldig tot, optioneel<input name="validUntil" type="date" className="rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><Button type="submit" className="justify-self-start">Concept opslaan</Button></form></Section>
}
