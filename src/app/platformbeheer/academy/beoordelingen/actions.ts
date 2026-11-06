"use server"
import { requirePlatformOperator } from '@/lib/platform-admin/platform-admin-authorization'
import { decideAcademyReview } from '@/lib/learning/academy-review-service'
import { revalidatePath } from 'next/cache'
export async function submitAcademyReviewDecision(_state:{message:string},form:FormData){
 const operator=await requirePlatformOperator('/platformbeheer/academy/beoordelingen')
 try {await decideAcademyReview(operator.userId,{requestKey:form.get('requestKey'),caseId:form.get('caseId'),action:form.get('action'),reason:form.get('reason'),...(form.get('firstName')?{firstName:form.get('firstName'),lastName:form.get('lastName')}:{})});revalidatePath('/platformbeheer/academy/beoordelingen');return {message:'Beoordeling vastgelegd. Het oorspronkelijke bewijs blijft bewaard.'}}
 catch{return {message:'Beoordeling niet opgeslagen. Controleer de bevoegdheid, status en invoer.'}}
}
