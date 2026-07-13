import type { IntakeFormValue } from '@/app/hulpvragen/actions'
import { FieldError, fieldClassName } from '@/components/auth/auth-shell'
import type { IntakeQuestionView } from '@/lib/intakes/intake-query-service'

type IntakeQuestionFieldProps = {
  question: IntakeQuestionView
  locations: Array<{ id: string; label: string }>
  submittedValue?: IntakeFormValue
  error?: string
  effectivelyRequired?: boolean
}

function describedBy(question: IntakeQuestionView, error?: string) {
  return `${question.id}-help${error ? ` ${question.id}-error` : ''}`
}

function valueFor(question: IntakeQuestionView, submittedValue?: IntakeFormValue) {
  return submittedValue === undefined ? question.value : submittedValue
}

function RequiredLabel({ required, conditional }: { required: boolean; conditional?: boolean }) {
  if (conditional) return <span className="font-normal text-text-secondary">(verplicht tenzij volledig op afstand)</span>
  return required ? <span aria-hidden="true">*</span> : <span className="font-normal text-text-secondary">(optioneel)</span>
}

export function IntakeQuestionField({
  question,
  locations,
  submittedValue,
  error,
  effectivelyRequired = question.isRequired,
}: IntakeQuestionFieldProps) {
  const value = valueFor(question, submittedValue)
  const fieldName = `answer-${question.id}`
  const invalidStyles = error ? ' border-error ring-1 ring-error/30' : ''
  const helpId = `${question.id}-help`
  const errorId = `${question.id}-error`
  const common = {
    'aria-invalid': Boolean(error),
    'aria-describedby': describedBy(question, error),
  }
  const label = (
    <>
      {question.label} <RequiredLabel required={effectivelyRequired} conditional={question.key === 'PRIMARY_LOCATION'} />
    </>
  )

  let control
  if (question.inputType === 'LONG_TEXT') {
    control = (
      <textarea
        id={question.id}
        name={fieldName}
        rows={6}
        required={effectivelyRequired}
        minLength={question.minLength ?? undefined}
        maxLength={question.maxLength ?? undefined}
        defaultValue={typeof value === 'string' ? value : ''}
        className={`${fieldClassName} resize-y${invalidStyles}`}
        {...common}
      />
    )
  } else if (question.inputType === 'SHORT_TEXT' || question.inputType === 'NUMBER' || question.inputType === 'DATE') {
    control = (
      <input
        id={question.id}
        name={fieldName}
        type={question.inputType === 'NUMBER' ? 'number' : question.inputType === 'DATE' ? 'date' : 'text'}
        required={effectivelyRequired}
        minLength={question.minLength ?? undefined}
        maxLength={question.maxLength ?? undefined}
        min={question.inputType === 'NUMBER' ? (question.minNumber ?? undefined) : undefined}
        max={question.inputType === 'NUMBER' ? (question.maxNumber ?? undefined) : undefined}
        step={question.inputType === 'NUMBER' ? (question.key === 'AFFECTED_EMPLOYEE_COUNT' ? 1 : 0.01) : undefined}
        defaultValue={typeof value === 'string' ? value : ''}
        className={`${fieldClassName}${invalidStyles}`}
        {...common}
      />
    )
  } else if (question.inputType === 'ORGANIZATION_LOCATION') {
    control = (
      <select
        id={question.id}
        name={fieldName}
        required={effectivelyRequired}
        defaultValue={typeof value === 'string' ? value : ''}
        className={`${fieldClassName}${invalidStyles}`}
        {...common}
      >
        <option value="">Kies een locatie</option>
        {locations.map((location) => (
          <option key={location.id} value={location.id}>{location.label}</option>
        ))}
      </select>
    )
  } else {
    const selectedValues = new Set(Array.isArray(value) ? value : typeof value === 'string' ? [value] : [])
    const options = question.inputType === 'BOOLEAN'
      ? [
          { id: 'true', label: 'Ja', value: 'true' },
          { id: 'false', label: 'Nee', value: 'false' },
        ]
      : question.options.map((option) => ({ id: option.id, label: option.label, value: option.id }))
    const isMulti = question.inputType === 'MULTI_SELECT'

    control = (
      <fieldset>
        <legend className="font-semibold text-brand-dark">{label}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {options.map((option) => {
            const checked = question.inputType === 'BOOLEAN'
              ? value === (option.value === 'true')
              : selectedValues.has(option.value)
            return (
              <label
                key={option.id}
                className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-control border bg-surface px-3 py-3${invalidStyles || ' border-border'}`}
              >
                <input
                  className="mt-1"
                  type={isMulti ? 'checkbox' : 'radio'}
                  name={fieldName}
                  value={option.value}
                  defaultChecked={checked}
                  required={effectivelyRequired && !isMulti}
                  data-invalid={Boolean(error)}
                  {...common}
                />
                <span>{option.label}</span>
              </label>
            )
          })}
        </div>
      </fieldset>
    )
  }

  return (
    <div>
      {!['BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT'].includes(question.inputType) && (
        <label htmlFor={question.id} className="font-semibold text-brand-dark">{label}</label>
      )}
      <p id={helpId} className="mt-2 text-sm text-text-secondary">{question.helpText ?? 'Vul in wat voor Uw situatie van toepassing is.'}</p>
      {control}
      <FieldError id={errorId} message={error} />
    </div>
  )
}
