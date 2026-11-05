
'use server'
import { prepareAcademySeatTransfer, startAcademySeatTransferPayment } from '@/lib/learning/academy-seat-transfer-service'
import { redirect } from 'next/navigation'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { createAcademyOrder, startAcademyOrderPayment, inviteAcademySeat, acceptAcademySeat, recordAcademyWithdrawal, cancelAcademyUnpaidOrder } from '@/lib/learning/academy-commerce-service'
import { AcademyCommerceError } from '@/lib/learning/academy-commerce-policy'

export type AcademyCommerceState = { ok?: boolean; message?: string; orderId?: string }
function safeError(error: unknown) {
  const code = error instanceof AcademyCommerceError ? error.code : ''
  return ({ ACADEMY_ALUMNI_REFUND_REVIEW_REQUIRED: 'De eerdere restitutie moet per opleidingsplaats worden beoordeeld voordat we uw vervolgleervoordeel kunnen bepalen.', ACADEMY_TRANSFER_PENDING: 'Een overdracht wacht nog op bevestiging of betaalcontrole. Rond die eerst af.', ACADEMY_TRANSFER_VERIFIED_PARTICIPANT_REQUIRED: 'De nieuwe deelnemer moet eerst een actief en geverifieerd account hebben.', ACADEMY_CODE_NOT_AVAILABLE: 'Deze actiecode is niet beschikbaar voor deze bestelling. Controleer de code of ga verder zonder code.', ACADEMY_PAYMENT_RECONCILIATION_REQUIRED: 'De betaalstatus moet eerst worden gecontroleerd. De reservering blijft veilig behouden.', ACADEMY_BENEFIT_NOT_ESTABLISHED: 'Het persoonlijke vervolgleervoordeel kan nog niet worden vastgesteld. Controleer de deelnemers of kies de standaardprijs.', ACADEMY_PARTICIPANTS_INVALID: 'Vul voor dit pakket vijf verschillende deelnemersadressen in.', ACADEMY_DUPLICATE_PARTICIPANT: 'Gebruik voor iedere plaats een andere deelnemer.', ACADEMY_PARTICIPANT_ALREADY_HAS_ACCESS: 'Deze deelnemer heeft al toegang tot de opleiding.', ACADEMY_COURSE_NOT_AVAILABLE: 'Deze opleiding is nog niet beschikbaar voor aankoop.', ACADEMY_ORGANIZATION_NOT_AUTHORIZED: 'U kunt voor deze organisatie geen opleidingsplaatsen beheren.', ACADEMY_PAYMENT_ALREADY_PENDING: 'Er staat al een aankoop voor deze opleiding klaar. Open Mijn aankopen.', ACADEMY_INVITATION_EXPIRED: 'Deze uitnodiging is verlopen. Vraag de koper om een nieuwe uitnodiging.', ACADEMY_BENEFIT_PARTICIPANT_LOCKED: 'Deze plaats met vervolgleervoordeel hoort bij de eerder gecontroleerde deelnemer.' } as Record<string,string>)[code] ?? 'De actie is niet gelukt. Uw gegevens zijn bewaard. Controleer uw invoer en probeer opnieuw.'
}
export async function prepareAcademyOrderAction(_: AcademyCommerceState, form: FormData): Promise<AcademyCommerceState> {
  const actor = await requireLearningUser('/e-learnings/aankopen/nieuw')
  try {
    const prepared = await createAcademyOrder(actor.id, { courseCode: form.get('courseCode'), quantity: Number(form.get('quantity')), buyerType: form.get('buyerType'), ...(form.get('organizationId') ? { organizationId: form.get('organizationId') } : {}), promotionCode: String(form.get('promotionCode')??'').trim()||undefined, followUp: form.get('followUp') === 'yes', participantEmails: form.getAll('participantEmail').map(String).filter(Boolean), billing: { name: form.get('billingName'), address: form.get('billingAddress'), postalCode: form.get('billingPostalCode'), city: form.get('billingCity'), country: 'NL' }, platformTermsAccepted: form.get('platformTermsAccepted') === 'yes', academyTermsAccepted: form.get('academyTermsAccepted') === 'yes', legalVersion: form.get('legalVersion'), idempotencyKey: form.get('idempotencyKey') })
    return { ok: true, orderId: prepared.orderId, message: 'Uw prijs is berekend. Controleer de bestelling; er is nog geen betaling gestart.' }
  } catch(error) { return { ok: false, message: safeError(error) } }
}
export async function startAcademyPaymentAction(_: AcademyCommerceState, form: FormData): Promise<AcademyCommerceState> {
  const actor = await requireLearningUser('/e-learnings/aankopen')
  let url: string
  try { url = (await startAcademyOrderPayment(actor.id, String(form.get('orderId')), form.get('confirmed') === 'yes')).checkoutUrl }
  catch(error) { return { ok: false, message: safeError(error) } }
  redirect(url)
}
export async function inviteAcademySeatAction(_: AcademyCommerceState, form: FormData): Promise<AcademyCommerceState> {
  const actor = await requireLearningUser('/e-learnings/aankopen')
  try { await inviteAcademySeat(actor.id, String(form.get('seatId')), String(form.get('email'))); return { ok: true, message: 'De uitnodiging staat in de lokale test-outbox. Er is geen echte e-mail verzonden.' } }
  catch(error) { return { ok: false, message: safeError(error) } }
}
export async function acceptAcademySeatAction(_: AcademyCommerceState, form: FormData): Promise<AcademyCommerceState> {
  const actor = await requireLearningUser('/e-learnings/mijn')
  try { await acceptAcademySeat(actor.id, String(form.get('seatId')), form.get('accepted') === 'yes', String(form.get('legalVersion'))); return { ok: true, message: 'De opleidingsplaats is geactiveerd. Open Mijn e-learnings.' } }
  catch(error) { return { ok: false, message: safeError(error) } }
}
export async function withdrawAcademyOrderAction(_: AcademyCommerceState, form: FormData): Promise<AcademyCommerceState> {
  const actor = await requireLearningUser('/e-learnings/aankopen')
  try { const receipt = await recordAcademyWithdrawal(actor.id, String(form.get('orderId'))); return { ok: true, message: `Uw verzoek is ontvangen op ${receipt.receivedAt.toISOString()}. De ontvangstbevestiging staat in de test-outbox.` } }
  catch(error) { return { ok: false, message: safeError(error) } }
}

export async function cancelAcademyOrderAction(_:AcademyCommerceState,form:FormData):Promise<AcademyCommerceState>{
 const actor=await requireLearningUser('/e-learnings/aankopen')
 try{await cancelAcademyUnpaidOrder(actor.id,String(form.get('orderId')));return {ok:true,message:'De onbetaalde bestelling is geannuleerd.'}}catch(error){return {ok:false,message:safeError(error)}}
}

export async function prepareSeatTransferAction(_: AcademyCommerceState & {transferId?:string;amountInclVatCents?:number},form:FormData):Promise<AcademyCommerceState & {transferId?:string;amountInclVatCents?:number}>{
 const actor=await requireLearningUser('/e-learnings/aankopen')
 try { const result=await prepareAcademySeatTransfer(actor.id,{seatId:form.get('seatId'),email:form.get('email'),requestKey:form.get('requestKey')});return {ok:true,...result,message:'Controleer de bijbetaling voordat u de overdracht bevestigt.'} }
 catch(error){return {ok:false,message:safeError(error)}}
}
export async function paySeatTransferAction(_:AcademyCommerceState,form:FormData):Promise<AcademyCommerceState>{
 const actor=await requireLearningUser('/e-learnings/aankopen');let url:string
 try{url=(await startAcademySeatTransferPayment(actor.id,String(form.get('transferId')),form.get('confirmed')==='yes')).checkoutUrl}catch(error){return {ok:false,message:safeError(error)}}
 redirect(url)
}
