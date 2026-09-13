'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef, useState } from 'react'
import { PublicIntakeDesktopContext, PublicIntakeMobileContext } from '@/components/public/public-intake-context'
import { getSimpleAdviceContext } from '@/content/simple-advice-context'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { fieldClassName } from '@/components/auth/auth-shell'
import type { SimpleAdviceActionState } from '@/app/advieswijzer/simple-actions'
import { deriveSimpleAdviceTitle, simpleAdviceSchema, simpleAdviceRouteSchema, simpleAdviceSummary, requestedExpertiseOptions, helpTopicLabels, outcomeLabels, locationLabels, startLabels, usesLocation } from '@/lib/requests/simple-advice-contract'

type Draft = Record<string, string> & { routeChoice: string; requestedExpertise: string; helpTopic: string }
const empty: Draft = { routeChoice: '', requestedExpertise: '', helpTopic: '', helpTopicOther: '', requestTitle: '', requestDescription: '', desiredOutcome: '', desiredOutcomeOther: '', workLocationMode: '', organizationLocationId: '', organizationLocationCity: '', otherLocationCity: '', desiredStartMode: '', desiredStartDate: '' }
export function SimpleAdviceForm({ action, viewerId, locations = [] }: {
  action: (state: SimpleAdviceActionState, form: FormData) => Promise<SimpleAdviceActionState>
  viewerId: string | null
  locations?: Array<{ id: string; city: string }>
}) {
  const router = useRouter()
  const [v, setV] = useState<Draft>({ ...empty })
  const [modes, setModes] = useState<string[]>([])
  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(false)
  const [submissionId, setSubmissionId] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [state, formAction, pending] = useActionState(action, {})
  const heading = useRef<HTMLHeadingElement>(null)
  const form = useRef<HTMLFormElement>(null)
  const storageKey = `workmatchr-simple-advice:v1:${viewerId ?? 'anonymous'}`
  const payload = { ...v, requestTitle: deriveSimpleAdviceTitle(v.requestDescription), requestedExpertise: v.requestedExpertise || null, helpTopic: v.helpTopic || null, organizationLocationId: v.organizationLocationId || null, combinationModes: modes }
  useEffect(() => {
    let saved: { values?: Draft; modes?: string[]; step?: number; submissionId?: string } | null = null
    try {
      const resumeAnonymous = viewerId && sessionStorage.getItem('workmatchr-simple-advice-login') === 'yes'
      const key = resumeAnonymous ? 'workmatchr-simple-advice:v1:anonymous' : storageKey
      saved = JSON.parse(sessionStorage.getItem(key) || 'null')
      if (resumeAnonymous) { sessionStorage.removeItem(key); sessionStorage.removeItem('workmatchr-simple-advice-login') }
    } catch { /* A blocked browser store does not block the form. */ }
    // Restore a tab-local draft once after hydration; never share account-scoped drafts.
    setV(current => ({ ...current, ...Object.fromEntries(Object.keys(empty).filter(k => typeof saved?.values?.[k] === 'string').map(k => [k, k === 'organizationLocationId' && !saved!.values![k] ? current.organizationLocationId : saved!.values![k]])) }))
    setModes(saved?.modes?.filter(m => ['ORGANIZATION', 'OTHER_LOCATION', 'REMOTE'].includes(m)) ?? [])
    setStep(saved?.step && saved.step >= 0 && saved.step <= 2 ? saved.step : 0)
    setSubmissionId(saved?.submissionId && /^[0-9a-f-]{36}$/i.test(saved.submissionId) ? saved.submissionId : crypto.randomUUID())
    setReady(true)
  }, [storageKey, viewerId])
  useEffect(() => {
    if (!ready) return
    try { sessionStorage.setItem(storageKey, JSON.stringify({ values: v, modes, step, submissionId })) } catch { /* Optional tab persistence. */ }
  }, [ready, v, modes, step, submissionId, storageKey])
  useEffect(() => { heading.current?.focus() }, [step])
  useEffect(() => {
    if (!state.requestId) return
    try { sessionStorage.removeItem(storageKey) } catch { /* Optional browser persistence. */ }
    router.push(`/aanvragen/${state.requestId}/gepubliceerd`)
  }, [state.requestId, storageKey, router])
  const shownErrors = { ...errors, ...state.errors }
  const update = (key: string, value: string) => {
    setV(current => ({ ...current, [key]: value, ...(key === 'routeChoice' ? { requestedExpertise: '', helpTopic: '', helpTopicOther: '' } : {}) }))
    setErrors({})
  }
  const error = (key: string) => shownErrors[key]?.[0]
  const attrs = (key: string) => ({ id: key, name: key, value: v[key], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(key, e.target.value), className: fieldClassName, 'aria-invalid': Boolean(error(key)), 'aria-describedby': [key === 'desiredStartMode' ? 'start-help' : '', error(key) ? `${key}-error` : ''].filter(Boolean).join(' ') || undefined })
  const fieldError = (key: string) => error(key) ? <p id={`${key}-error`} className="mt-1 text-sm text-error" role="alert">{error(key)}</p> : null
  const select = (key: string, label: string, options: Record<string, string>) => <div><label className="mb-2 block font-semibold" htmlFor={key}>{label}</label><select {...attrs(key)}><option value="">Maak een keuze</option>{Object.entries(options).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>{fieldError(key)}</div>
  const text = (key: string, label: string, type = 'text', placeholder?: string) => <div><label className="mb-2 block font-semibold" htmlFor={key}>{label}</label><input {...attrs(key)} type={type} placeholder={placeholder} maxLength={key === 'requestTitle' ? 200 : 500} />{fieldError(key)}</div>
  const validate = () => {
    const parsed = step === 0 ? simpleAdviceRouteSchema.safeParse(payload) : simpleAdviceSchema.safeParse(payload)
    const all = parsed.success ? {} : parsed.error.flatten().fieldErrors
    const selected = step === 0 ? Object.fromEntries(Object.entries(all).filter(([key]) => ['routeChoice', 'requestedExpertise', 'helpTopic'].includes(key))) : all
    if (usesLocation({ workLocationMode: v.workLocationMode, combinationModes: modes }, 'ORGANIZATION') && step > 0 && (v.organizationLocationId ? !locations.some(l => l.id === v.organizationLocationId) : !v.organizationLocationCity.trim())) Object.assign(selected, { [v.organizationLocationId ? 'organizationLocationId' : 'organizationLocationCity']: [locations.length ? 'Kies een beschikbare organisatielocatie of vul de plaats in.' : 'Vul de plaats in.'] })
    setErrors(selected)
    if (Object.keys(selected).length) { if (step === 2) setStep(Object.keys(selected).some(k => ['routeChoice', 'requestedExpertise', 'helpTopic'].includes(k)) ? 0 : 1); setTimeout(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0); return false }
    return true
  }
  const parsed = simpleAdviceSchema.safeParse(payload)
  const context = getSimpleAdviceContext(v, step)
  const contextStep = step === 0 ? 'SITUATION' : step === 1 ? 'ORGANIZATION' : 'PLANNING'
  return <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start"><PublicIntakeDesktopContext step={contextStep} context={context} /><div className="min-w-0 space-y-4"><PublicIntakeMobileContext step={contextStep} context={context} /><form ref={form} action={formAction} className="space-y-6 rounded-card border border-border bg-surface p-5 sm:p-8" noValidate onSubmit={e => { if (step !== 2 || !validate()) e.preventDefault() }}>
    <input type="hidden" name="payload" value={JSON.stringify(payload)} />
    <input type="hidden" name="submissionId" value={submissionId} />
    <p className="text-sm text-text-secondary" aria-label="Voortgang">Stap {step + 1} van 3</p>
    <h2 ref={heading} tabIndex={-1} className="text-xl font-bold text-brand-dark">{['Weet u welke deskundigheid u nodig heeft?', 'Uw opdracht', 'Controleer uw opdracht'][step]}</h2>
    {state.message && <p role="alert" className="text-error">{state.message}</p>}
    {step === 0 && <>
      <fieldset><legend className="sr-only">Weet u welke deskundigheid u nodig heeft?</legend><div className="flex gap-6">{[['KNOWS_EXPERTISE', 'Ja'], ['NEEDS_TOPIC', 'Nee']].map(([value, label]) => <label key={value} className="flex min-h-11 items-center gap-2"><input type="radio" name="routeChoice" value={value} checked={v.routeChoice === value} onChange={() => update('routeChoice', value)} aria-describedby={error('routeChoice') ? 'routeChoice-error' : undefined} />{label}</label>)}</div>{fieldError('routeChoice')}</fieldset>
      {v.routeChoice === 'KNOWS_EXPERTISE' && select('requestedExpertise', 'Welke deskundigheid zoekt u?', Object.fromEntries(requestedExpertiseOptions.map(o => [o.value, o.label])))}
      {v.routeChoice === 'NEEDS_TOPIC' && select('helpTopic', 'Waar gaat uw vraag over?', helpTopicLabels)}
      {v.routeChoice === 'NEEDS_TOPIC' && v.helpTopic === 'OTHER' && text('helpTopicOther', 'Toelichting (optioneel)')}
    </>}
    {step === 1 && <>
      <div><label className="mb-2 block font-semibold" htmlFor="requestDescription">Beschrijf uw vraag of situatie</label><p id="description-help" className="mb-2 text-sm text-text-secondary">Beschrijf kort wat er speelt, waar u ondersteuning bij zoekt en wat u wilt bereiken. U hoeft geen vaktermen te gebruiken.</p><textarea {...attrs('requestDescription')} aria-describedby={['description-help', error('requestDescription') ? 'requestDescription-error' : ''].filter(Boolean).join(' ')} rows={5} maxLength={4000} /><p className="mt-1 text-sm text-text-secondary">Noem geen namen, medische gegevens of andere gevoelige persoonsgegevens.</p>{fieldError('requestDescription')}</div>
      {select('desiredOutcome', 'Wat wilt u bereiken?', outcomeLabels)}
      {v.desiredOutcome === 'OTHER' && text('desiredOutcomeOther', 'Licht toe wat u wilt bereiken')}
      {select('workLocationMode', 'Waar moet de opdracht worden uitgevoerd?', locationLabels)}
      {v.workLocationMode === 'COMBINATION' && <fieldset><legend className="font-semibold">Kies de uitvoeringsvormen</legend>{(['ORGANIZATION', 'OTHER_LOCATION', 'REMOTE'] as const).map(mode => <label className="flex min-h-11 items-center gap-2" key={mode}><input type="checkbox" checked={modes.includes(mode)} onChange={e => setModes(current => e.target.checked ? [...current, mode] : current.filter(m => m !== mode))} />{locationLabels[mode]}</label>)}{fieldError('combinationModes')}</fieldset>}
      {usesLocation({ workLocationMode: v.workLocationMode, combinationModes: modes }, 'ORGANIZATION') && <>{viewerId && locations.length > 0 && select('organizationLocationId', 'Organisatielocatie', Object.fromEntries(locations.map(l => [l.id, l.city])))}{!v.organizationLocationId && text('organizationLocationCity', 'Plaats op locatie')}</>}
      {usesLocation({ workLocationMode: v.workLocationMode, combinationModes: modes }, 'OTHER_LOCATION') && text('otherLocationCity', 'Plaats')}
      {usesLocation({ workLocationMode: v.workLocationMode, combinationModes: modes }, 'REMOTE') && <p className="text-sm text-text-secondary">Via videoverbinding of telefonisch</p>}
      <p id="start-help" className="text-sm text-text-secondary">Dit is een indicatie. De daadwerkelijke startdatum stemt u later af met de opdrachtnemer.</p>
      {select('desiredStartMode', 'Wanneer wilt u starten?', startLabels)}
      {v.desiredStartMode === 'SPECIFIC_DATE' && text('desiredStartDate', 'Specifieke voorkeursdatum', 'date')}
    </>}
    {step === 2 && parsed.success && <dl className="space-y-4">{simpleAdviceSummary(parsed.data, locations.find(l => l.id === v.organizationLocationId)?.city).map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="whitespace-pre-wrap break-words text-text-secondary">{value}</dd></div>)}</dl>}
    {step === 2 && !viewerId && <div className="space-y-3"><p>Log in als opdrachtgever om uw opdracht te publiceren. Uw ingevulde gegevens blijven in dit tabblad bewaard.</p><LinkButton href="/inloggen?returnTo=%2Fadvieswijzer" onClick={() => { try { sessionStorage.setItem('workmatchr-simple-advice-login', 'yes') } catch {} }}>Inloggen</LinkButton><LinkButton href="/registreren" variant="outline" onClick={() => { try { sessionStorage.setItem('workmatchr-simple-advice-login', 'yes') } catch {} }}>Account aanmaken</LinkButton></div>}
    <div className="flex flex-wrap justify-between gap-3">
      {step > 0 ? <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={pending}>{step === 2 ? 'Wijzigen' : 'Terug'}</Button> : <span />}
      {step < 2 ? <Button key="continue" type="button" disabled={!ready} onClick={event => { event.preventDefault(); if (validate()) setStep(s => s + 1) }}>Verder</Button> : viewerId ? <Button key="publish" type="submit" disabled={!ready || !parsed.success} loading={pending}>Opdracht publiceren</Button> : null}
    </div>
  </form></div></div>
}
