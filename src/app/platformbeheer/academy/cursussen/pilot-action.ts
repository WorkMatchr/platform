'use server'
import { requireAuthor } from '@/lib/learning/academy-authoring-service'
import { assignPilot } from '@/lib/learning/academy-pilot-service'
export async function assignPilotAction(_state: string, data: FormData) {
  const actor = await requireAuthor()
  try {
    const code = await assignPilot(actor.userId, {
      email: String(data.get('email')),
      paid: data.get('mode') === 'paid',
      versions: data.getAll('version').map(String),
      maximumUses: Number(data.get('limit')),
      validUntil: new Date(String(data.get('until')) + 'T00:00:00Z'),
    })
    return 'Persoonlijke code: ' + code + ' · Inwisselen via Mijn e-learnings.'
  } catch {
    return 'Toewijzing mislukt. Controleer het geverifieerde testaccount, de gekozen versies, vervaldatum, bestaande toewijzing en beschikbare plaatsen.'
  }
}
