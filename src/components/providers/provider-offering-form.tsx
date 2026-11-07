'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { providerDeliveryModeLabels } from '@/lib/providers/provider-dossier-presentation'
import { catalogRow, offeringChanges, type Offering, type OfferingRow, type OfferingValues } from '@/lib/providers/provider-offering'

const field = 'block mt-1 w-full min-w-0 max-w-full rounded-control border border-border bg-surface p-2'
const modes = ['ON_SITE', 'HYBRID', 'REMOTE'] as const
type Save = (profileId: string, input: unknown) => Promise<{ data?: Offering; error?: string }>

export function ProviderOfferingForm({ initial, save }: { initial: Offering; save: Save }) {
  const [base, setBase] = useState(initial)
  const [rows, setRows] = useState(initial.rows)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const update = (key: string, patch: Partial<OfferingValues>) => {
    setRows(current => current.map(row => row.key === key ? { ...row, ...patch } : row))
    setError('')
    setMessage('')
  }
  const submit = () => {
    setError('')
    setMessage('')
    const changes = offeringChanges(base.rows, rows)
    if (!changes.length) { setMessage('Er zijn geen wijzigingen om op te slaan.'); return }
    if (changes.some(row => row.kind === 'service' && row.selected && !row.termId && !row.specialismId)) {
      setError('Koppel eerst een dienst voordat u het bestaande specialisme weghaalt.')
      return
    }
    const missingMode = changes.find(row => row.kind === 'service' && row.selected && !row.modes.length)
    if (missingMode) {
      const row = rows.find(item => item.selected && item.kind === 'service' && item.recordId === missingMode.recordId && item.termId === missingMode.termId && !item.modes.length)
      setError('Kies ten minste één leveringsvorm voor ' + (row?.label ?? 'de dienst') + '.')
      document.getElementById(row?.key + '-first-mode')?.focus()
      return
    }
    startTransition(async () => {
      try {
        const result = await save(base.profileId, { version: base.version, changes })
        if (result.data) {
          setBase(result.data)
          setRows(result.data.rows)
          setMessage('Uw dienstverlening en werkgebied zijn opgeslagen.')
        } else setError(result.error ?? 'Opslaan is niet gelukt.')
      } catch {
        setError('Opslaan kon niet worden bevestigd. Controleer de laatste stand door het profiel opnieuw te openen.')
      }
    })
  }

  function renderRow(row: OfferingRow, editable: boolean) {
    const patch = (values: Partial<OfferingValues>) => update(row.key, values)
    const original = base.rows.find(item => item.key === row.key)
    return <div key={row.key} id={row.key + '-row'} className="min-w-0 rounded-control border border-border p-3">
      <label className="flex min-h-11 items-center gap-3 font-semibold">
        <input type="checkbox" checked={row.selected} onChange={event => patch({ selected: event.target.checked })} />
        <span className="break-words">{row.label}</span>
      </label>
      {row.recordId && !original?.selected && <p className="text-sm text-text-secondary">Gearchiveerd{editable ? ' · selecteer om te herstellen' : ''}</p>}
      {row.selected && <div className="mt-2 space-y-3">
        {row.kind === 'sector' || row.kind === 'area' ? <label className="block text-sm">{row.kind === 'sector' ? 'Jaren ervaring (optioneel)' : 'Maximale reisafstand in km (optioneel)'}
          <input type="number" min="0" max={row.kind === 'sector' ? 80 : 1000} step="1" className={field} value={row.years ?? ''}
            onChange={event => patch({ years: event.target.value === '' ? null : event.target.valueAsNumber })} />
        </label> : <>
          {row.recordId && !original?.termId && <label className="block text-sm">Dienst koppelen
            <select className={field} value={row.termId ?? ''} onChange={event => patch({ termId: event.target.value || null })}>
              <option value="">Nog geen dienst gekoppeld</option>
              {base.services.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>}
          <label className="block text-sm">Specialisme (optioneel)
            <select className={field} value={row.specialismId ?? ''} onChange={event => patch({ specialismId: event.target.value || null })}>
              <option value="">Geen specialisme</option>
              {original?.specialismId && !base.specialisms.some(term => term.id === original.specialismId) &&
                <option value={original.specialismId}>{original.specialismLabel} (bestaande keuze)</option>}
              {base.specialisms.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <fieldset><legend className="text-sm font-semibold">Leveringsvormen voor {row.label}</legend>
            <div className="flex flex-wrap gap-x-5">{modes.map((mode, index) => <label key={mode} className="flex min-h-11 items-center gap-2">
              <input type="checkbox" id={index === 0 ? row.key + '-first-mode' : undefined} checked={row.modes.includes(mode)}
                onChange={event => patch({ modes: event.target.checked ? [...row.modes, mode] : row.modes.filter(item => item !== mode) })} />
              {providerDeliveryModeLabels[mode]}
            </label>)}</div>
          </fieldset>
          {editable && row.termId && row.specialismId && base.services.some(term => term.id === row.termId) &&
            <Button variant="outline" onClick={() => {
              const option = base.services.find(term => term.id === row.termId)!
              const extra = { ...catalogRow('service', option), key: crypto.randomUUID(), selected: true, modes: [...row.modes] }
              setRows(current => [...current, extra])
              setMessage('Extra dienstregel toegevoegd voor ' + option.label + '. Kies een specialisme.')
              requestAnimationFrame(() => document.getElementById(extra.key + '-row')?.querySelector('select')?.focus())
            }}>Nog een specialisme bij {row.label}</Button>}
        </>}
        {row.verification && <p className="text-sm text-text-secondary">Laatst opgeslagen beoordeling · {row.verification}</p>}
      </div>}
    </div>
  }

  return <form className="space-y-5" onSubmit={event => { event.preventDefault(); submit() }}>
    {(['sector', 'service', 'area'] as const).map(kind => {
      const sector = kind === 'sector'
      const title = sector ? 'Sectoren' : kind === 'service' ? 'Diensten' : 'Werkgebied'
      const editable = sector ? base.editSectors : kind === 'service' ? base.editServices : Boolean(base.editArea)
      const options = sector ? base.sectors : kind === 'service' ? base.services : (base.areas ?? [])
      const visible = rows.filter(row => row.kind === kind && (editable || row.selected))
      return <Card key={kind} id={sector ? 'sectoren' : kind === 'service' ? 'diensten' : 'werkgebied'} className="min-w-0">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-1 text-text-secondary">{sector ? 'In welke branches heeft uw organisatie ervaring?' : kind === 'service' ? 'Welke werkzaamheden biedt u aan? Kies per dienst uw leveringsvormen.' : 'Waar wilt u opdrachten uitvoeren? Kies één of meer werkgebieden.'}</p>
        {!options.length && <p className="mt-3 text-sm">De catalogus voor {title.toLowerCase()} bevat momenteel geen beschikbare keuzes.</p>}
        {!editable && <p className="mt-2 text-sm">{visible.length ? 'Alleen-lezen.' : 'Er zijn nog geen keuzes vastgelegd.'}</p>}
        <fieldset disabled={!editable || pending} className="mt-4 min-w-0">
          <legend className="sr-only">{title}</legend>
          <div className="grid min-w-0 items-start gap-3 sm:grid-cols-2">{visible.map(row => renderRow(row, editable))}</div>
        </fieldset>
      </Card>
    })}
    {error && <p role="alert" className="font-semibold">{error}</p>}
    <p role="status" aria-live="polite" className="empty:hidden">{message}</p>
    {(base.editSectors || base.editServices || base.editArea) && <Button type="submit" loading={pending}>Wijzigingen opslaan</Button>}
  </form>
}
