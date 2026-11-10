'use server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { designStates } from '@/lib/learning/certificate-design-contract'
import { saveCertificateDesign,duplicateCertificateDesign,transitionCertificateDesign,bindCertificateDesign } from '@/lib/learning/certificate-design-service'
const path='/platformbeheer/academy/certificaten/sjablonen'
export async function saveDesign(raw:unknown){
 try{const result=await saveCertificateDesign(raw);revalidatePath(path);return {ok:true as const,...result}}
 catch{return {ok:false as const,message:'Opslaan is niet gelukt. Controleer de velden, uw rechten en of iemand de versie heeft gewijzigd. Uw invoer blijft staan.'}}
}
export async function duplicateDesign(id:string,newVersion:boolean){
 try{const result=await duplicateCertificateDesign(id,newVersion);revalidatePath(path);return {ok:true as const,...result}}
 catch{return {ok:false as const,message:'Kopiëren is niet gelukt. Controleer uw rechten en probeer opnieuw.'}}
}
export async function changeDesignState(id:string,revision:number,next:string,reason:string){
 try{await transitionCertificateDesign(id,revision,z.enum(designStates).parse(next),reason);revalidatePath(path);return {ok:true as const}}
 catch{return {ok:false as const,message:'Overgang geweigerd. Controleer de review, afdrukruimte, afbeeldingen, gekoppelde cursussen en actuele revisie.'}}
}
export async function selectDesign(scope:string,id:string|null){
 try{await bindCertificateDesign(scope,id);revalidatePath(path);return {ok:true as const}}
 catch{return {ok:false as const,message:'Koppelen is niet gelukt. Kies een actief en goedgekeurd sjabloon.'}}
}
