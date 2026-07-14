'use client'

import { useActionState } from 'react'
import type { SubmitIntakeActionState } from '@/app/opdrachten/actions'
import { StatusMessage } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'

export function SubmitIntakeForm({
  action,
  intakeId,
  expectedIntakeVersion,
}: {
  action: (state: SubmitIntakeActionState, formData: FormData) => Promise<SubmitIntakeActionState>
  intakeId: string
  expectedIntakeVersion: number
}) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <form action={formAction}>
      <input type="hidden" name="intakeId" value={intakeId} />
      <input type="hidden" name="expectedIntakeVersion" value={expectedIntakeVersion} />
      {state.message && <StatusMessage error>{state.message}</StatusMessage>}
      <label className={`mt-5 flex items-start gap-3 rounded-control border p-4 ${state.errors?.confirmed ? 'border-error' : 'border-border'}`}>
        <input type="checkbox" name="confirmed" required className="mt-1" aria-invalid={Boolean(state.errors?.confirmed)} aria-describedby={state.errors?.confirmed ? 'confirmed-error' : undefined} />
        <span>Ik bevestig dat ik deze hulpvraag namens de organisatie indien en begrijp dat de intake daarna niet meer kan worden gewijzigd.</span>
      </label>
      {state.errors?.confirmed?.[0] && <p id="confirmed-error" className="mt-2 text-sm text-error">{state.errors.confirmed[0]}</p>}
      <Button type="submit" loading={pending} className="mt-5 w-full sm:w-auto">
        Ja, dien mijn hulpvraag in
      </Button>
    </form>
  )
}
