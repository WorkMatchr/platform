'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { IntakeActionState } from '@/app/hulpvragen/actions'
import { IntakeQuestionField } from '@/components/intakes/intake-question-field'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { StatusMessage } from '@/components/auth/auth-shell'
import type { IntakeQuestionView } from '@/lib/intakes/intake-query-service'

type IntakeStepFormProps = {
  action: (state: IntakeActionState, formData: FormData) => Promise<IntakeActionState>
  intakeId: string
  expectedIntakeVersion: number
  category: IntakeQuestionView['category']
  questions: IntakeQuestionView[]
  locations: Array<{ id: string; label: string }>
  previousHref: string
  primaryLocationRequired: boolean
}

export function IntakeStepForm({
  action,
  intakeId,
  expectedIntakeVersion,
  category,
  questions,
  locations,
  previousHref,
  primaryLocationRequired,
}: IntakeStepFormProps) {
  const [state, formAction, pending] = useActionState(action, {})
  const formRef = useRef<HTMLFormElement>(null)
  const formKey = state.values ? JSON.stringify(state.values) : `version-${expectedIntakeVersion}`

  useEffect(() => {
    if (!state.errors) return
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus()
  }, [state.errors, state.values])

  return (
    <form ref={formRef} key={formKey} action={formAction} className="space-y-8" noValidate>
      <input type="hidden" name="intakeId" value={intakeId} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="expectedIntakeVersion" value={expectedIntakeVersion} />
      {questions.map((question) => (
        <input key={question.id} type="hidden" name="questionId" value={question.id} />
      ))}
      {questions.filter((question) => question.inputType === 'MULTI_SELECT').map((question) => (
        <input key={question.id} type="hidden" name="multiQuestionId" value={question.id} />
      ))}
      {questions.filter((question) => question.inputType === 'BOOLEAN').map((question) => (
        <input key={question.id} type="hidden" name="booleanQuestionId" value={question.id} />
      ))}

      {state.message && <StatusMessage error>{state.message}</StatusMessage>}
      {questions.map((question) => {
        const effectivelyRequired = question.key === 'PRIMARY_LOCATION'
          ? primaryLocationRequired
          : question.isRequired
        return (
          <IntakeQuestionField
            key={question.id}
            question={question}
            locations={locations}
            submittedValue={state.values?.[question.id]}
            error={state.errors?.[question.id]?.[0]}
            effectivelyRequired={effectivelyRequired}
          />
        )
      })}

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
        <LinkButton href={previousHref} variant="outline">Vorige stap</LinkButton>
        <Button type="submit" loading={pending}>Opslaan en verder</Button>
      </div>
    </form>
  )
}
