'use client'

import { useActionState } from 'react'
import { handleKnowledgeImprovementAction, initialKnowledgeImprovementHandlingState } from '@/app/platformbeheer/kennisbank/meldingen/actions'
import { normalizeKnowledgeActionState } from '@/lib/knowledge/knowledge-action-state'

export function KnowledgeImprovementHandlingForm({ reportId, reviewTaskId, version }: { reportId: string; reviewTaskId: string; version: number }) {
  const [rawState, action, pending] = useActionState(handleKnowledgeImprovementAction, initialKnowledgeImprovementHandlingState)
  const state = normalizeKnowledgeActionState(rawState)
  return (
    <form action={action} className="grid min-w-64 gap-2">
      <input name="reportId" type="hidden" value={reportId} />
      <input name="reviewTaskId" type="hidden" value={reviewTaskId} />
      <input name="expectedVersion" type="hidden" value={version} />
      <label className="text-xs font-semibold" htmlFor={`status-${reportId}`}>Afhandeling
        <select className="mt-1 min-h-10 w-full rounded-control border border-border bg-surface px-3 text-sm" id={`status-${reportId}`} name="status">
          <option value="UNDER_INVESTIGATION">In onderzoek</option>
          <option value="PROCESSED">Verwerkt</option>
          <option value="REJECTED">Afgewezen</option>
          <option value="DUPLICATE">Dubbel</option>
        </select>
      </label>
      <label className="text-xs font-semibold" htmlFor={`resolution-${reportId}`}>Toelichting bij afsluiten
        <textarea aria-describedby={`resolution-error-${reportId}`} className="mt-1 min-h-20 w-full rounded-control border border-border bg-surface p-3 text-sm" id={`resolution-${reportId}`} maxLength={1500} name="resolution" />
      </label>
      {state.fieldErrors.resolution?.[0] ? <p className="text-xs text-error" id={`resolution-error-${reportId}`}>{state.fieldErrors.resolution[0]}</p> : null}
      <button className="min-h-10 rounded-control border border-brand-primary px-3 text-sm font-semibold text-brand-primary hover:bg-brand-primary-subtle" disabled={pending} type="submit">Afhandeling vastleggen</button>
      {state.message ? <p aria-live="polite" className={`text-xs ${state.status === 'error' ? 'text-error' : 'text-success'}`}>{state.message}</p> : null}
    </form>
  )
}

