import { StatusMessage } from '@/components/auth/auth-shell'
import type { ProviderActionState } from '@/app/aanbiedersdossier/actions'

const formatter = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })

export function ProviderFormFeedback({ state, dirty }: { state: ProviderActionState; dirty: boolean }) {
  return (
    <div aria-live="polite" className="space-y-2">
      {state.message && <StatusMessage error={!state.success}>{state.message}</StatusMessage>}
      {state.savedAt && <p className="text-sm text-text-secondary">Laatst opgeslagen: {formatter.format(new Date(state.savedAt))}</p>}
      {dirty && <p className="text-sm font-semibold text-warning">U heeft niet-opgeslagen wijzigingen.</p>}
    </div>
  )
}
