 'use client'
import {useActionState,useEffect,useRef,startTransition} from 'react'
import {prepareSeatTransferAction,paySeatTransferAction} from '@/app/e-learnings/commerce-actions'
import {Button} from '@/components/ui/button'
export function AcademySeatTransferForm({seatId,requestKey}:{seatId:string;requestKey:string}){
 const [prepared,prepare,pending]=useActionState(prepareSeatTransferAction,{}),[paid,pay,paying]=useActionState(paySeatTransferAction,{})
 const feedback=useRef<HTMLParagraphElement>(null)
 useEffect(()=>{if(prepared.message||paid.message)feedback.current?.focus()},[prepared.message,paid.message])
 return <section className="space-y-3"><h4 className="font-semibold">Ongebruikte plaats overdragen</h4><p>Bij verlies van persoonlijk vervolgleervoordeel betaalt u eerst het oorspronkelijke kortingsverschil bij. De oude bestelling blijft ongewijzigd.</p>
 {!('transferId' in prepared)&&<form className="space-y-3" onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);startTransition(()=>prepare(data))}}><input type="hidden" name="seatId" value={seatId}/><input type="hidden" name="requestKey" value={requestKey}/><label className="block">E-mailadres geverifieerde nieuwe deelnemer<input type="email" name="email" required className="mt-1 min-h-11 w-full rounded border p-3"/></label><Button type="submit" loading={pending}>Bijbetaling berekenen</Button></form>}
 {'transferId' in prepared&&prepared.transferId&&<form className="space-y-3" onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);startTransition(()=>pay(data))}}><input type="hidden" name="transferId" value={prepared.transferId}/><p>Bijbetaling: {new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format((prepared.amountInclVatCents??0)/100)} inclusief eventuele test-btw.</p><p>TAX REVIEW REQUIRED. U start uitsluitend een sandboxtest.</p><label className="flex min-h-11 items-start gap-3"><input type="checkbox" name="confirmed" value="yes" required className="mt-1 size-5"/><span>Ik bevestig de overdracht en de getoonde bijbetaling.</span></label><Button type="submit" loading={paying}>Overdracht bevestigen en afronden</Button></form>}
 {(prepared.message||paid.message)&&<p ref={feedback} tabIndex={-1} role={paid.ok===false||prepared.ok===false?'alert':'status'}>{paid.message??prepared.message}</p>}</section>
}
