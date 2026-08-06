'use client'

import { useActionState, useEffect, useRef } from 'react'
import type { RequestPublicationActionState } from '@/app/aanvragen/actions'
import {
  FieldError,
  StatusMessage,
  fieldClassName,
} from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { requestStartLabels } from '@/lib/requests/request-contract'

type RequestPublicationPreview = Readonly<{
  adviceDossierId: string
  dossierCode: string
  publicSummary: string
  expertise: Readonly<{
    primary: string
    additional: readonly string[]
    possible: readonly string[]
  }>
  organization: Readonly<{
    name: string
    contactName: string
    email: string
    phone: string
    region: string
    sector: string
  }>
  publicationRestriction: Readonly<{
    blocked: boolean
    relevantWithdrawalCount: number
    threshold: number
    windowMonths: number
  }>
}>

export function RequestPublicationForm({
  action,
  contactAction,
  contactResult,
  preview,
}: {
  action: (
    state: RequestPublicationActionState,
    formData: FormData,
  ) => Promise<RequestPublicationActionState>
  contactAction: (formData: FormData) => Promise<void>
  contactResult: 'verzonden' | 'fout' | null
  preview: RequestPublicationPreview
}) {
  const [state, formAction, pending] = useActionState(action, {})
  const formRef = useRef<HTMLFormElement>(null)
  const error = (field: string) => state.errors?.[field]?.[0]
  const invalid = (field: string) => Boolean(error(field))
  const inputClass = (field: string) =>
    `${fieldClassName}${invalid(field) ? ' border-error ring-1 ring-error/30 focus:border-error focus:ring-error/30' : ''}`
  const value = (field: 'publicSummary' | 'notes', fallback: string) =>
    state.values?.[field] ?? fallback
  const selectedStart =
    state.values?.requestedStart ?? 'IN_CONSULTATION'
  const formKey = state.values
    ? JSON.stringify(state.values)
    : preview.adviceDossierId

  useEffect(() => {
    if (!state.errors) return
    formRef.current
      ?.querySelector<HTMLElement>(
        '[aria-invalid="true"], [data-invalid="true"]',
      )
      ?.focus()
  }, [state.errors, state.values])

  return (
    <form
      ref={formRef}
      key={formKey}
      action={formAction}
      className="space-y-6"
      noValidate
    >
      <input
        type="hidden"
        name="adviceDossierId"
        value={preview.adviceDossierId}
      />
      {state.message ? (
        <StatusMessage error>{state.message}</StatusMessage>
      ) : null}

      <section className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <p className="text-sm font-semibold text-brand-primary">
          Adviesdossier {preview.dossierCode}
        </p>
        <h2 className="mt-1 text-xl font-bold text-brand-dark">
          Aanbevolen deskundigheid
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm font-semibold text-text-secondary">
              Primair
            </dt>
            <dd className="mt-1 font-semibold text-brand-dark">
              {preview.expertise.primary}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-text-secondary">
              Aanvullend
            </dt>
            <dd className="mt-1 text-brand-dark">
              {preview.expertise.additional.length > 0
                ? preview.expertise.additional.join(', ')
                : 'Geen aanvullende deskundigheid'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-text-secondary">
              Mogelijk
            </dt>
            <dd className="mt-1 text-brand-dark">
              {preview.expertise.possible.length > 0
                ? preview.expertise.possible.join(', ')
                : 'Geen mogelijke aanvullende deskundigheid'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-xl font-bold text-brand-dark">
          Controleer uw opdracht
        </h2>
        <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {[
            ['Bedrijfsnaam', preview.organization.name],
            ['Contactpersoon', preview.organization.contactName],
            ['E-mailadres', preview.organization.email],
            ['Telefoon', preview.organization.phone],
            ['Regio', preview.organization.region],
            ['Branche', preview.organization.sector],
          ].map(([label, content]) => (
            <div key={label} className="min-w-0">
              <dt className="text-sm font-semibold text-text-secondary">
                {label}
              </dt>
              <dd className="mt-1 break-words text-brand-dark">
                {content}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-xl font-bold text-brand-dark">
          Omschrijving opdracht
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          De bevestigde samenvatting uit uw Adviesdossier is
          overgenomen. U kunt deze voor publicatie aanpassen.
        </p>
        <label htmlFor="publicSummary" className="sr-only">
          Omschrijving opdracht
        </label>
        <textarea
          id="publicSummary"
          name="publicSummary"
          required
          minLength={20}
          maxLength={4000}
          rows={7}
          defaultValue={value(
            'publicSummary',
            preview.publicSummary,
          )}
          className={`mt-4 ${inputClass('publicSummary')}`}
          aria-invalid={invalid('publicSummary')}
          aria-describedby={
            invalid('publicSummary')
              ? 'publicSummary-error'
              : undefined
          }
        />
        <FieldError
          id="publicSummary-error"
          message={error('publicSummary')}
        />
      </section>

      <fieldset
        className="rounded-card border border-border bg-surface p-5 sm:p-6"
        aria-describedby={
          invalid('requestedStart')
            ? 'requestedStart-error'
            : undefined
        }
      >
        <legend className="px-1 text-xl font-bold text-brand-dark">
          Planning
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {Object.entries(requestStartLabels).map(([code, label]) => (
            <label
              key={code}
              className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-control border bg-surface px-4 py-3 ${
                invalid('requestedStart')
                  ? 'border-error ring-1 ring-error/30'
                  : 'border-border'
              }`}
            >
              <input
                type="radio"
                name="requestedStart"
                value={code}
                defaultChecked={selectedStart === code}
                data-invalid={
                  invalid('requestedStart') ? 'true' : undefined
                }
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <FieldError
          id="requestedStart-error"
          message={error('requestedStart')}
        />
      </fieldset>

      <section className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <h2 className="text-xl font-bold text-brand-dark">
          Extra opmerkingen
        </h2>
        <label htmlFor="notes" className="sr-only">
          Extra opmerkingen
        </label>
        <textarea
          id="notes"
          name="notes"
          maxLength={2000}
          rows={4}
          defaultValue={value('notes', '')}
          className={`mt-4 ${inputClass('notes')}`}
          aria-invalid={invalid('notes')}
          aria-describedby={
            invalid('notes') ? 'notes-error' : undefined
          }
        />
        <FieldError id="notes-error" message={error('notes')} />
      </section>

      <aside className="rounded-card border border-info-border bg-info-subtle p-5 text-sm text-brand-dark">
        <h2 className="font-bold">Goed om te weten</h2>
        <p className="mt-2">
          Na publicatie wordt uw opdracht beschikbaar gesteld aan
          professionals met passende deskundigheid.
        </p>
        <p className="mt-2">
          Professionals zien uitsluitend de informatie die nodig is om
          te beoordelen of zij een offerte willen uitbrengen. Uw
          volledige Adviesdossier wordt niet automatisch gedeeld.
        </p>
      </aside>

      {preview.publicationRestriction.blocked ? (
        <section className="rounded-card border border-warning-border bg-warning-subtle p-5 sm:p-6">
          <h2 className="text-xl font-bold text-brand-dark">
            Neem eerst contact op met WorkMatchr
          </h2>
          <p className="mt-2 text-text-secondary">
            U heeft in de afgelopen {preview.publicationRestriction.windowMonths} maanden{' '}
            {preview.publicationRestriction.threshold} opdrachten ingetrokken nadat professionals zich hadden aangemeld. Neem contact op met WorkMatchr voordat u een nieuwe opdracht publiceert.
          </p>
          {contactResult === 'verzonden' ? (
            <StatusMessage>
              Uw verzoek is naar WorkMatchr gestuurd. De opdracht is nog niet gepubliceerd.
            </StatusMessage>
          ) : contactResult === 'fout' ? (
            <StatusMessage error>
              Het verzoek kon niet veilig worden verstuurd. Uw opdrachtgegevens zijn bewaard; probeer het opnieuw.
            </StatusMessage>
          ) : null}
          <label className="mt-4 block font-semibold text-brand-dark" htmlFor="contactExplanation">
            Licht toe waarom u een nieuwe opdracht wilt publiceren
          </label>
          <textarea
            id="contactExplanation"
            name="contactExplanation"
            required
            minLength={20}
            maxLength={2000}
            rows={5}
            className={`mt-2 ${fieldClassName}`}
          />
          <Button
            className="mt-4"
            type="submit"
            formAction={contactAction}
            formNoValidate
          >
            Verzoek naar WorkMatchr sturen
          </Button>
        </section>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <LinkButton
          href={`/adviesdossiers/${preview.adviceDossierId}`}
          variant="outline"
        >
          Terug naar Adviesdossier
        </LinkButton>
        {!preview.publicationRestriction.blocked ? (
          <Button type="submit" loading={pending}>
            Publiceer opdracht
          </Button>
        ) : null}
      </div>
    </form>
  )
}
