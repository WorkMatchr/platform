'use server'

import { AcademyCertificateAdminError, requestAcademyCertificateResend } from '@/lib/learning/academy-certificate-admin-service'
import type { CertificateResendState } from '@/lib/learning/academy-certificate-admin-model'
export async function requestCertificateResendAction(_state: CertificateResendState, form: FormData): Promise<CertificateResendState> {
  try {
    await requestAcademyCertificateResend({ certificateId:form.get('certificateId'),requestId:form.get('requestId'),recipientFingerprint:form.get('recipientFingerprint'),confirmed:form.get('confirmed')==='on' })
    return {queued:true,message:'Het herverzendverzoek is opgeslagen.'}
  } catch (error) {
    return {message:error instanceof AcademyCertificateAdminError && error.status===409
      ? 'Het certificaat of ontvangstadres is gewijzigd of niet beschikbaar. Open de detailpagina opnieuw.'
      : 'Het herverzendverzoek kon niet worden opgeslagen. Probeer het opnieuw.'}
  }
}

export async function revokeCertificateAction(_state:{message?:string},form:FormData):Promise<{message:string}> {
  try {
    const {requireAuthor}=await import('@/lib/learning/academy-authoring-service')
    const {requestAcademyAdminCertificateReview,decideAcademyReview}=await import('@/lib/learning/academy-review-service')
    const actor=await requireAuthor()
    if(form.get('confirmed')!=='yes')throw Error('CONFIRMATION_REQUIRED')
    const reason=String(form.get('reason')??'')
    const review=await requestAcademyAdminCertificateReview(actor.userId,{requestKey:form.get('requestId'),targetId:form.get('certificateId'),kind:'CERTIFICATE_ERROR',reason})
    await decideAcademyReview(actor.userId,{requestKey:form.get('decisionId'),caseId:review.caseId,action:'REVOKED',reason})
    const {revalidatePath}=await import('next/cache')
    revalidatePath('/platformbeheer/academy/certificaten')
    return {message:'Het certificaat is ingetrokken. Het oorspronkelijke resultaat en het controlespoor blijven behouden.'}
  } catch {return {message:'Intrekking is niet uitgevoerd. Controleer uw bevoegdheid, onderbouwing en de actuele certificaatstatus.'}}
}
