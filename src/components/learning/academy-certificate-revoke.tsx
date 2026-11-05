'use client'
import { useActionState } from 'react'
import { revokeCertificateAction } from '@/app/platformbeheer/academy/certificaten/actions'
import { Button } from '@/components/ui/button'
import { fieldClassName } from '@/components/auth/auth-shell'
export function AcademyCertificateRevoke({id,requestId,decisionId}:{id:string;requestId:string;decisionId:string}) {
 const [state,action,pending]=useActionState(revokeCertificateAction,{message:''})
 return <details className="mt-6 rounded-card border border-border p-5"><summary className="min-h-11 cursor-pointer font-semibold">Certificaat intrekken</summary><form action={action} className="space-y-4"><input type="hidden" name="certificateId" value={id}/><input type="hidden" name="requestId" value={requestId}/><input type="hidden" name="decisionId" value={decisionId}/><label className="block">Onderbouwing<textarea className={fieldClassName} name="reason" required minLength={10} maxLength={2000}/></label><label className="flex gap-3"><input type="checkbox" name="confirmed" value="yes" required/>Ik bevestig dat dit certificaat niet langer als geldig mag worden verstrekt.</label><Button type="submit" disabled={pending}>Intrekking bevestigen</Button><p role="status">{state.message}</p></form></details>
}
