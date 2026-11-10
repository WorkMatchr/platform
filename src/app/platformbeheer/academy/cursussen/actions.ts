'use server'
import { revalidatePath } from 'next/cache'
import { saveAuthoringCourse, transitionAuthoringCourse, prepareBundleRevision, authoringMetadata, readAuthoringVersion } from '@/lib/learning/academy-authoring-service'
import { authoringStates } from '@/lib/learning/academy-authoring-contract'
export async function saveCourse(raw:unknown,id?:string,revision?:number){try{const result=await saveAuthoringCourse(raw,id,revision);revalidatePath('/platformbeheer/academy/cursussen');return {ok:true as const,...result}}catch(error){return {ok:false as const,message:error instanceof Error&&error.message==='PUBLISHED_IDENTITY_IMMUTABLE'?'De cursusidentiteit hoort bij een bestaande cursus. Behoud de oorspronkelijke titel en adresnaam. Voor een andere identiteit is een afzonderlijk versieplan nodig.':'Opslaan is niet gelukt. Controleer alle velden en ververs bij een gelijktijdige wijziging.'}}}
export async function changeCourseState(id:string,revision:number,state:string,reason:string,legalReference?:string){try{if(!authoringStates.includes(state as typeof authoringStates[number]))throw Error('INVALID_STATE');await transitionAuthoringCourse(id,revision,state as typeof authoringStates[number],reason,legalReference);revalidatePath('/platformbeheer/academy/cursussen');return {ok:true as const}}catch(error){return {ok:false as const,message:error instanceof Error && error.message==='INCOMPLETE_LESSONS' ? 'Vul de cursusomschrijving, categorie, niveau, alle lessen, oefenvragen en eindtoets in. Controleer de antwoorden en de slagingsnorm.' : error instanceof Error && error.message==='MANAGEMENT_INCOMPLETE' ? 'Vul de leerdoelen, doelgroep, uitgebreide omschrijving, beoordelaar, certificaatkeuze en prijs in. Een actieprijs moet lager zijn dan de reguliere prijs.' : error instanceof Error && error.message==='ASSIGNED_REVIEWER_REQUIRED' ? 'Alleen de aangewezen inhoudelijke beoordelaar kan goedkeuren.' : error instanceof Error && error.message==='LEGAL_REVIEW_REQUIRED' ? 'Vermeld de referentie naar de juridische goedkeuring voor deze versie.' : error instanceof Error && error.message==='MISSING_CERTIFICATE_DESIGN' ? 'Koppel eerst een actief ontwerp in Certificaatsjablonen.' : error instanceof Error&&error.message==='STUDENT_EXAM_UNAVAILABLE'?'De studententoets ondersteunt deze cursusversie nog niet. Het goedgekeurde concept blijft behouden.':error instanceof Error&&error.message==='HISTORICAL_STUDENT_ROUTE_ACTIVE'?'De huidige WL-001-studentroute gebruikt de historische versie. Rond het versieovergangsplan af voordat u de opvolger publiceert.':error instanceof Error&&error.message==='ACTIVE_ENROLLMENTS_REQUIRE_VERSION_PLAN'?'Deze cursus heeft nog actieve cursisten zonder afgeronde eindtoets of met een lopende poging. Publiceer de opvolger pas na een veilig overgangsplan.':'De overgang is geweigerd. Controleer de revisie, inhoud en vereiste goedkeuring.'}}}

export async function prepareCourseRevision(id: string, version: string) {
 try { return { ok: true as const, bundle: await prepareBundleRevision(id, version) } }
 catch { return { ok: false as const, message: 'Nieuwe versie is niet voorbereid. Kies een andere versienaam en controleer uw bevoegdheid.' } }
}

export async function copyCourse(id:string,revision:number,version:string) {
  try {
    const source=await readAuthoringVersion(id)
    const {authoring}=authoringMetadata(source.sourceMetadata)
    if (source.version===version || authoring.revision!==revision || !('slug' in authoring.content)) throw Error()
    const draft=await saveAuthoringCourse({...authoring.content,version})
    return {ok:true as const,id:draft.id}
  } catch {return {ok:false as const,message:'Kopiëren is niet gelukt. Heropen de bronversie en kies een ongebruikte versienaam.'}}
}
