'use client'

import { useEffect, useRef, useState } from 'react'
import type { IntakeClassification } from '@/lib/intakes/intake-classification'
import {
  CLASSIFICATION_CLARIFICATION_OPTION_FIELD,
  CLASSIFICATION_CLARIFICATION_SET_FIELD,
  getIntakeClassificationClarificationSet,
} from '@/lib/intakes/intake-classification-clarifications'
import type { IntakeQuestionView } from '@/lib/intakes/intake-query-service'

type IntakeClassificationClarificationFieldProps = {
  question: IntakeQuestionView
  classification: IntakeClassification
  initialCategoryOptionId?: string
  initialClarificationOptionId?: string
  error?: string
  effectivelyRequired: boolean
}

export function IntakeClassificationClarificationField({
  question,
  classification,
  initialCategoryOptionId = '',
  initialClarificationOptionId = '',
  error,
  effectivelyRequired,
}: IntakeClassificationClarificationFieldProps) {
  const clarificationSet = classification.clarificationSetId
    ? getIntakeClassificationClarificationSet(classification.clarificationSetId)
    : undefined
  const initialClarification = clarificationSet?.options.find((option) => option.id === initialClarificationOptionId)
  const initialMappedOption = question.options.find((option) => option.value === initialClarification?.category)
  const [clarificationOptionId, setClarificationOptionId] = useState(initialClarificationOptionId)
  const [categoryOptionId, setCategoryOptionId] = useState(initialCategoryOptionId || initialMappedOption?.id || '')
  const categoryFieldsetRef = useRef<HTMLFieldSetElement>(null)

  useEffect(() => {
    if (!clarificationOptionId || initialClarificationOptionId) return
    const selected = categoryFieldsetRef.current?.querySelector<HTMLInputElement>('input:checked')
    const first = categoryFieldsetRef.current?.querySelector<HTMLInputElement>('input[type="radio"]')
    ;(selected ?? first)?.focus()
  }, [clarificationOptionId, initialClarificationOptionId])

  if (!clarificationSet) return null

  const clarification = clarificationSet.options.find((option) => option.id === clarificationOptionId)
  const mappedCategoryOption = question.options.find((option) => option.value === clarification?.category)
  const showClarification = !clarificationOptionId && !initialCategoryOptionId
  const invalidStyles = error ? ' border-error ring-1 ring-error/30' : ' border-border'
  const errorId = `${question.id}-error`
  const helpId = `${question.id}-help`

  return (
    <div>
      <input type="hidden" name={CLASSIFICATION_CLARIFICATION_SET_FIELD} value={clarificationSet.id} />
      {showClarification ? (
        <>
          <p className="text-sm text-text-secondary">{clarificationSet.introduction}</p>
          <fieldset className="mt-3" aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`}>
            <legend className="font-semibold text-brand-dark">{clarificationSet.question}</legend>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {clarificationSet.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-control border bg-surface px-3 py-3${invalidStyles}`}
                >
                  <input
                    className="mt-1"
                    type="radio"
                    name={CLASSIFICATION_CLARIFICATION_OPTION_FIELD}
                    value={option.id}
                    required
                    aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`}
                    data-invalid={Boolean(error)}
                    onChange={() => {
                      const mappedOption = question.options.find((candidate) => candidate.value === option.category)
                      setClarificationOptionId(option.id)
                      setCategoryOptionId(mappedOption?.id ?? '')
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      ) : (
        <fieldset ref={categoryFieldsetRef} aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`}>
          <input type="hidden" name={CLASSIFICATION_CLARIFICATION_OPTION_FIELD} value={clarificationOptionId} />
          <legend className="font-semibold text-brand-dark">Klopt deze categorie bij uw hulpvraag?</legend>
          {mappedCategoryOption ? (
            <div className="mt-3 rounded-control border border-brand-primary/30 bg-brand-primary-subtle p-4">
              <p className="text-sm text-text-secondary">Dit lijkt de meest passende categorie voor uw hulpvraag:</p>
              <p className="mt-1 font-bold text-brand-dark">{mappedCategoryOption.label}</p>
              <p className="mt-2 text-sm text-text-secondary">U kunt hieronder ook een andere categorie kiezen.</p>
            </div>
          ) : (
            <div className="mt-3 rounded-control border border-border bg-surface-subtle p-4 text-text-secondary">
              <p>We kunnen nog geen duidelijke categorie bepalen.</p>
              <p className="mt-1">Kies hieronder wat het beste past, of ga verder met &ldquo;Dat weet ik nog niet&rdquo;.</p>
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {question.options.map((option) => (
              <label
                key={option.id}
                className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-control border bg-surface px-3 py-3${invalidStyles}`}
              >
                <input
                  className="mt-1"
                  type="radio"
                  name={`answer-${question.id}`}
                  value={option.id}
                  checked={categoryOptionId === option.id}
                  required={effectivelyRequired}
                  aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`}
                  data-invalid={Boolean(error)}
                  onChange={() => setCategoryOptionId(option.id)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}
