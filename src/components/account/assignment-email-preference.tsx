"use client"

import { useActionState } from 'react'
import { updateAssignmentEmailPreference } from '@/app/account/assignment-email-preference'
import { Button } from '@/components/ui/button'

export function AssignmentEmailPreference({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(updateAssignmentEmailPreference, { message: '' })
  return <form action={action} className="mt-6 grid gap-3 rounded-card border border-border p-4" aria-busy={pending}>
    <h2 className="font-semibold">Opdrachtmeldingen</h2>
    <label className="flex items-start gap-2"><input type="checkbox" name="assignmentEmailEnabled" defaultChecked={enabled} className="mt-1" />E-mail bij nieuwe passende opdrachten</label>
    <p className="text-sm text-text-secondary">U ontvangt alleen e-mail wanneer uw organisatie wordt uitgenodigd. Meldingen blijven altijd beschikbaar op WorkMatchr.</p>
    <Button type="submit" loading={pending} loadingLabel="Voorkeur opslaan…">Voorkeur opslaan</Button>
    {state.message && <p role="status">{state.message}</p>}
  </form>
}
