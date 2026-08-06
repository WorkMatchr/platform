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
      <fieldset className="space-y-5 rounded-card border border-border p-5">
        <legend className="px-1 font-semibold">Locatie</legend>
        <div>
          <label htmlFor="locationType" className="font-semibold">Locatievorm</label>
          <select id="locationType" name="locationType" defaultValue={value('locationType', assignment.locationType)} className={inputClass('locationType')} aria-invalid={invalid('locationType')} aria-describedby={invalid('locationType') ? 'locationType-error' : 'locationType-help'}>
            <option value="REGISTERED">Bestaande organisatielocatie</option>
            <option value="OTHER">Andere locatie</option>
            <option value="MULTIPLE">Meerdere locaties</option>
            <option value="REMOTE">Volledig op afstand</option>
            <option value="UNKNOWN">Locatie nog niet bekend</option>
          </select>
          <p id="locationType-help" className="mt-1 text-sm text-text-secondary">Alleen de gegevens die bij de gekozen locatievorm horen worden opgeslagen.</p>
          <FieldError id="locationType-error" message={error('locationType')} />
        </div>
        <div>
        <label htmlFor="locationId" className="font-semibold">Bestaande organisatielocatie</label>
        <select id="locationId" name="locationId" defaultValue={value('locationId', assignment.locationId ?? '')} className={inputClass('locationId')} aria-invalid={invalid('locationId')} aria-describedby={invalid('locationId') ? 'locationId-error' : undefined}>
          <option value="">Geen locatie gekozen</option>
          {assignment.locations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
        </select>
        <FieldError id="locationId-error" message={error('locationId')} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="locationCity" className="font-semibold">Plaats <span className="font-normal text-text-secondary">(bij andere locatie)</span></label>
            <input id="locationCity" name="locationCity" maxLength={120} defaultValue={value('locationCity', assignment.locationCity ?? '')} className={inputClass('locationCity')} aria-invalid={invalid('locationCity')} aria-describedby={invalid('locationCity') ? 'locationCity-error' : undefined} />
            <FieldError id="locationCity-error" message={error('locationCity')} />
          </div>
          <div>
            <label htmlFor="locationRegion" className="font-semibold">Regio <span className="font-normal text-text-secondary">(optioneel)</span></label>
            <input id="locationRegion" name="locationRegion" maxLength={120} defaultValue={value('locationRegion', assignment.locationRegion ?? '')} className={inputClass('locationRegion')} aria-invalid={invalid('locationRegion')} aria-describedby={invalid('locationRegion') ? 'locationRegion-error' : undefined} />
            <FieldError id="locationRegion-error" message={error('locationRegion')} />
          </div>
        </div>
        <div>
          <label htmlFor="locationCount" className="font-semibold">Aantal locaties <span className="font-normal text-text-secondary">(optioneel bij meerdere locaties)</span></label>
          <input id="locationCount" name="locationCount" type="number" min="1" max="10000" defaultValue={value('locationCount', assignment.locationCount?.toString() ?? '')} className={inputClass('locationCount')} aria-invalid={invalid('locationCount')} aria-describedby={invalid('locationCount') ? 'locationCount-error' : undefined} />
          <FieldError id="locationCount-error" message={error('locationCount')} />
        </div>
        <div>
          <label htmlFor="locationDescription" className="font-semibold">Toelichting op de locatie <span className="font-normal text-text-secondary">(optioneel)</span></label>
          <textarea id="locationDescription" name="locationDescription" rows={3} maxLength={1000} defaultValue={value('locationDescription', assignment.locationDescription ?? '')} className={inputClass('locationDescription')} aria-invalid={invalid('locationDescription')} aria-describedby={invalid('locationDescription') ? 'locationDescription-error' : undefined} />
          <FieldError id="locationDescription-error" message={error('locationDescription')} />
        </div>
      </fieldset>
      <p className="text-sm text-text-secondary">Wijzigingen gelden alleen voor het opdrachtconcept. De oorspronkelijke intake blijft ongewijzigd en bewaard.</p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <LinkButton href={`/opdrachten/${assignment.id}`} variant="outline">Annuleren</LinkButton>
        <Button type="submit" loading={pending}>Wijzigingen opslaan</Button>
      </div>
    </form>
  )
}
