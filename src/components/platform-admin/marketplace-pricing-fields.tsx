"use client"

import { useState } from 'react'
import { pricingExpertises } from '@/lib/marketplace/assignment-pricing'

export function MarketplacePricingFields({ basePrice, minimumPrice, adjustments }: { basePrice: number; minimumPrice: number; adjustments: Record<string, number> }) {
  const [base, setBase] = useState(String(basePrice))
  const [minimum, setMinimum] = useState(String(minimumPrice))
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(adjustments).map(([code, value]) => [code, String(value)])))
  const inputClass = 'min-w-0 rounded-control border border-border px-3 py-2 font-normal'
  return <fieldset className="grid min-w-0 gap-4 sm:col-span-2 xl:col-span-3">
    <legend className="font-semibold">Ontgrendelprijzen</legend>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-1 text-sm font-semibold">Basisprijs (credits)<input name="participationPriceCredits" type="number" min={minimum} max={100000} step={1} required value={base} onChange={e => setBase(e.target.value)} className={inputClass} /></label>
      <label className="grid gap-1 text-sm font-semibold">Minimumprijs (credits)<input name="minimumParticipationPrice" type="number" min={1} max={100000} step={1} required value={minimum} onChange={e => setMinimum(e.target.value)} className={inputClass} /></label>
    </div>
    <p className="text-sm text-text-secondary">Alleen de primaire deskundigheid bepaalt de prijscorrectie. De prijs wordt nooit lager dan de minimumprijs. Bestaande uitnodigingen behouden hun vastgelegde prijs.</p>
    <div className="grid gap-3 md:grid-cols-2">
      {pricingExpertises.map(({ code, label }) => <label key={code} className="grid min-w-0 gap-1 rounded-control border border-border p-3 text-sm font-semibold">
        {label}<span className="font-normal">Correctie in credits</span>
        <input name={`adjustment:${code}`} aria-label={`Prijscorrectie ${label}`} type="number" min={-100000} max={100000} step={1} required value={values[code] ?? 0} onChange={e => setValues({ ...values, [code]: e.target.value })} className={inputClass} />
        <output className="font-normal">Berekende prijs: {base && minimum && (values[code] ?? '0') ? `${Math.max(Number(minimum), Number(base) + Number(values[code] ?? 0))} credits` : 'Controleer de bedragen'}</output>
      </label>)}
    </div>
  </fieldset>
}
