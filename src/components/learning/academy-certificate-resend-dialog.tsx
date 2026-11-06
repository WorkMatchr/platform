'use client'

import { useActionState, useRef } from 'react'
import { Button, buttonBaseStyles, buttonVariantStyles } from '@/components/ui/button'
import { requestCertificateResendAction } from '@/app/platformbeheer/academy/certificaten/actions'
import type { CertificateResendState } from '@/lib/learning/academy-certificate-admin-model'

export function AcademyCertificateResendDialog({certificateId,requestId,recipientFingerprint,recipientEmail,name,courseTitle,certificateNumber}: {
  certificateId:string;requestId:string;recipientFingerprint:string;recipientEmail:string;name:string;courseTitle:string;certificateNumber:string
}) {
  const result=useRef<HTMLParagraphElement>(null)
  const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),cancel=useRef<HTMLButtonElement>(null)
  const [state,action,pending]=useActionState<CertificateResendState,FormData>(requestCertificateResendAction,{})
  return <>
    <button className={buttonBaseStyles+' '+buttonVariantStyles.outline} ref={trigger} type="button" disabled={state.queued} onClick={() => {dialog.current?.showModal();cancel.current?.focus()}}>Certificaat opnieuw versturen</button>
    {state.queued && <p ref={result} tabIndex={-1} role="status" className="mt-3">{state.message} Voor een bewust nieuw verzoek op een later moment opent u deze detailpagina opnieuw.</p>}
    <dialog ref={dialog} onClose={() => { if(state.queued)result.current?.focus();else trigger.current?.focus() }} onCancel={event => {if(pending)event.preventDefault()}} aria-labelledby="certificate-resend-title" aria-describedby="certificate-resend-description" className="max-h-[90dvh] w-[min(92vw,36rem)] overflow-y-auto rounded-card border border-border bg-surface p-6 text-text-primary shadow-card backdrop:bg-brand-dark/55 [overflow-wrap:anywhere]">
      <h2 id="certificate-resend-title" className="text-xl font-bold">Certificaat opnieuw versturen</h2>
      <p id="certificate-resend-description" className="my-4">U vraagt een herverzending van het bestaande certificaat aan. Naam, behaaldatum en certificaatnummer blijven gelijk.</p>
      <dl className="space-y-3"><div><dt className="font-semibold">Deelnemer</dt><dd>{name}</dd></div><div><dt className="font-semibold">Opleiding</dt><dd>{courseTitle}</dd></div><div><dt className="font-semibold">Certificaatnummer</dt><dd>{certificateNumber}</dd></div><div><dt className="font-semibold">Geverifieerd ontvangstadres</dt><dd>{recipientEmail}</dd></div></dl>
      <form action={action} className="mt-5">
        <input type="hidden" name="certificateId" value={certificateId}/><input type="hidden" name="requestId" value={requestId}/><input type="hidden" name="recipientFingerprint" value={recipientFingerprint}/>
        {!state.queued && <label className="flex min-h-11 items-start gap-3"><input type="checkbox" name="confirmed" required className="mt-1 size-5 shrink-0"/><span>Ik bevestig deze herverzending naar het getoonde geverifieerde adres.</span></label>}
        {state.message && <p role={state.queued?'status':'alert'} className="my-4">{state.message}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3"><button className={buttonBaseStyles+' '+buttonVariantStyles.ghost} ref={cancel} type="button" disabled={pending} onClick={() => dialog.current?.close()}>{state.queued?'Sluiten':'Annuleren'}</button>{!state.queued && <Button type="submit" loading={pending}>Herverzending aanvragen</Button>}</div>
      </form>
    </dialog>
  </>
}
