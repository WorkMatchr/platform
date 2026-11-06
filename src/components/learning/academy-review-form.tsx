"use client"
import { useActionState,useEffect,useRef } from 'react'
import { submitAcademyReview } from '@/app/e-learnings/beoordeling/actions'
export function AcademyReviewForm({requestKey,options}:{requestKey:string;options:Array<{value:string;label:string}>}){
 const [state,action,pending]=useActionState(submitAcademyReview,{message:''});const message=useRef<HTMLParagraphElement>(null)
 useEffect(()=>{if(state.message)message.current?.focus()},[state])
 return <form action={action} className="space-y-4"><input type="hidden" name="requestKey" value={requestKey}/><label className="block">Onderwerp<select name="target" required className="block min-h-11 w-full rounded border p-2">{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label><label className="block">Toelichting<textarea name="reason" minLength={10} maxLength={2000} required className="block min-h-28 w-full rounded border p-2"/></label><button disabled={pending} className="min-h-11 rounded bg-brand-primary px-4 text-white">{pending?'Bezig…':'Verzoek versturen'}</button>{state.message&&<p ref={message} tabIndex={-1} role="status">{state.message}</p>}</form>
}
