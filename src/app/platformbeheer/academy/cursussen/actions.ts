'use server'
import { revalidatePath } from 'next/cache'
import { saveAuthoringCourse, transitionAuthoringCourse, prepareBundleRevision } from '@/lib/learning/academy-authoring-service'
import { authoringStates } from '@/lib/learning/academy-authoring-contract'
export async function saveCourse(raw:unknown,id?:string,revision?:number){try{const result=await saveAuthoringCourse(raw,id,revision);revalidatePath('/platformbeheer/academy/cursussen');return {ok:true as const,...result}}catch(error){return {ok:false as const,message:error instanceof Error&&error.message==='PUBLISHED_IDENTITY_IMMUTABLE'?'Titel en beschrijving horen bij een al gepubliceerde cursus. Een wijziging daarvan vereist eerst een afzonderlijk versieplan; andere conceptinhoud kunt u wel bewerken.':'Opslaan is niet gelukt. Controleer alle velden en ververs bij een gelijktijdige wijziging.'}}}
export async function changeCourseState(id:string,revision:number,state:string,reason:string){try{if(!authoringStates.includes(state as typeof authoringStates[number]))throw Error('INVALID_STATE');await transitionAuthoringCourse(id,revision,state as typeof authoringStates[number],reason);revalidatePath('/platformbeheer/academy/cursussen');return {ok:true as const}}catch(error){return {ok:false as const,message:error instanceof Error&&error.message==='ACTIVE_ENROLLMENTS_REQUIRE_VERSION_PLAN'?'Deze cursus heeft nog actieve cursisten zonder afgeronde eindtoets of met een lopende poging. Publiceer de opvolger pas na een veilig overgangsplan.':'De overgang is geweigerd. Controleer de revisie, inhoud en vereiste goedkeuring.'}}}

export async function prepareCourseRevision(id: string, version: string) {
 try { return { ok: true as const, bundle: await prepareBundleRevision(id, version) } }
 catch { return { ok: false as const, message: 'Nieuwe versie is niet voorbereid. Kies een andere versienaam en controleer uw bevoegdheid.' } }
}
