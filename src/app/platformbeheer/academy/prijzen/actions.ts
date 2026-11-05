"use server"
import { revalidatePath } from 'next/cache'
import { requirePlatformOperator } from '@/lib/platform-admin/platform-admin-authorization'
import { saveAcademyPrices, saveAcademyPromotion, previewAcademyPricing } from '@/lib/learning/academy-pricing-service'
import { academyAmsterdamDateToIso } from '@/lib/learning/academy-pricing-policy'
export type PricingAdminState={ok?:boolean;message?:string}
function optional(form:FormData,key:string){const v=String(form.get(key)??'').trim();return v||null}
function optionalNumber(form:FormData,key:string){const v=optional(form,key);return v===null?null:Number(v)}
function safeError(error:unknown){const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';return ({ACADEMY_PRICE_STALE:'De prijzen zijn intussen gewijzigd. Vernieuw de pagina en controleer uw invoer.',ACADEMY_PROMOTION_STALE:'Deze korting is intussen gewijzigd. Vernieuw de pagina.',ACADEMY_PROMOTION_LIMIT_BELOW_USAGE:'De gebruikslimiet ligt onder het bestaande gebruik en de reserveringen.',ACADEMY_PROMOTION_IDENTITY_IMMUTABLE:'Maak een nieuwe korting voor een andere code, account of organisatie.'} as Record<string,string>)[code]??'Opslaan is niet gelukt. Controleer de bedragen, datums, selectie en eventuele dubbele actiecode.'}
export async function savePriceAction(_:PricingAdminState,form:FormData):Promise<PricingAdminState>{
 const actor=await requirePlatformOperator('/platformbeheer/academy/prijzen')
 try{await saveAcademyPrices(actor.id,{courseId:optional(form,'courseId'),expectedVersionId:optional(form,'expectedVersionId'),individualCents:form.get('individual'),fiveCents:form.get('five'),followUpIndividualCents:form.get('followUpIndividual'),followUpFiveCents:form.get('followUpFive'),vatRateBps:Number(form.get('vatRateBps')),vatTreatment:form.get('vatTreatment'),taxStatus:form.get('taxStatus'),taxReference:String(form.get('taxReference')??'')});revalidatePath('/platformbeheer/academy/prijzen');return {ok:true,message:'De prijzen zijn opgeslagen voor nieuwe bestellingen. Bestaande bestellingen blijven gelijk.'}}
 catch(error){return {ok:false,message:safeError(error)}}
}
export async function savePromotionAction(_:PricingAdminState,form:FormData):Promise<PricingAdminState>{
 const actor=await requirePlatformOperator('/platformbeheer/academy/prijzen')
 try{const id=optional(form,'id');await saveAcademyPromotion(actor.id,{...(id?{id,expectedRevision:Number(form.get('expectedRevision'))}:{}),creationKey:form.get('creationKey'),kind:form.get('kind'),label:form.get('label'),code:optional(form,'code'),userId:optional(form,'userId'),organizationId:optional(form,'organizationId'),percentage:Number(form.get('percentage')),courseIds:form.getAll('courseId').map(String),active:form.get('active')==='yes',validFrom:academyAmsterdamDateToIso(optional(form,'validFrom')),validUntil:academyAmsterdamDateToIso(optional(form,'validUntil')),maximumUses:optionalNumber(form,'maximumUses'),maximumPerAccount:optionalNumber(form,'maximumPerAccount'),quantity:optionalNumber(form,'quantity')});revalidatePath('/platformbeheer/academy/prijzen');return {ok:true,message:'De korting is opgeslagen. Bestaande bestellingen blijven gelijk.'}}
 catch(error){return {ok:false,message:safeError(error)}}
}

export async function previewPriceAction(_:PricingAdminState,form:FormData):Promise<PricingAdminState>{
 const actor=await requirePlatformOperator('/platformbeheer/academy/prijzen')
 try{const quantity=Number(form.get('quantity'));if(quantity!==1&&quantity!==5)throw new Error('INVALID');const result=await previewAcademyPricing(actor.id,{courseId:String(form.get('courseId')),quantity,buyerUserId:String(form.get('buyerUserId')),organizationId:optional(form,'organizationId'),code:optional(form,'code')??undefined,eligible:Number(form.get('eligible'))});const euro=(n:number)=>new Intl.NumberFormat('nl-NL',{style:'currency',currency:'EUR'}).format(n/100);return {ok:true,message:`${result.label}: ${euro(result.original)} − ${euro(result.discount)} = ${euro(result.total)} totaal. Dit voorbeeld maakt geen bestelling of reservering.`}}catch{return {ok:false,message:'Het prijsvoorbeeld kan niet worden berekend. Controleer uw selectie, aantal alumni en eventuele actiecode.'}}
}
