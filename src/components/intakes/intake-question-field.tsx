import type { IntakeFormValue } from '@/app/hulpvragen/actions'
import { FieldError, fieldClassName } from '@/components/auth/auth-shell'
import { IntakeClassificationClarificationField } from '@/components/intakes/intake-classification-clarification-field'
import type { IntakeQuestionView } from '@/lib/intakes/intake-query-service'
import type { IntakeClassification } from '@/lib/intakes/intake-classification'

type IntakeQuestionFieldProps = {
  question: IntakeQuestionView
  locations: Array<{ id: string; label: string }>
  submittedValue?: IntakeFormValue
  error?: string
  effectivelyRequired?: boolean
  classification?: IntakeClassification
  clarificationOptionId?: string
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
  classification,
  clarificationOptionId,
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
      <>
        {locations.length === 0 && (
          <p className="mt-3 rounded-control border border-warning/40 bg-warning/10 p-3 text-sm text-brand-dark" role="status">
            Uw organisatie heeft nog geen actieve locatie. Ga terug en kies een andere locatievorm, of beheer eerst uw organisatielocaties.
          </p>
        )}
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
      </>
    )
  } else {
    const selectedValues = new Set(Array.isArray(value) ? value : typeof value === 'string' ? [value] : [])
    if (
      question.key === 'CONFIRMED_HELP_CATEGORY' &&
      selectedValues.size === 0 &&
      classification?.outcome === 'DIRECT_PROPOSAL'
    ) {
      const suggestedOption = question.options.find((option) => option.value === classification.category)
      if (suggestedOption) selectedValues.add(suggestedOption.id)
    }
    const options = question.inputType === 'BOOLEAN'
      ? [
          { id: 'true', label: 'Ja', value: 'true' },
          { id: 'false', label: 'Nee', value: 'false' },
        ]
      : question.options.map((option) => ({ id: option.id, label: option.label, value: option.id }))
    const optionControls = options.map((option) => {
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
            type={question.inputType === 'MULTI_SELECT' ? 'checkbox' : 'radio'}
            name={fieldName}
            value={option.value}
            defaultChecked={checked}
            required={effectivelyRequired && question.inputType !== 'MULTI_SELECT'}
            data-invalid={Boolean(error)}
            {...common}
          />
          <span>{option.label}</span>
        </label>
      )
    })

    const selectedCategoryOptionId = [...selectedValues][0]
    const shouldRenderClarification =
      classification?.outcome === 'TARGETED_CLARIFICATION' &&
      (selectedValues.size === 0 || Boolean(clarificationOptionId))
    control = question.key === 'CONFIRMED_HELP_CATEGORY' && shouldRenderClarification ? (
      <IntakeClassificationClarificationField
        question={question}
        classification={classification}
        initialCategoryOptionId={selectedCategoryOptionId}
        initialClarificationOptionId={clarificationOptionId}
        error={error}
        effectivelyRequired={effectivelyRequired}
      />
    ) : question.key === 'CONFIRMED_HELP_CATEGORY' ? (
      <fieldset>
        <legend className="font-semibold text-brand-dark">{label}</legend>
        {classification?.outcome === 'DIRECT_PROPOSAL' && (
          <div className="mt-3 rounded-control border border-brand-primary/30 bg-brand-primary-subtle p-4">
            <p className="text-sm text-text-secondary">Dit lijkt de meest passende categorie voor uw hulpvraag:</p>
            <p className="mt-1 font-bold text-brand-dark">
              {question.options.find((option) => option.value === classification.category)?.label}
            </p>
          </div>
        )}
        {(!classification || classification.outcome === 'GENERIC_FALLBACK') && (
          <div className="mt-3 rounded-control border border-border bg-surface-subtle p-4 text-text-secondary">
            <p>We kunnen nog geen duidelijke categorie bepalen.</p>
            <p className="mt-1">Kies hieronder wat het beste past, of ga verder met &ldquo;Dat weet ik nog niet&rdquo;.</p>
          </div>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{optionControls}</div>
      </fieldset>
    ) : (
      <fieldset>
        <legend className="font-semibold text-brand-dark">{label}</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">{optionControls}</div>
      </fieldset>
    )
  }

  return (
    <div>
      {!['BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT'].includes(question.inputType) && (
        <label htmlFor={question.id} className="font-semibold text-brand-dark">{label}</label>
      )}
      <p id={helpId} className="mt-2 text-sm text-text-secondary">
        {question.key === 'CONFIRMED_HELP_CATEGORY' && classification?.outcome === 'TARGETED_CLARIFICATION'
          ? 'Kies het antwoord dat het beste bij uw situatie past. Daarna kunt u de categorie controleren of corrigeren.'
          : question.helpText ?? 'Vul in wat voor uw situatie van toepassing is.'}
      </p>
      {control}
      <FieldError id={errorId} message={error} />
    </div>
  )
}
