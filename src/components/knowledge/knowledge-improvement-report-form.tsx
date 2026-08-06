'use client'

import { useActionState } from 'react'
import { submitKnowledgeImprovementAction } from '@/app/kenniscentrum/verbetering-melden/[knowledgeItemId]/actions'
import {
  completeKnowledgeImprovementActionState,
  initialKnowledgeImprovementActionState,
} from '@/lib/knowledge/knowledge-improvement-action-state'
import type { KnowledgeImprovementActionState } from '@/lib/knowledge/knowledge-improvement-action-state'

const fieldClass = 'min-h-11 w-full rounded-control border border-border bg-surface px-3 text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary'

function FieldError({ errors, id }: { errors?: string[]; id: string }) {
  return errors?.length ? <p className="text-sm text-error" id={id}>{errors[0]}</p> : null
}

export function KnowledgeImprovementReportFormView({
  knowledgeItemId,
  rawState,
  action,
  pending = false,
}: {
  knowledgeItemId: string
  rawState?: Partial<KnowledgeImprovementActionState> | null
  action?: (formData: FormData) => void
  pending?: boolean
}) {
  const state = completeKnowledgeImprovementActionState(rawState)
  const fieldErrors = state?.fieldErrors ?? {}

  return (
    <form action={action} className="grid gap-5 rounded-card border border-border bg-surface p-5">
      <input name="knowledgeItemId" type="hidden" value={knowledgeItemId} />
      <label className="grid gap-1 font-semibold" htmlFor="reportType">Waar gaat uw melding over?
        <select aria-describedby="reportType-error" className={fieldClass} id="reportType" name="reportType" required>
          <option value="OUTDATED">Verouderde informatie</option>
          <option value="INCORRECT">Onjuiste informatie</option>
          <option value="INCOMPLETE">Onvolledige informatie</option>
          <option value="SOURCE_CHANGED">Een bron is gewijzigd</option>
          <option value="APPLICABILITY_UNCLEAR">Het toepassingsgebied is onduidelijk</option>
          <option value="OTHER">Overige inhoudelijke verbetering</option>
        </select>
        <FieldError errors={fieldErrors.reportType} id="reportType-error" />
      </label>
      <label className="grid gap-1 font-semibold" htmlFor="explanation">Toelichting
        <textarea aria-describedby="explanation-help explanation-error" className={`${fieldClass} min-h-32 py-3`} id="explanation" maxLength={1500} minLength={20} name="explanation" required />
        <span className="text-sm font-normal text-text-secondary" id="explanation-help">Beschrijf wat volgens u gecontroleerd of verbeterd moet worden. Deel geen persoonsgegevens.</span>
        <FieldError errors={fieldErrors.explanation} id="explanation-error" />
      </label>
      <label className="grid gap-1 font-semibold" htmlFor="proposedImprovement">Voorgestelde verbetering <span className="font-normal text-text-secondary">(optioneel)</span>
        <textarea aria-describedby="proposedImprovement-error" className={`${fieldClass} min-h-28 py-3`} id="proposedImprovement" maxLength={1500} name="proposedImprovement" />
        <FieldError errors={fieldErrors.proposedImprovement} id="proposedImprovement-error" />
      </label>
      <label className="grid gap-1 font-semibold" htmlFor="sourceReference">Bronverwijzing of URL <span className="font-normal text-text-secondary">(optioneel, aanbevolen)</span>
        <input aria-describedby="sourceReference-error" className={fieldClass} id="sourceReference" maxLength={1000} name="sourceReference" type="text" />
        <FieldError errors={fieldErrors.sourceReference} id="sourceReference-error" />
      </label>
      <FieldError errors={fieldErrors.knowledgeItemId} id="knowledgeItemId-error" />
      <p className="text-sm text-text-secondary">Uw melding wijzigt het kennisitem niet automatisch. Platformbeheer onderzoekt de bron, actualiteit en formulering.</p>
      <button className="min-h-11 justify-self-start rounded-control bg-brand-primary px-5 font-semibold text-white hover:bg-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:opacity-60" disabled={pending} type="submit">
        {pending ? 'Melding versturen…' : 'Meld een inhoudelijke verbetering'}
      </button>
      {state.message ? <p aria-live="polite" className={state.status === 'error' ? 'text-error' : 'text-success'}>{state.message}</p> : null}
    </form>
  )
}

export function KnowledgeImprovementReportForm({ knowledgeItemId }: { knowledgeItemId: string }) {
  const [state, action, pending] = useActionState(submitKnowledgeImprovementAction, initialKnowledgeImprovementActionState)
  return <KnowledgeImprovementReportFormView action={action} knowledgeItemId={knowledgeItemId} pending={pending} rawState={state} />
}
