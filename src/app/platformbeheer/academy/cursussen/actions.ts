'use server'
import { revalidatePath } from 'next/cache'
import { saveAuthoringCourse, transitionAuthoringCourse } from '@/lib/learning/academy-authoring-service'
import { authoringStates } from '@/lib/learning/academy-authoring-contract'
export async function saveCourse(raw:unknown,id?:string,revision?:number){try{const result=await saveAuthoringCourse(raw,id,revision);revalidatePath('/platformbeheer/academy/cursussen');return {ok:true as const,...result}}catch{return {ok:false as const,message:'Opslaan is niet gelukt. Controleer alle velden en ververs bij een gelijktijdige wijziging.'}}}
export async function changeCourseState(id:string,revision:number,state:string,reason:string){try{if(!authoringStates.includes(state as typeof authoringStates[number]))throw Error('INVALID_STATE');await transitionAuthoringCourse(id,revision,state as typeof authoringStates[number],reason);revalidatePath('/platformbeheer/academy/cursussen');return {ok:true as const}}catch{return {ok:false as const,message:'De overgang is geweigerd. Controleer de revisie, inhoud en vereiste goedkeuring.'}}}
