'use client'
import { useActionState } from 'react'
import { assignPilotAction } from './pilot-action'

export function PilotForm({ versions }: { versions: { id: string; title: string }[] }) {
  const [message, action, busy] = useActionState(assignPilotAction, '')
  return (
    <form action={action} className="space-y-3 rounded border p-4">
      <h2>Proefcursist aanwijzen</h2>
      <label>
        E-mailadres van het geverifieerde testaccount <input name="email" type="email" required />
      </label>
      <fieldset>
        <legend>Opleidingen</legend>
        {versions.map((v) => (
          <label className="block" key={v.id}>
            <input type="checkbox" name="version" value={v.id} /> {v.title}
          </label>
        ))}
      </fieldset>
      <label>
        Maximaal aantal inschrijvingen met deze code{' '}
        <input type="number" name="limit" defaultValue={1} min={1} max={3} required />
      </label>
      <label>
        Vervaldatum (00.00 UTC) <input type="date" name="until" required />
      </label>
      <p>De code geeft deze cursist 100% korting op de aangewezen versies.</p>
      <button disabled={busy}>Pilotcode aanmaken</button>
      <p role="status">{message}</p>
    </form>
  )
}
