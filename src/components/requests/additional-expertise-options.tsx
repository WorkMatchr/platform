'use client'

import { useId, useState } from 'react'
import { directAdditionalExpertises } from '@/lib/requests/additional-expertise'
import { requestedExpertiseOptions, type ExpertiseId } from '@/lib/requests/simple-advice-contract'
import { additionalExpertiseIntroduction, additionalExpertiseReason } from '@/content/additional-expertise-context'

export function AdditionalExpertiseOptions({ primary, selected, onChange }: {
  primary: ExpertiseId
  selected: readonly ExpertiseId[]
  onChange: (values: ExpertiseId[]) => void
}) {
  const id = useId()
  const [limitReached, setLimitReached] = useState(false)
  const intro = additionalExpertiseIntroduction(primary)
  const primaryLabel = requestedExpertiseOptions.find(option => option.value === primary)!.label
  return <fieldset className="mt-4 border-t border-border pt-4" aria-describedby={id + '-help'}>
    <legend className="pt-4 font-semibold text-brand-dark">{intro.title}</legend>
    <p className="mt-2">{intro.text}</p>
    <div className="mt-3 space-y-3">
      {directAdditionalExpertises(primary).map(expertise => {
        const label = requestedExpertiseOptions.find(option => option.value === expertise)!.label
        return <div key={expertise}>
          <label className="flex min-h-11 cursor-pointer items-start gap-2 font-medium text-brand-dark">
            <input type="checkbox" className="mt-1 size-4 shrink-0 accent-brand-primary" checked={selected.includes(expertise)} aria-describedby={id + '-' + expertise}
              onChange={event => {
                if (event.target.checked && selected.length >= 2) { setLimitReached(true); return }
                setLimitReached(false)
                onChange(event.target.checked ? [...selected, expertise] : selected.filter(value => value !== expertise))
              }} />
            {label}
          </label>
          <p id={id + '-' + expertise} className="ml-6 text-sm text-text-secondary">{additionalExpertiseReason(primary, expertise)}</p>
        </div>
      })}
    </div>
    <p id={id + '-help'} className="mt-3 text-sm">Uw eerste keuze blijft {primaryLabel}. U kunt maximaal twee aanvullende deskundigheden selecteren.</p>
    {limitReached && <p role="alert" className="mt-2 text-sm text-error">U kunt maximaal twee aanvullende deskundigheden selecteren.</p>}
  </fieldset>
}
