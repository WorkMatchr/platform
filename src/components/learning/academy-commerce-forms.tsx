
'use client'
import { startTransition, useActionState, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { academyLegalDrafts } from '@/content/academy-legal-drafts'
import { ACADEMY_LEGAL_VERSION } from '@/lib/learning/academy-commerce-policy'
import { prepareAcademyOrderAction, startAcademyPaymentAction, inviteAcademySeatAction, acceptAcademySeatAction, withdrawAcademyOrderAction, cancelAcademyOrderAction, type AcademyCommerceState } from '@/app/e-learnings/commerce-actions'

const field = 'mt-1 block min-h-11 w-full rounded-control border border-border bg-surface p-3'
export function AcademyDraftTerms() {
  return <section className="space-y-3" aria-label="Juridische reviewconcepten"><p className="font-semibold">Reviewconcepten — nog geen definitief goedgekeurde voorwaarden</p>{academyLegalDrafts.map(document => <details key={document.id} className="rounded-card border border-border p-3"><summary className="min-h-11 cursor-pointer font-semibold">{document.title}</summary><p className="mt-3 whitespace-pre-line break-words leading-7">{document.text}</p></details>)}</section>
}
export function AcademyOrderForm({ courses, organizationId, requestId }: { courses: Array<{ code: string; title: string; individualCents?:number; fiveCents?:number }>; organizationId?: string; requestId: string }) {
  const [state, action, pending] = useActionState<AcademyCommerceState, FormData>(prepareAcademyOrderAction,{})
  const [quantity,setQuantity] = useState('1'), [business,setBusiness] = useState(false), [followUp,setFollowUp] = useState(false)
  const [selectedCourse,setSelectedCourse]=useState(courses[0]?.code??'')
  const selected=courses.find(c=>c.code===selectedCourse)
  const money=(cents:number)=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(cents/100)
  const status = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if(state.message) status.current?.focus() },[state.message])
  return <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(() => action(form)) }} className="space-y-5">
    <input name="idempotencyKey" type="hidden" value={requestId}/><input name="legalVersion" type="hidden" value={ACADEMY_LEGAL_VERSION}/>
    <label className="block font-semibold">Opleiding<select className={field} name="courseCode" required value={selectedCourse} onChange={e=>setSelectedCourse(e.target.value)}>{courses.map(c => <option key={c.code} value={c.code}>{c.title}</option>)}</select></label>
    <label className="block font-semibold">Aankoop<select name="buyerType" className={field} value={business?'BUSINESS':'CONSUMER'} onChange={e=>{setBusiness(e.target.value==='BUSINESS');if(e.target.value==='CONSUMER')setQuantity('1')}}><option value="CONSUMER">Voor mijzelf als consument</option>{organizationId && <option value="BUSINESS">Namens mijn organisatie</option>}</select></label>
    {business && <><input name="organizationId" type="hidden" value={organizationId}/><label className="block font-semibold">Aantal plaatsen<select name="quantity" className={field} value={quantity} onChange={e=>setQuantity(e.target.value)}><option value="1">Eén plaats — {money(selected?.individualCents??14900)} totaal</option><option value="5">Vijf plaatsen — {money(selected?.fiveCents??59500)} totaal</option></select></label></>}
    {!business && <input name="quantity" type="hidden" value="1"/>}
    {!business&&<p>Standaardprijs {money(selected?.individualCents??14900)} totaal. Uw persoonlijke vervolgleervoordeel en beschikbare kortingen worden automatisch gecontroleerd.</p>}
    {quantity==='5'&&<label className="flex min-h-11 items-start gap-3"><input className="mt-1 size-5 shrink-0" type="checkbox" name="followUp" value="yes" checked={followUp} onChange={e=>setFollowUp(e.target.checked)}/><span>De vijf deelnemers nu aanwijzen voor controle van hun persoonlijke vervolgleervoordeel.</span></label>}
    <label className="block font-semibold">Actiecode (optioneel)<input name="promotionCode" className={field} maxLength={40} autoCapitalize="characters" autoComplete="off"/></label><p>U krijgt maximaal één kortingsregeling: automatisch de voordeligste geldige regeling voor deze bestelling.</p>
    {quantity==='5' && followUp && <fieldset className="space-y-3"><legend className="font-semibold">Vijf vooraf toegewezen deelnemers</legend><p>Alleen gecontroleerde accounts met een eerder behaalde andere opleiding leveren voordeel op. Onbekende historie levert geen korting op. Een kortingsplaats blijft persoonsgebonden.</p>{Array.from({length:5},(_,i)=><label className="block" key={i}>E-mailadres deelnemer {i+1}<input className={field} type="email" name="participantEmail" required autoComplete="off"/></label>)}</fieldset>}
    <fieldset className="space-y-3"><legend className="font-semibold">Factuurgegevens voor deze test</legend>{[['billingName','Volledige factuurnaam'],['billingAddress','Adres'],['billingPostalCode','Postcode'],['billingCity','Plaats']].map(([name,label])=><label className="block" key={name}>{label}<input className={field} name={name} required autoComplete="off"/></label>)}<p>Nederland. Alle getoonde prijzen zijn totale klantprijzen. De definitieve bestelcontrole toont het toegepaste test-btw-bedrag. TAX REVIEW REQUIRED.</p></fieldset>
    <AcademyDraftTerms/>
    <label className="flex min-h-11 items-start gap-3"><input className="mt-1 size-5 shrink-0" name="platformTermsAccepted" value="yes" type="checkbox" required/><span>Ik aanvaard voor deze sandboxtest het getoonde concept van de platformvoorwaarden.</span></label>
    <label className="flex min-h-11 items-start gap-3"><input className="mt-1 size-5 shrink-0" name="academyTermsAccepted" value="yes" type="checkbox" required/><span>Ik aanvaard voor deze sandboxtest de getoonde Academy-afspraken. Dit meldt mij niet aan voor kennisbehoud of een jaarherinnering.</span></label>
    <p>Volgende stap: controleer uw definitieve prijs. Er wordt nu nog geen betaling gestart en u doet geen afstand van herroepingsrechten.</p>
    <Button type="submit" loading={pending}>Prijs berekenen en controleren</Button>
    {state.message && <p ref={status} tabIndex={-1} role={state.ok?'status':'alert'}>{state.message}</p>}
    {state.orderId && <Link className="inline-flex min-h-11 items-center font-semibold underline" href={`/e-learnings/aankopen/${state.orderId}`}>Controleer de bestelling</Link>}
  </form>
}
export function AcademyCommerceActionForm({ kind, id }: { kind:'payment'|'invite'|'accept'|'withdraw'|'cancel'; id:string }) {
  const fn = kind==='payment'?startAcademyPaymentAction:kind==='invite'?inviteAcademySeatAction:kind==='accept'?acceptAcademySeatAction:kind==='cancel'?cancelAcademyOrderAction:withdrawAcademyOrderAction
  const [state,action,pending]=useActionState<AcademyCommerceState,FormData>(fn,{})
  const status=useRef<HTMLParagraphElement>(null)
  useEffect(()=>{if(state.message)status.current?.focus()},[state.message])
  return <form onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(() => action(form)) }} className="space-y-3">
    <input type="hidden" name={kind==='invite'||kind==='accept'?'seatId':'orderId'} value={id}/>
    <input type="hidden" name="legalVersion" value={ACADEMY_LEGAL_VERSION}/>
    {kind==='invite' && <label className="block">E-mailadres deelnemer<input type="email" name="email" className={field} required/></label>}
    {kind==='payment' && <label className="flex min-h-11 items-start gap-3"><input className="mt-1 size-5" type="checkbox" name="confirmed" value="yes" required/><span>Ik bevestig de hierboven getoonde bestelling en totale testprijs.</span></label>}
    {kind==='accept' && <><AcademyDraftTerms/><label className="flex min-h-11 items-start gap-3"><input className="mt-1 size-5" type="checkbox" name="accepted" value="yes" required/><span>Ik aanvaard deze persoonlijke opleidingsplaats en de getoonde Academy-afspraken voor deze test.</span></label></>}
    <Button type="submit" loading={pending}>{kind==='payment'?'Bestelling bevestigen en afronden':kind==='invite'?'Uitnodiging in test-outbox zetten':kind==='accept'?'Opleidingsplaats aanvaarden':kind==='cancel'?'Onbetaalde bestelling annuleren':'Koop ongedaan maken'}</Button>
    {state.message && <p ref={status} tabIndex={-1} role={state.ok?'status':'alert'}>{state.message}</p>}
    {kind==='accept' && state.ok && <Link className="inline-flex min-h-11 items-center font-semibold underline" href="/e-learnings/mijn">Open Mijn e-learnings</Link>}
  </form>
}
