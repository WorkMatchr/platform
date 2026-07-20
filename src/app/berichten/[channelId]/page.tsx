import { randomUUID } from 'node:crypto'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { sendMarketplaceMessageAction } from '@/app/marktplaats/actions'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/heading'
import { getMarketplaceChannel } from '@/lib/marketplace/messaging-service'
import { requireOrganizationMembership } from '@/lib/organizations/organization-authorization'

export const metadata: Metadata = { title: 'Berichten | WorkMatchr' }

export default async function MessageChannelPage({ params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params
  const { user, activeMembership } = await requireOrganizationMembership(undefined, `/berichten/${channelId}`)
  const channel = await getMarketplaceChannel(user.id, activeMembership.organization.id, channelId).catch(() => null)
  if (!channel) notFound()
  return <Section spacing="compact"><Heading as="h1" size="h2">Berichten over de opdracht</Heading><p className="mt-3 text-text-secondary">Dit kanaal is alleen zichtbaar voor uw organisatie en de betrokken andere partij.</p><ol className="mt-8 grid gap-4" aria-label="Berichten">{channel.messages.map((message) => <li key={message.id} className={`max-w-2xl rounded-card border border-border p-5 ${message.senderOrganizationId === activeMembership.organization.id ? 'ml-auto bg-brand-primary-subtle' : 'bg-surface'}`}><p className="whitespace-pre-wrap">{message.status === 'REMOVED' ? 'Dit bericht is verwijderd.' : message.content}</p><time className="mt-2 block text-xs text-text-secondary" dateTime={message.createdAt.toISOString()}>{message.createdAt.toLocaleString('nl-NL')}</time></li>)}{channel.messages.length === 0 && <li className="text-text-secondary">Er zijn nog geen berichten.</li>}</ol>{channel.status === 'OPEN' && activeMembership.role !== 'MEMBER' ? <form action={sendMarketplaceMessageAction} className="mt-8 grid max-w-2xl gap-3"><input type="hidden" name="channelId" value={channel.id}/><input type="hidden" name="idempotencyKey" value={`MESSAGE:${channel.id}:${randomUUID()}`}/><label className="grid gap-2 font-semibold">Nieuw bericht<textarea name="content" required maxLength={4000} className="min-h-32 rounded-control border border-border bg-surface px-4 py-3 font-normal"/></label><Button type="submit" className="justify-self-start">Bericht versturen</Button></form> : <p className="mt-8 rounded-control bg-surface-subtle p-4">Dit gesprek is alleen-lezen.</p>}</Section>
}
