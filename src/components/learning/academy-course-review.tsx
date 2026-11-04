'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { fieldClassName } from '@/components/auth/auth-shell'
import { authoringLabels, authoringStates, canTransition, type AuthoringState } from '@/lib/learning/academy-authoring-contract'
import { changeCourseState } from '@/app/platformbeheer/academy/cursussen/actions'
export function AcademyCourseReview({id,revision,state}:{id:string;revision:number;state:AuthoringState}){const [reason,setReason]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);const router=useRouter();return <section className="space-y-3 rounded-card border border-border p-5"><h2 className="text-xl font-semibold">Publicatie: {authoringLabels[state]}</h2><label className="block">Onderbouwing van uw besluit<textarea className={fieldClassName} minLength={10} maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></label><p>Goedkeuren legt uw eigen inhoudelijke beoordeling vast voor deze exacte revisie. Technische controles vervangen die beoordeling niet.</p><div className="flex flex-wrap gap-3">{authoringStates.filter(s=>canTransition(state,s)).map(s=><Button key={s} disabled={busy||reason.trim().length<10} onClick={async()=>{setBusy(true);try{const result=await changeCourseState(id,revision,s,reason);setMessage(result.ok?'Opgeslagen.':result.message);if(result.ok)router.refresh()}finally{setBusy(false)}}}>{authoringLabels[s]}</Button>)}</div><p role="status">{message}</p></section>}
