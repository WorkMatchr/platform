'use client'

import { fieldClassName } from '@/components/auth/auth-shell'
import { situationExtraOptions, topicSituationOptions, toggleTopicSituation, type TopicSituations } from '@/lib/requests/topic-situations'

export function TopicSituationOptions({ value, onChange, error }: {
  value: TopicSituations
  onChange: (value: TopicSituations) => void
  error?: string
}) {
  const cards = (options: Record<string, string>) => Object.entries(options).map(([code, label]) => <label key={code}
    className={`flex min-h-14 min-w-0 cursor-pointer items-start gap-3 rounded-card border p-3 text-sm font-medium text-brand-dark focus-within:ring-2 focus-within:ring-brand-primary focus-within:ring-offset-2 ${value.selected.includes(code) ? 'border-brand-primary bg-brand-primary-subtle' : 'border-border bg-surface hover:border-brand-primary'}`}>
    <input type="checkbox" name="topicSituation" value={code} checked={value.selected.includes(code)}
      className="mt-0.5 size-4 shrink-0 accent-brand-primary" aria-describedby={error ? 'topicSituations-help topicSituations-error' : 'topicSituations-help'}
      onChange={() => onChange(toggleTopicSituation(value, code))} />
    <span className="min-w-0 break-words">{label}</span>
  </label>)
  return <fieldset id="topicSituations" tabIndex={-1} aria-invalid={Boolean(error)} aria-describedby={error ? 'topicSituations-help topicSituations-error' : 'topicSituations-help'}>
    <legend className="font-semibold text-brand-dark">Welke situaties herkent u?</legend>
    <p id="topicSituations-help" className="mt-2 text-sm text-text-secondary">Kies één of meer situaties. Dit helpt u uw vraag te beschrijven; het is geen beoordeling van risico’s.</p>
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2" data-situation-options="thematic">{cards(topicSituationOptions[value.topic])}</div>
    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2" data-situation-options="extra">{cards(situationExtraOptions)}</div>
    {value.selected.includes('OTHER') && <div className="mt-4">
      <label className="mb-2 block font-semibold" htmlFor="topicSituationOther">Licht uw andere situatie toe</label>
      <textarea id="topicSituationOther" value={value.otherText} onChange={event => onChange({ ...value, otherText: event.target.value })}
        className={fieldClassName} rows={3} maxLength={500} aria-describedby="topicSituationOther-help" />
      <p id="topicSituationOther-help" className="mt-1 text-sm text-text-secondary">Noem geen namen, medische gegevens of andere gevoelige persoonsgegevens.</p>
    </div>}
    {error && <p id="topicSituations-error" role="alert" className="mt-2 text-sm text-error">{error}</p>}
  </fieldset>
}
