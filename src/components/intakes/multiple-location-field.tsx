'use client'

import { useState } from 'react'
import type { IntakeFormValue } from '@/app/hulpvragen/actions'
import { FieldError, fieldClassName } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import type { IntakeQuestionView } from '@/lib/intakes/intake-query-service'
import {
  MAX_LOCATION_VALUE_LENGTH,
  MAX_MULTIPLE_LOCATIONS,
  MIN_MULTIPLE_LOCATIONS,
  parseMultipleLocations,
} from '@/lib/intakes/intake-multiple-locations'

type Props = {
  question: IntakeQuestionView
  submittedValue?: IntakeFormValue
  errors?: Record<string, string[] | undefined>
}

export function MultipleLocationField({ question, submittedValue, errors }: Props) {
  const initial = submittedValue === undefined ? question.value : submittedValue
  const initialValues = parseMultipleLocations(initial)
  const [values, setValues] = useState(
    initialValues.length >= MIN_MULTIPLE_LOCATIONS ? initialValues : ['', ''],
  )
  const generalError = errors?.[question.id]?.[0]

  return (
    <fieldset aria-describedby={`${question.id}-help${generalError ? ` ${question.id}-error` : ''}`}>
      <legend className="font-semibold text-brand-dark">{question.label} <span aria-hidden="true">*</span></legend>
      <p id={`${question.id}-help`} className="mt-2 text-sm text-text-secondary">{question.helpText}</p>
      <div className="mt-4 space-y-3">
        {values.map((value, index) => {
          const rowError = errors?.[`${question.id}:${index}`]?.[0]
          const inputId = `${question.id}-${index}`
          return (
            <div key={inputId} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div>
                <label htmlFor={inputId} className="text-sm font-semibold text-brand-dark">
                  Plaats of regio {index + 1}
                </label>
                <input
                  id={inputId}
                  name={`answer-${question.id}`}
                  value={value}
                  maxLength={MAX_LOCATION_VALUE_LENGTH}
                  required
                  aria-invalid={Boolean(rowError)}
                  aria-describedby={rowError ? `${inputId}-error` : undefined}
                  className={`${fieldClassName}${rowError ? ' border-error ring-1 ring-error/30' : ''}`}
                  onChange={(event) => setValues((current) => current.map((entry, row) => row === index ? event.target.value : entry))}
                />
                <FieldError id={`${inputId}-error`} message={rowError} />
              </div>
              <Button
                type="button"
                variant="outline"
                className="sm:mt-6"
                disabled={values.length <= MIN_MULTIPLE_LOCATIONS}
                onClick={() => setValues((current) => current.filter((_, row) => row !== index))}
              >
                Verwijderen
              </Button>
            </div>
          )
        })}
      </div>
      {values.length < MAX_MULTIPLE_LOCATIONS && (
        <Button type="button" variant="outline" className="mt-4" onClick={() => setValues((current) => [...current, ''])}>
          Plaats of regio toevoegen
        </Button>
      )}
      <FieldError id={`${question.id}-error`} message={generalError} />
    </fieldset>
  )
}
