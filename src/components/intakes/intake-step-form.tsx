'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import type { IntakeActionState, IntakeFormValue } from '@/app/hulpvragen/actions'
import { IntakeQuestionField } from '@/components/intakes/intake-question-field'
import { MultipleLocationField } from '@/components/intakes/multiple-location-field'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { StatusMessage } from '@/components/auth/auth-shell'
import type { IntakeQuestionView } from '@/lib/intakes/intake-query-service'
import type { IntakeClassification } from '@/lib/intakes/intake-classification'
import { CLASSIFICATION_CLARIFICATION_OPTION_FIELD } from '@/lib/intakes/intake-classification-clarifications'
import {
  createIntakeAnswerLookup,
  isCatalogQuestionVisible,
  type IntakeAnswerLookup,
} from '@/lib/intakes/intake-question-catalog'

type IntakeStepFormProps = {
  action: (state: IntakeActionState, formData: FormData) => Promise<IntakeActionState>
  intakeId: string
  expectedIntakeVersion: number
  category: IntakeQuestionView['category']
  questions: IntakeQuestionView[]
  locations: Array<{ id: string; label: string }>
  previousHref: string
  primaryLocationRequired: boolean
  originalHelpRequest?: string
  classification?: IntakeClassification
  questionnaireVersion: number
  initialVisibilityAnswers: Record<string, string[]>
  returnToReview?: boolean
}

function effectiveQuestionValues(
  questions: IntakeQuestionView[],
  submittedValues?: Record<string, IntakeFormValue>,
) {
  return questions.map((question) => ({
    ...question,
    value: submittedValues?.[question.id] ?? question.value,
  }))
}

function updateLookupFromForm(
  current: IntakeAnswerLookup,
  questions: IntakeQuestionView[],
  form: HTMLFormElement,
): IntakeAnswerLookup {
  const next = new Map(current)
  const data = new FormData(form)

  for (const question of questions) {
    if (question.inputType !== 'SINGLE_SELECT' && question.inputType !== 'MULTI_SELECT') continue
    const selectedOptionIds = data.getAll(`answer-${question.id}`).map(String)
    const selectedValues = selectedOptionIds
      .map((optionId) => question.options.find((option) => option.id === optionId)?.value)
      .filter((value): value is string => Boolean(value))
    next.set(question.key, selectedValues)
  }

  return next
}

export function createIntakeStepAnswerLookup(
  questions: IntakeQuestionView[],
  initialVisibilityAnswers: Record<string, string[]>,
  submittedValues?: Record<string, IntakeFormValue>,
): IntakeAnswerLookup {
  const lookup = new Map<string, readonly string[]>(Object.entries(initialVisibilityAnswers))
  const currentStepAnswers = createIntakeAnswerLookup(
    effectiveQuestionValues(questions, submittedValues),
  )

  for (const [key, values] of currentStepAnswers) lookup.set(key, values)
  return lookup
}

function IntakeStepFields({
  questions,
  locations,
  submittedValues,
  errors,
  primaryLocationRequired,
  classification,
  questionnaireVersion,
  initialVisibilityAnswers,
}: Pick<IntakeStepFormProps, 'questions' | 'locations' | 'primaryLocationRequired' | 'classification' | 'questionnaireVersion'> & {
  initialVisibilityAnswers: Record<string, string[]>
  submittedValues?: Record<string, IntakeFormValue>
  errors?: Record<string, string[] | undefined>
}) {
  const [answerLookup, setAnswerLookup] = useState(() =>
    createIntakeStepAnswerLookup(questions, initialVisibilityAnswers, submittedValues),
  )

  return (
    <div
      className="space-y-8"
      onChange={(event) => {
        const form = event.currentTarget.closest('form')
        if (form) setAnswerLookup((current) => updateLookupFromForm(current, questions, form))
      }}
    >
      {questions.map((question) => {
        const visible = isCatalogQuestionVisible(question.key, answerLookup, questionnaireVersion)
        const effectivelyRequired = question.key === 'PRIMARY_LOCATION'
          ? primaryLocationRequired
          : question.isRequired
        return (
          <div key={question.id} hidden={!visible}>
            <fieldset disabled={!visible} className="min-w-0 border-0 p-0">
              {question.key === 'MULTIPLE_LOCATION_DETAILS' ? (
                <MultipleLocationField question={question} submittedValue={submittedValues?.[question.id]} errors={errors} />
              ) : (
                <IntakeQuestionField
                  question={question}
                  locations={locations}
                  submittedValue={submittedValues?.[question.id]}
                  error={errors?.[question.id]?.[0]}
                  effectivelyRequired={effectivelyRequired}
                  classification={classification}
                  clarificationOptionId={typeof submittedValues?.[CLASSIFICATION_CLARIFICATION_OPTION_FIELD] === 'string'
                    ? submittedValues[CLASSIFICATION_CLARIFICATION_OPTION_FIELD]
                    : undefined}
                />
              )}
            </fieldset>
          </div>
        )
      })}
    </div>
  )
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
  originalHelpRequest,
  classification,
  questionnaireVersion,
  initialVisibilityAnswers,
  returnToReview = false,
}: IntakeStepFormProps) {
  const [state, formAction, pending] = useActionState(action, {})
  const formRef = useRef<HTMLFormElement>(null)
  const formKey = state.values ? JSON.stringify(state.values) : `version-${expectedIntakeVersion}`
  const messageVisibilityLookup = createIntakeStepAnswerLookup(
    questions,
    initialVisibilityAnswers,
    state.values,
  )
  const visibleQuestionIds = new Set(
    questions
      .filter((question) => isCatalogQuestionVisible(
        question.key,
        messageVisibilityLookup,
        questionnaireVersion,
      ))
      .map((question) => question.id),
  )
  const hasVisibleFieldError = Object.keys(state.errors ?? {}).some((questionId) =>
    visibleQuestionIds.has(questionId),
  )
  const statusMessage = state.message === 'Controleer de gemarkeerde velden.' && !hasVisibleFieldError
    ? 'De vragen voor deze categorie konden niet worden geladen. Ga terug en kies de categorie opnieuw.'
    : state.message

  useEffect(() => {
    if (!state.errors) return
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid="true"]')?.focus()
  }, [state.errors, state.values])

  return (
    <form ref={formRef} key={formKey} action={formAction} className="space-y-8" noValidate>
      <input type="hidden" name="intakeId" value={intakeId} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="expectedIntakeVersion" value={expectedIntakeVersion} />
      {returnToReview && <input type="hidden" name="returnToReview" value="true" />}
      {questions.map((question) => (
        <input key={question.id} type="hidden" name="questionId" value={question.id} />
      ))}
      {questions.filter((question) => question.inputType === 'MULTI_SELECT').map((question) => (
        <input key={question.id} type="hidden" name="multiQuestionId" value={question.id} />
      ))}
      {questions.filter((question) => question.inputType === 'BOOLEAN').map((question) => (
        <input key={question.id} type="hidden" name="booleanQuestionId" value={question.id} />
      ))}
      {questions.filter((question) => question.key === 'MULTIPLE_LOCATION_DETAILS').map((question) => (
        <input key={question.id} type="hidden" name="repeatableQuestionId" value={question.id} />
      ))}

      {statusMessage && <StatusMessage error>{statusMessage}</StatusMessage>}
      {originalHelpRequest && (
        <div className="rounded-control border border-border bg-surface-subtle p-4">
          <p className="text-sm font-semibold text-text-secondary">Uw hulpvraag</p>
          <p className="mt-2 whitespace-pre-wrap text-text-primary">{originalHelpRequest}</p>
        </div>
      )}
      <IntakeStepFields
        key={formKey}
        questions={questions}
        locations={locations}
        submittedValues={state.values}
        errors={state.errors}
        primaryLocationRequired={primaryLocationRequired}
        classification={classification}
        questionnaireVersion={questionnaireVersion}
        initialVisibilityAnswers={initialVisibilityAnswers}
      />

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
        <LinkButton href={previousHref} variant="outline">Vorige stap</LinkButton>
        <Button type="submit" loading={pending}>Opslaan en verder</Button>
      </div>
    </form>
  )
}
