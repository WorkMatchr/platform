'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { AssignmentActionState } from '@/app/opdrachten/actions'
import { FieldError, StatusMessage, fieldClassName } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import type { AssignmentEditView } from '@/lib/assignments/assignment-query-service'

export function AssignmentEditForm({
  action,
  assignment,
}: {
  action: (state: AssignmentActionState, formData: FormData) => Promise<AssignmentActionState>
  assignment: AssignmentEditView
}) {
  const [state, formAction, pending] = useActionState(action, {})
  const formRef = useRef<HTMLFormElement>(null)
  const value = (field: string, fallback: string) => typeof state.values?.[field] === 'string' ? state.values[field] : fallback
  const error = (field: string) => state.errors?.[field]?.[0]
  const invalid = (field: string) => Boolean(error(field))
  const inputClass = (field: string) => `${fieldClassName}${invalid(field) ? ' border-error ring-1 ring-error/30' : ''}`
  const formKey = state.values ? JSON.stringify(state.values) : `version-${assignment.version}`

  useEffect(() => {
    if (state.errors) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [state.errors, state.values])

  return (
    <form ref={formRef} key={formKey} action={formAction} className="space-y-7" noValidate>
      <input type="hidden" name="assignmentId" value={assignment.id} />
      <input type="hidden" name="expectedAssignmentVersion" value={assignment.version} />
      {state.message && <StatusMessage error>{state.message}</StatusMessage>}

      <div>
        <label htmlFor="title" className="font-semibold">Titel <span aria-hidden="true">*</span></label>
        <input id="title" name="title" required minLength={5} maxLength={120} defaultValue={value('title', assignment.title)} className={inputClass('title')} aria-invalid={invalid('title')} aria-describedby={invalid('title') ? 'title-error' : undefined} />
        <FieldError id="title-error" message={error('title')} />
      </div>
      <div>
        <label htmlFor="description" className="font-semibold">Omschrijving <span aria-hidden="true">*</span></label>
        <textarea id="description" name="description" required minLength={20} maxLength={7000} rows={12} defaultValue={value('description', assignment.description)} className={inputClass('description')} aria-invalid={invalid('description')} aria-describedby={invalid('description') ? 'description-error' : undefined} />
        <FieldError id="description-error" message={error('description')} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="employeeCount" className="font-semibold">Betrokken medewerkers <span className="font-normal text-text-secondary">(optioneel)</span></label>
          <input id="employeeCount" name="employeeCount" type="number" min="1" max="1000000" step="1" defaultValue={value('employeeCount', assignment.employeeCount?.toString() ?? '')} className={inputClass('employeeCount')} aria-invalid={invalid('employeeCount')} aria-describedby={invalid('employeeCount') ? 'employeeCount-error' : undefined} />
          <FieldError id="employeeCount-error" message={error('employeeCount')} />
        </div>
        <div>
          <label htmlFor="desiredStartDate" className="font-semibold">Gewenste startdatum <span className="font-normal text-text-secondary">(optioneel)</span></label>
          <input id="desiredStartDate" name="desiredStartDate" type="date" defaultValue={value('desiredStartDate', assignment.desiredStartDate ?? '')} className={inputClass('desiredStartDate')} aria-invalid={invalid('desiredStartDate')} aria-describedby={invalid('desiredStartDate') ? 'desiredStartDate-error' : undefined} />
          <FieldError id="desiredStartDate-error" message={error('desiredStartDate')} />
        </div>
      </div>
      <div>
        <label htmlFor="locationId" className="font-semibold">Locatie <span className="font-normal text-text-secondary">(optioneel bij volledig op afstand)</span></label>
        <select id="locationId" name="locationId" defaultValue={value('locationId', assignment.locationId ?? '')} className={inputClass('locationId')} aria-invalid={invalid('locationId')} aria-describedby={invalid('locationId') ? 'locationId-error' : undefined}>
          <option value="">Geen locatie gekozen</option>
          {assignment.locations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
        </select>
        <FieldError id="locationId-error" message={error('locationId')} />
      </div>
      <label className="flex min-h-11 items-start gap-3 rounded-control border border-border p-4">
        <input type="checkbox" name="allowsRemoteWork" className="mt-1" defaultChecked={typeof state.values?.allowsRemoteWork === 'boolean' ? state.values.allowsRemoteWork : assignment.allowsRemoteWork} />
        <span>Deze opdracht kan geheel of gedeeltelijk op afstand worden uitgevoerd.</span>
      </label>
      <p className="text-sm text-text-secondary">Wijzigingen gelden alleen voor het opdrachtconcept. De oorspronkelijke intake blijft ongewijzigd en bewaard.</p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <LinkButton href={`/opdrachten/${assignment.id}`} variant="outline">Annuleren</LinkButton>
        <Button type="submit" loading={pending}>Wijzigingen opslaan</Button>
      </div>
    </form>
  )
}
