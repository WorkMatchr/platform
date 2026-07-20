import type { Metadata } from 'next'
import Link from 'next/link'
import { markNotificationReadAction } from '@/app/marktplaats/actions'
import { Section } from '@/components/layout/section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { requireUser } from '@/lib/authorization'
import { getMarketplaceNotifications } from '@/lib/marketplace/notification-service'

export const metadata: Metadata = { title: 'Notificaties | WorkMatchr' }

export default async function NotificationsPage() {
  const user = await requireUser('/notificaties')
  const notifications = await getMarketplaceNotifications(user.id, 50)
  return <Section spacing="compact"><Heading as="h1" size="h2">Notificaties</Heading><p className="mt-3 text-text-secondary">Belangrijke gebeurtenissen rond dossiers, opdrachten, offertes en credits.</p><div className="mt-8 grid gap-4">{notifications.map((notification) => <Card key={notification.id} variant={notification.readAt ? 'subtle' : 'default'}><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold">{notification.title}</h2><p className="mt-2 text-text-secondary">{notification.body}</p><time className="mt-2 block text-xs text-text-secondary" dateTime={notification.createdAt.toISOString()}>{notification.createdAt.toLocaleString('nl-NL')}</time></div><div className="flex flex-wrap gap-2"><Link className="font-semibold underline" href={notification.targetRoute}>Openen</Link>{!notification.readAt && <form action={markNotificationReadAction}><input type="hidden" name="notificationId" value={notification.id}/><Button type="submit" variant="ghost">Markeer als gelezen</Button></form>}</div></div></Card>)}{notifications.length === 0 && <Card><p>U heeft nog geen notificaties.</p></Card>}</div></Section>
}
