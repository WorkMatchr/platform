'use client'

import { useActionState } from 'react'
import type { IntakeActionState } from '@/app/hulpvragen/actions'
import { StatusMessage } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'

export function IntakeReadyForm({
  action,
  intakeId,
  expectedIntakeVersion,
  isComplete,
}: {
  action: (state: IntakeActionState, formData: FormData) => Promise<IntakeActionState>
  intakeId: string
  expectedIntakeVersion: number
  isComplete: boolean
}) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <form action={formAction} className="rounded-card border border-border bg-surface p-6">
      <input type="hidden" name="intakeId" value={intakeId} />
      <input type="hidden" name="expectedIntakeVersion" value={expectedIntakeVersion} />
      {state.message && <StatusMessage error>{state.message}</StatusMessage>}
      <h2 className={`text-lg font-bold text-brand-dark${state.message ? ' mt-5' : ''}`}>Intake gereedmelden</h2>
      <p className="mt-2 text-text-secondary">
        Controleer Uw antwoorden. Gereedmelden selecteert nog geen specialist en maakt nog geen opdracht aan.
      </p>
      <Button type="submit" loading={pending} disabled={!isComplete} className="mt-5 w-full sm:w-auto">
        Gereed voor controle
      </Button>
    </form>
  )
}
