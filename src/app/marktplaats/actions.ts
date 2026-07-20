'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireUser } from '@/lib/authorization'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'
import { awardMarketplaceQuote } from '@/lib/marketplace/award-service'
import { correctMarketplaceCredits, grantMarketplaceCredits } from '@/lib/marketplace/credit-service'
import { applyMarketplaceMatchIntervention, runMarketplaceMatching } from '@/lib/marketplace/matching-service'
import { sendMarketplaceMessage } from '@/lib/marketplace/messaging-service'
import { markMarketplaceNotificationRead } from '@/lib/marketplace/notification-service'
import { acceptProviderInvitation, declineProviderInvitation } from '@/lib/marketplace/participation-service'
import { saveQuoteDraft, submitQuote } from '@/lib/marketplace/quote-service'

const idSchema = z.uuid()
const idempotencySchema = z.string().min(8).max(120)

async function context(returnTo: string) {
  const user = await requireUser(returnTo)
  const organization = await requireOrganizationMembership(undefined, returnTo)
  return { user, organizationId: organization.activeMembership.organization.id }
}

export async function startMarketplaceMatchingAction(formData: FormData) {
  const assignmentId = idSchema.parse(formData.get('assignmentId'))
  const expectedAssignmentVersion = z.coerce.number().int().positive().parse(formData.get('expectedAssignmentVersion'))
  const idempotencyKey = idempotencySchema.parse(formData.get('idempotencyKey'))
  const { user, organizationId } = await context(`/opdrachten/${assignmentId}/selectie`)
  await runMarketplaceMatching({ actorUserId: user.id, organizationId, assignmentId, expectedAssignmentVersion, idempotencyKey })
  revalidatePath('/dashboard')
  redirect(`/opdrachten/${assignmentId}/offertes`)
}

export async function acceptProviderInvitationAction(formData: FormData) {
  const invitationId = idSchema.parse(formData.get('invitationId'))
  const idempotencyKey = idempotencySchema.parse(formData.get('idempotencyKey'))
  const { user, organizationId } = await context(`/uitnodigingen/${invitationId}`)
  const participation = await acceptProviderInvitation({ actorUserId: user.id, providerOrganizationId: organizationId, invitationId, idempotencyKey })
  revalidatePath('/dashboard')
  redirect(`/offertes/nieuw?deelname=${participation.id}`)
}

export async function declineProviderInvitationAction(formData: FormData) {
  const invitationId = idSchema.parse(formData.get('invitationId'))
  const reason = z.string().min(10).max(500).parse(formData.get('reason'))
  const idempotencyKey = idempotencySchema.parse(formData.get('idempotencyKey'))
  const { user, organizationId } = await context(`/uitnodigingen/${invitationId}`)
  await declineProviderInvitation({ actorUserId: user.id, providerOrganizationId: organizationId, invitationId, reason, idempotencyKey })
  revalidatePath('/dashboard')
  redirect('/uitnodigingen')
}

export async function saveQuoteDraftAction(formData: FormData) {
  const participationId = idSchema.parse(formData.get('participationId'))
  const expectedQuoteVersion = z.coerce.number().int().min(0).parse(formData.get('expectedQuoteVersion'))
  const { user, organizationId } = await context('/dashboard')
  const quote = await saveQuoteDraft({
    actorUserId: user.id,
    providerOrganizationId: organizationId,
    participationId,
    expectedQuoteVersion,
    content: {
      priceCents: Math.round(z.coerce.number().positive().parse(formData.get('price')) * 100),
      priceExplanation: z.string().min(10).max(1000).parse(formData.get('priceExplanation')),
      approach: z.string().min(20).max(10_000).parse(formData.get('approach')),
      planning: z.string().min(10).max(2000).parse(formData.get('planning')),
      terms: z.string().max(2000).optional().parse(formData.get('terms') || undefined),
      validUntil: formData.get('validUntil') ? z.coerce.date().parse(formData.get('validUntil')) : undefined,
    },
  })
  revalidatePath('/dashboard')
  redirect(`/offertes/${quote.id}`)
}

export async function submitQuoteAction(formData: FormData) {
  const quoteId = idSchema.parse(formData.get('quoteId'))
  const expectedQuoteVersion = z.coerce.number().int().positive().parse(formData.get('expectedQuoteVersion'))
  const idempotencyKey = idempotencySchema.parse(formData.get('idempotencyKey'))
  const { user, organizationId } = await context(`/offertes/${quoteId}`)
  await submitQuote({ actorUserId: user.id, providerOrganizationId: organizationId, quoteId, expectedQuoteVersion, idempotencyKey })
  revalidatePath('/dashboard')
  redirect(`/offertes/${quoteId}`)
}

export async function awardQuoteAction(formData: FormData) {
  const assignmentId = idSchema.parse(formData.get('assignmentId'))
  const quoteId = idSchema.parse(formData.get('quoteId'))
  const motivation = z.string().min(10).max(1000).parse(formData.get('motivation'))
  const idempotencyKey = idempotencySchema.parse(formData.get('idempotencyKey'))
  const { user, organizationId } = await context(`/opdrachten/${assignmentId}/offertes`)
  await awardMarketplaceQuote({ actorUserId: user.id, clientOrganizationId: organizationId, assignmentId, quoteId, motivation, idempotencyKey })
  revalidatePath('/dashboard')
  redirect(`/opdrachten/${assignmentId}/offertes`)
}

export async function sendMarketplaceMessageAction(formData: FormData) {
  const channelId = idSchema.parse(formData.get('channelId'))
  const content = z.string().min(1).max(4000).parse(formData.get('content'))
  const idempotencyKey = idempotencySchema.parse(formData.get('idempotencyKey'))
  const { user, organizationId } = await context(`/berichten/${channelId}`)
  await sendMarketplaceMessage({ actorUserId: user.id, organizationId, channelId, content, idempotencyKey })
  revalidatePath(`/berichten/${channelId}`)
}

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = idSchema.parse(formData.get('notificationId'))
  const user = await requireUser('/notificaties')
  await markMarketplaceNotificationRead(user.id, notificationId)
  revalidatePath('/notificaties')
}

export async function grantMarketplaceCreditsAction(formData: FormData) {
  const providerOrganizationId = idSchema.parse(formData.get('providerOrganizationId'))
  const amount = z.coerce.number().int().positive().parse(formData.get('amount'))
  const reason = z.string().min(10).max(500).parse(formData.get('reason'))
  const idempotencyKey = idempotencySchema.parse(formData.get('idempotencyKey'))
  const user = await requireUser('/beheer/marktplaats')
  await grantMarketplaceCredits({ actorUserId: user.id, providerOrganizationId, amount, reason, idempotencyKey })
  revalidatePath('/beheer/marktplaats')
}


export async function correctMarketplaceCreditsAction(formData: FormData) {
  const providerOrganizationId = idSchema.parse(formData.get('providerOrganizationId'))
  const amount = z.coerce.number().int().refine((value) => value !== 0).parse(formData.get('amount'))
  const reason = z.string().min(10).max(500).parse(formData.get('reason'))
  const idempotencyKey = idempotencySchema.parse(formData.get('idempotencyKey'))
  const user = await requireUser('/beheer/marktplaats')
  await correctMarketplaceCredits({ actorUserId: user.id, providerOrganizationId, amount, reason, idempotencyKey })
  revalidatePath('/beheer/marktplaats')
}

export async function applyMarketplaceMatchInterventionAction(formData: FormData) {
  const matchRunId = idSchema.parse(formData.get('matchRunId'))
  const candidateIds = z.array(idSchema).min(1).max(3).parse(formData.getAll('candidateIds'))
  const reason = z.string().min(10).max(500).parse(formData.get('reason'))
  const idempotencyKey = idempotencySchema.parse(formData.get('idempotencyKey'))
  const user = await requireUser('/beheer/marktplaats')
  await applyMarketplaceMatchIntervention({ actorUserId: user.id, matchRunId, candidateIds, reason, idempotencyKey })
  revalidatePath('/beheer/marktplaats')
}
