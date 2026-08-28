'use client'

import { useActionState } from 'react'
import type { PublishIntakeActionState } from '@/app/opdrachten/actions'
import { StatusMessage } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import type { IntakeAssignmentReadiness } from '@/lib/assignments/intake-assignment-readiness'
import Link from 'next/link'
import { AssignmentQuoteSlotsField } from './assignment-quote-slots-field'

export function PublishIntakeForm({
  action,
  intakeId,
  expectedIntakeVersion,
  readiness,
}: {
  action: (state: PublishIntakeActionState, formData: FormData) => Promise<PublishIntakeActionState>
  intakeId: string
  expectedIntakeVersion: number
  readiness: IntakeAssignmentReadiness
}) {
  const [state, formAction, pending] = useActionState(action, {})
  const validationMessages = [...new Set(Object.values(state.errors ?? {}).flatMap((messages) => messages ?? []))]
  const readinessIssues = state.readinessIssues ?? []

  return (
    <form action={formAction}>
      <input type="hidden" name="intakeId" value={intakeId} />
      <input type="hidden" name="expectedIntakeVersion" value={expectedIntakeVersion} />
      {state.message && <StatusMessage error>{state.message}</StatusMessage>}
      {readinessIssues.length > 0 && (
        <div className="mt-4 rounded-control border border-warning/40 bg-surface p-4" role="status">
          <p className="font-semibold text-brand-dark">Vul eerst de volgende gegevens aan:</p>
          <ul className="mt-2 space-y-2 text-sm text-text-primary">
            {readinessIssues.map((issue) => (
              <li key={`${issue.code}-${issue.questionId ?? issue.section}`} className="flex flex-wrap items-baseline justify-between gap-2">
                <span>{issue.message}</span>
                {issue.editHref && <Link href={issue.editHref} className="font-semibold text-brand-primary-hover underline underline-offset-4">Aanpassen</Link>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {validationMessages.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-error" aria-label="Nog te controleren gegevens">
          {validationMessages.map((message) => <li key={message}>{message}</li>)}
        </ul>
      )}
      <div className="mt-5">
        <AssignmentQuoteSlotsField defaultValue={Number(state.values?.maxSelections ?? 3)} />
      </div>
      <Button type="submit" loading={pending} disabled={!readiness.isReady} className="mt-5 w-full sm:w-auto">
        Opdracht publiceren
      </Button>
    </form>
  )
}
