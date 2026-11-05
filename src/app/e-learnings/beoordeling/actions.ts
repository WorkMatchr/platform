"use server"
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { requestAcademyReview } from '@/lib/learning/academy-review-service'
import { revalidatePath } from 'next/cache'
export async function submitAcademyReview(_state:{message:string},form:FormData) {
  const user=await requireLearningUser('/e-learnings/beoordeling')
  try {
    const [kind,targetId]=String(form.get('target')??'').split(':')
    const result=await requestAcademyReview(user.id,{requestKey:form.get('requestKey'),kind,targetId,reason:form.get('reason')})
    revalidatePath('/e-learnings/beoordeling')
    return {message:`Uw verzoek is geregistreerd. Referentie: ${result.caseId}. Een medewerker beoordeelt uw verzoek.`}
  } catch { return {message:'Het verzoek kon niet worden geregistreerd. Controleer de gegevens en probeer opnieuw.'} }
}
