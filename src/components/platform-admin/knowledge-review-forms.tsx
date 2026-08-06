'use client'

import { useActionState, type MouseEvent } from 'react'
import {
  addKnowledgeSupportingSourceAction,
  decideKnowledgeReviewAction,
  initialKnowledgeReviewActionState,
  withdrawKnowledgeReviewApprovalAction,
  withdrawKnowledgeSupportingSourceAction,
} from '@/app/platformbeheer/kennisbank/actions'
import { normalizeKnowledgeActionState } from '@/lib/knowledge/knowledge-action-state'

const fieldClass = 'min-h-10 w-full rounded-control border border-border bg-surface px-3 text-sm text-brand-dark focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30'
const textareaClass = `${fieldClass} min-h-28 py-3`
const primaryButton = 'inline-flex min-h-11 items-center justify-center rounded-control bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2'
const secondaryButton = 'inline-flex min-h-11 items-center justify-center rounded-control border border-brand-primary px-4 text-sm font-semibold text-brand-primary hover:bg-brand-primary-subtle focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2'
const dangerButton = 'inline-flex min-h-11 items-center justify-center rounded-control border border-error px-4 text-sm font-semibold text-error hover:bg-error/5 focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2'

function FieldError({ errors, id }: { errors?: string[]; id: string }) {
  return errors?.length ? <p className="text-sm text-error" id={id}>{errors[0]}</p> : null
}

function Feedback({ status, message }: { status: 'idle' | 'success' | 'error'; message: string | null }) {
  return message ? (
    <p aria-live="polite" className={`rounded-control border p-3 text-sm ${status === 'error' ? 'border-error text-error' : 'border-success text-success'}`}>
      {message}
    </p>
  ) : null
}

function confirmDecision(event: MouseEvent<HTMLButtonElement>, message: string) {
  if (!window.confirm(message)) event.preventDefault()
}

export type KnowledgeReviewDraftValues = {
  id: string
  version: number
  proposedStatement: string | null
  substantiveNotes: string | null
  practicalNuance: string | null
  applicabilityConditions: string | null
  exceptions: string | null
  editorialNote: string | null
  proposedAccessTier: string | null
  nextReviewAt: Date | null
}

export function KnowledgeReviewEditorialForm({ task, disabled }: { task: KnowledgeReviewDraftValues; disabled: boolean }) {
  const [rawDecisionState, decisionAction, decisionPending] = useActionState(decideKnowledgeReviewAction, initialKnowledgeReviewActionState)
  const decisionState = normalizeKnowledgeActionState(rawDecisionState)
  return (
    <form className="grid gap-5">
      <input name="reviewTaskId" type="hidden" value={task.id} />
      <input name="expectedVersion" type="hidden" value={task.version} />
      {disabled ? null : (
        <div className="grid gap-4 rounded-card border border-border bg-background p-4">
          <label className="grid gap-1 text-sm font-semibold" htmlFor="decisionReason">Korte toelichting bij uw beslissing
            <textarea aria-describedby="reason-error" className={textareaClass} id="decisionReason" maxLength={1500} name="reason" />
            <FieldError errors={decisionState.fieldErrors.reason} id="reason-error" />
          </label>
          <label className="grid max-w-sm gap-1 text-sm font-semibold" htmlFor="deferredUntil">Opnieuw controleren op
            <input className={fieldClass} id="deferredUntil" name="deferredUntil" type="date" />
          </label>
          <label className="flex items-start gap-2 text-sm" htmlFor="confirmed">
            <input className="mt-1" id="confirmed" name="confirmed" type="checkbox" />
            <span>Ik bevestig dat de concrete uitzondering voldoende is afgehandeld. Dit publiceert niets automatisch.</span>
          </label>
          <div className="flex flex-wrap gap-3">
            <button className={secondaryButton} disabled={decisionPending} formAction={decisionAction} name="operation" type="submit" value="DEFER">Later beoordelen</button>
            <button className={secondaryButton} disabled={decisionPending} formAction={decisionAction} name="operation" type="submit" value="CHANGES_REQUIRED">Uitzondering blijft open</button>
            <button className={dangerButton} disabled={decisionPending} formAction={decisionAction} name="operation" onClick={(event) => confirmDecision(event, 'Weet u zeker dat u dit kennisitem wilt afwijzen? De historie blijft bewaard.')} type="submit" value="REJECT">Kennisitem afwijzen</button>
            <button className={primaryButton} disabled={decisionPending} formAction={decisionAction} name="operation" onClick={(event) => confirmDecision(event, 'Bevestigt u dat de concrete uitzondering is afgehandeld? Dit publiceert het kennisitem niet.')} type="submit" value="CONTENT_APPROVE">Uitzondering afhandelen</button>
          </div>
        </div>
      )}
      <Feedback status={decisionState.status} message={decisionState.message} />
    </form>
  )
}

export function KnowledgeSupportingSourceForm({ reviewTaskId, version, sourceOptions, disabled }: {
  reviewTaskId: string
  version: number
  disabled: boolean
  sourceOptions: Array<{ id: string; versionLabel: string; source: { code: string; title: string } }>
}) {
  const [rawState, action, pending] = useActionState(addKnowledgeSupportingSourceAction, initialKnowledgeReviewActionState)
  const state = normalizeKnowledgeActionState(rawState)
  if (disabled) return null
  return (
    <form action={action} className="grid gap-4 rounded-card border border-border bg-surface p-4">
      <input name="reviewTaskId" type="hidden" value={reviewTaskId} />
      <input name="expectedVersion" type="hidden" value={version} />
      <label className="grid gap-1 text-sm font-semibold" htmlFor="sourceVersionId">Bestaande kennisbron koppelen (optioneel)
        <select className={fieldClass} id="sourceVersionId" name="sourceVersionId">
          <option value="">Nieuwe bronreferentie invoeren</option>
          {sourceOptions.map((option) => <option key={option.id} value={option.id}>{option.source.code} — {option.source.title} ({option.versionLabel})</option>)}
        </select>
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold" htmlFor="sourceType">Bronsoort
          <select className={fieldClass} defaultValue="PROFESSIONAL_GUIDANCE" id="sourceType" name="sourceType">
            <option value="LEGISLATION">Wetgeving</option><option value="REGULATION">Regelgeving</option>
            <option value="INSPECTORATE_GUIDANCE">Toezichthouder</option><option value="ARBOCATALOGUE">Arbocatalogus</option>
            <option value="STANDARD">Norm</option><option value="RESEARCH">Onderzoek</option>
            <option value="PROFESSIONAL_GUIDANCE">Vakinhoudelijke richtlijn</option><option value="CASE_LAW">Rechtspraak</option>
            <option value="INTERNAL_EXPERTISE">Interne expertise</option><option value="OTHER">Andere bron</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="authorityLevel">Gezag van de bron
          <select className={fieldClass} defaultValue="UNKNOWN" id="authorityLevel" name="authorityLevel">
            <option value="UNKNOWN">Nog niet beoordeeld</option><option value="PRIMARY_LEGAL">Primaire juridische bron</option>
            <option value="OFFICIAL_GUIDANCE">Officiële uitleg</option><option value="CONSENSUS_STANDARD">Breed gedragen norm</option>
            <option value="PROFESSIONAL_GUIDANCE">Vakinhoudelijke richtlijn</option><option value="RESEARCH">Onderzoek</option>
            <option value="INTERNAL">Interne bron</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="sourceTitle">Titel
          <input aria-describedby="title-error" className={fieldClass} id="sourceTitle" maxLength={300} name="title" />
          <FieldError errors={state.fieldErrors.title} id="title-error" />
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="publisher">Organisatie of uitgever
          <input className={fieldClass} id="publisher" maxLength={200} name="publisher" />
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="urlOrReference">URL of logische bronverwijzing
          <input className={fieldClass} id="urlOrReference" maxLength={1000} name="urlOrReference" type="text" />
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="sourceFamily">Bronfamilie
          <input aria-describedby="sourceFamily-error" className={fieldClass} id="sourceFamily" maxLength={120} name="sourceFamily" />
          <FieldError errors={state.fieldErrors.sourceFamily} id="sourceFamily-error" />
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="publicationDate">Publicatiedatum
          <input className={fieldClass} id="publicationDate" name="publicationDate" type="date" />
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="checkedAt">Gecontroleerd op
          <input className={fieldClass} id="checkedAt" name="checkedAt" type="date" />
        </label>
        <label className="grid gap-1 text-sm font-semibold" htmlFor="supportType">Wijze van ondersteuning
          <select className={fieldClass} defaultValue="DIRECT_SUPPORT" id="supportType" name="supportType">
            <option value="DIRECT_SUPPORT">Ondersteunt</option><option value="PARTIAL_SUPPORT">Ondersteunt gedeeltelijk</option>
            <option value="CONTRADICTS">Spreekt tegen</option><option value="SUPERSEDES">Vervangt historische informatie</option>
            <option value="CONTEXT">Geeft context</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm" htmlFor="isPrimary">
          <input id="isPrimary" name="isPrimary" type="checkbox" /> Primaire bron voor deze controle
        </label>
      </div>
      <p className="text-xs text-text-secondary">Een geregistreerde bron wordt niet automatisch als betrouwbaar of voldoende voor publicatie aangemerkt.</p>
      <button className={`${secondaryButton} justify-self-start`} disabled={pending} type="submit">Ondersteunende bron registreren</button>
      <Feedback status={state.status} message={state.message} />
    </form>
  )
}

export function KnowledgeSourceWithdrawalButton({ reviewTaskId, referenceId, version }: { reviewTaskId: string; referenceId: string; version: number }) {
  return (
    <form action={withdrawKnowledgeSupportingSourceAction}>
      <input name="reviewTaskId" type="hidden" value={reviewTaskId} />
      <input name="referenceId" type="hidden" value={referenceId} />
      <input name="expectedVersion" type="hidden" value={version} />
      <button className="text-sm font-semibold text-error underline-offset-4 hover:underline" type="submit">Bronverwijzing intrekken</button>
    </form>
  )
}

export function KnowledgeApprovalWithdrawalForm({ reviewTaskId, version }: { reviewTaskId: string; version: number }) {
  const [rawState, action, pending] = useActionState(withdrawKnowledgeReviewApprovalAction, initialKnowledgeReviewActionState)
  const state = normalizeKnowledgeActionState(rawState)
  return (
    <form action={action} className="grid gap-3 rounded-card border border-error/40 bg-surface p-4">
      <input name="reviewTaskId" type="hidden" value={reviewTaskId} />
      <input name="expectedVersion" type="hidden" value={version} />
      <label className="grid gap-1 text-sm font-semibold" htmlFor="withdrawalReason">Reden voor intrekken
        <textarea aria-describedby="withdrawalReason-error" className={textareaClass} id="withdrawalReason" maxLength={1500} minLength={5} name="reason" required />
        <FieldError errors={state.fieldErrors.reason} id="withdrawalReason-error" />
      </label>
      <label className="flex items-start gap-2 text-sm" htmlFor="withdrawalConfirmed">
        <input id="withdrawalConfirmed" name="confirmed" required type="checkbox" />
        <span>Ik bevestig dat de kenniscontrole wordt heropend. De eerdere beslissing blijft zichtbaar in de historie.</span>
      </label>
      <button className={`${dangerButton} justify-self-start`} disabled={pending} onClick={(event) => confirmDecision(event, 'Wilt u de broncontrole intrekken en het kennisitem opnieuw laten controleren?')} type="submit">Controle intrekken</button>
      <Feedback status={state.status} message={state.message} />
    </form>
  )
}
