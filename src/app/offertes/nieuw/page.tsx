import type { Metadata } from 'next'
import { formatQuoteExpiry, quoteValidityInputDate } from '@/lib/marketplace/quote-validity-date'
import { notFound } from 'next/navigation'
import { saveQuoteDraftAction } from '@/app/marktplaats/actions'
import { Section } from '@/components/layout/section'
import { ActionForm, SubmitButton as Button } from '@/components/ui/action-form'
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
  const current = result.participation.quote?.currentVersion
  if (!result.canEdit) return <Section spacing="compact"><Heading as="h1" size="h2">Offerte niet meer aanpasbaar</Heading><p className="mt-3">De offerte is al ingediend, de reactietermijn is verstreken of de opdracht is afgesloten.</p></Section>
  return <Section spacing="compact"><Heading as="h1" size="h2">Offerte opstellen</Heading><p className="mt-3 text-text-secondary">Voor {result.participation.assignment.title}. U kunt het concept aanpassen tot u het indient en zolang de deadline niet is verstreken.</p><ActionForm action={saveQuoteDraftAction} className="mt-8 grid max-w-3xl gap-5"><input type="hidden" name="participationId" value={participationId}/><input type="hidden" name="expectedQuoteVersion" value={result.participation.quote?.version ?? 0}/><label className="grid gap-2 font-semibold">Prijs inclusief toelichting in euro<input name="price" defaultValue={current ? (Number(current.priceCents) / 100).toFixed(2) : undefined} type="number" min="0.01" step="0.01" required className="rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><label className="grid gap-2 font-semibold">Toelichting op de prijs<textarea name="priceExplanation" defaultValue={current?.priceExplanation ?? ''} required minLength={10} maxLength={1000} className="min-h-28 rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><label className="grid gap-2 font-semibold">Aanpak<textarea name="approach" defaultValue={current?.approach ?? ''} required minLength={20} maxLength={10_000} className="min-h-40 rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><label className="grid gap-2 font-semibold">Planning<textarea name="planning" defaultValue={current?.planning ?? ''} required minLength={10} maxLength={2000} className="min-h-28 rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><label className="grid gap-2 font-semibold">Voorwaarden, optioneel<textarea name="terms" defaultValue={current?.terms ?? ''} maxLength={2000} className="min-h-28 rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><label className="grid gap-2 font-semibold">Geldig tot en met (Nederlandse datum), optioneel<input name="validUntil" aria-describedby={current?.validUntil ? 'current-expiry' : undefined} defaultValue={current?.validUntil ? quoteValidityInputDate(current.validUntil) : ''} type="date" className="rounded-control border border-border bg-surface px-4 py-3 font-normal"/>{current?.validUntil ? <span id="current-expiry" className="text-sm font-normal text-text-secondary">Bij behoud van deze datum vervalt uw offerte op {formatQuoteExpiry(current.validUntil)}.</span> : null}</label><Button type="submit" className="justify-self-start">Concept opslaan</Button></ActionForm></Section>
}
