import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { saveLearningMedia } from './learning-media-storage'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireAuthor } from './academy-authoring-service'
import { canTransitionDesign, designSchema, designStates, demoCertificateValues, type DesignState } from './certificate-design-contract'
import { certificateDesignChecksum, renderCertificateDesign } from './certificate-design-pdf'
const idSchema=z.string().uuid()
const reasonSchema=z.string().trim().min(10).max(500)
const json=(value:unknown)=>value as Prisma.InputJsonValue
const lock=async(tx:Prisma.TransactionClient)=>{await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('certificate-design-publication',0))::text`}
type Actor=Awaited<ReturnType<typeof requireAuthor>>
async function audit(tx:Prisma.TransactionClient,actor:Actor,id:string,action:string,metadata:Prisma.InputJsonValue){
 await tx.marketplaceAuditEvent.create({data:{actorUserId:actor.userId,organizationId:actor.platformOrganizationId,actorRole:'PLATFORM_'+actor.membershipRole,entityType:'LearningCertificateDesign',entityId:id,action,metadata}})
}
export async function listCertificateDesigns(){
 await requireAuthor()
 const db=getPrisma()
 const [designs,courses,bindings]=await Promise.all([
 db.learningCertificateDesign.findMany({orderBy:[{createdAt:'desc'},{version:'desc'}]}),
 db.learningCourse.findMany({select:{id:true,title:true,code:true},orderBy:{code:'asc'}}),
 db.learningCertificateDesignBinding.findMany(),
 ])
 return {designs:designs.map(d=>({...d,createdAt:d.createdAt.toISOString(),reviewedAt:d.reviewedAt?.toISOString()??null,definition:designSchema.parse(d.definition)})),courses,bindings:bindings.map(b=>({scope:b.scope,designId:b.designId}))}
}
export async function saveCertificateDesign(raw:unknown){
 const actor=await requireAuthor()
 const input=z.object({id:idSchema.optional(),revision:z.number().int().nonnegative(),name:z.string().trim().min(1).max(160),definition:designSchema}).strict().parse(raw)
 // Pin the bundled logo in the existing immutable media store, so later branding changes
 // cannot change an approved template or an already issued certificate.
 if(input.definition.elements.some(e=>e.kind==='image'&&e.source==='WORKMATCHR_LOGO')){
  const logo=await readFile(path.join(process.cwd(),'public','branding','workmatchr-logo.png'))
  const source=await saveLearningMedia(new File([logo],'workmatchr-logo.png',{type:'image/png'}))
  input.definition.elements=input.definition.elements.map(e=>e.kind==='image'&&e.source==='WORKMATCHR_LOGO'?{...e,source}:e)
 }
 return getPrisma().$transaction(async tx=>{
  await lock(tx)
  const old=input.id?await tx.learningCertificateDesign.findUniqueOrThrow({where:{id:input.id}}):null
  if(old && (old.state!=='DRAFT'||old.revision!==input.revision))throw Error('Het concept is gewijzigd of vergrendeld. Open opnieuw of maak een nieuwe versie.')
  const checksum=certificateDesignChecksum(input.definition)
  const data={name:input.name,definition:json(input.definition),checksum,reviewedChecksum:null,reviewedBy:null,reviewedAt:null}
  const result=old?await tx.learningCertificateDesign.update({where:{id:old.id},data:{...data,revision:{increment:1}}}):await tx.learningCertificateDesign.create({data:{...data,familyId:randomUUID(),version:1,createdBy:actor.userId}})
  await audit(tx,actor,result.id,'CERTIFICATE_DESIGN_SAVED',{revision:result.revision,checksum})
  return {id:result.id,revision:result.revision}
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable})
}
export async function duplicateCertificateDesign(id:string,newVersion:boolean){
 const actor=await requireAuthor();idSchema.parse(id)
 return getPrisma().$transaction(async tx=>{
  await lock(tx)
  const old=await tx.learningCertificateDesign.findUniqueOrThrow({where:{id}})
  const last=await tx.learningCertificateDesign.aggregate({where:{familyId:old.familyId},_max:{version:true}})
  const created=await tx.learningCertificateDesign.create({data:{name:old.name+(newVersion?'':' (kopie)'),familyId:newVersion?old.familyId:randomUUID(),version:newVersion?(last._max.version??0)+1:1,definition:json(old.definition),checksum:old.checksum,createdBy:actor.userId}})
  await audit(tx,actor,created.id,newVersion?'CERTIFICATE_DESIGN_VERSION_CREATED':'CERTIFICATE_DESIGN_DUPLICATED',{sourceId:id})
  return {id:created.id}
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable})
}
export async function transitionCertificateDesign(id:string,revision:number,next:DesignState,reason:string){
 const actor=await requireAuthor();idSchema.parse(id);z.enum(designStates).parse(next);reasonSchema.parse(reason)
 return getPrisma().$transaction(async tx=>{
  await lock(tx)
  const old=await tx.learningCertificateDesign.findUniqueOrThrow({where:{id}})
  if(old.revision!==revision || !canTransitionDesign(old.state as DesignState,next))throw Error('Deze overgang is niet toegestaan. Controleer de actuele versie.')
  if(certificateDesignChecksum(old.definition)!==old.checksum)throw Error('De ontwerpcontrole is mislukt.')
  if(next==='ACTIVE' && designSchema.parse(old.definition).elements.some(e=>e.kind==='image')) throw Error('Een ontwerp met afbeeldingen kan pas worden geactiveerd na borging van de permanente opslag.')
  if(['REVIEW','APPROVED','ACTIVE'].includes(next)){
   await renderCertificateDesign(old.definition,demoCertificateValues,true)
   await renderCertificateDesign(old.definition,{...demoCertificateValues,'deelnemer.naam':('Lange deelnemersnaam ').repeat(9).slice(0,200),'cursus.titel':('Lange cursustitel ').repeat(16).slice(0,240)},true)
  }
  if(next==='ACTIVE'){
   if(old.reviewedChecksum!==old.checksum || !old.reviewedBy)throw Error('Goedkeuring ontbreekt.')
   const previous=await tx.learningCertificateDesign.findMany({where:{familyId:old.familyId,state:'ACTIVE'}})
   for(const p of previous){
    await tx.learningCertificateDesign.update({where:{id:p.id},data:{state:'ARCHIVED',revision:{increment:1}}})
    await audit(tx,actor,p.id,'CERTIFICATE_DESIGN_SUPERSEDED',{replacementId:id})
   }
   await tx.learningCertificateDesign.update({where:{id},data:{state:'ACTIVE',revision:{increment:1}}})
   for(const p of previous)await tx.learningCertificateDesignBinding.updateMany({where:{designId:p.id},data:{designId:id}})
  }else{
   if(next==='ARCHIVED' && await tx.learningCertificateDesignBinding.count({where:{designId:id}}))throw Error('Kies eerst een vervangend sjabloon voor de gekoppelde cursussen of standaard.')
   await tx.learningCertificateDesign.update({where:{id},data:{state:next,revision:{increment:1},...(next==='APPROVED'?{reviewedBy:actor.userId,reviewedAt:new Date(),reviewedChecksum:old.checksum}:{})}})
  }
  await audit(tx,actor,id,'CERTIFICATE_DESIGN_'+next,{reason,checksum:old.checksum,revision:revision+1})
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000})
}
export async function bindCertificateDesign(scope:string,designId:string|null){
 const actor=await requireAuthor();if(scope!=='GLOBAL')idSchema.parse(scope);if(designId)idSchema.parse(designId)
 return getPrisma().$transaction(async tx=>{
  await lock(tx)
  if(scope!=='GLOBAL')await tx.learningCourse.findUniqueOrThrow({where:{id:scope}})
  if(designId){
   const design=await tx.learningCertificateDesign.findUniqueOrThrow({where:{id:designId}})
   if(designSchema.parse(design.definition).elements.some(e=>e.kind==='image'))throw Error('Kies een tekst-/QR-ontwerp totdat permanente beeldopslag is geborgd.')
   if(design.state!=='ACTIVE')throw Error('Kies een actief, goedgekeurd sjabloon.')
   await tx.learningCertificateDesignBinding.upsert({where:{scope},create:{scope,designId},update:{designId}})
  }else await tx.learningCertificateDesignBinding.deleteMany({where:{scope}})
  await audit(tx,actor,designId??actor.platformOrganizationId,'CERTIFICATE_DESIGN_BOUND',{scope,designId})
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable})
}
export { certificateDesignForIssue } from './certificate-design-issue'
