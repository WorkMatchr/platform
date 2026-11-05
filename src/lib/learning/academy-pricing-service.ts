import 'server-only'
import { regularAcademyCourses, registeredAcademyAccounts, registeredAcademyOrganizations } from './academy-admin-selection'
import { createHash } from 'node:crypto'
import { getPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/authorization'
import { getPlatformOperatorContext } from '@/lib/platform-admin/platform-admin-authorization'
import { requireMarketplacePlatformAdmin } from '@/lib/marketplace/marketplace-authorization'
import { runSerializableFinancialTransaction } from '@/lib/finance/financial-transaction'
import { assertAcademyDatabaseTarget } from './academy-database-policy'
import { lockAcademyCommerce,requireAcademyOrganizationBuyer } from './academy-commerce-access'
import { commerceAssert } from './academy-commerce-policy'
import { academyPriceWrite, academyPromotionWrite, defaultAcademyPrices, academyAlumniGross } from './academy-pricing-policy'

export function assertAcademyPricingEnvironment() {
  assertAcademyDatabaseTarget({databaseUrl:process.env.DATABASE_URL,projectId:process.env.ACADEMY_TEST_PROJECT_ID,branchId:process.env.ACADEMY_TEST_BRANCH_ID,nodeEnv:process.env.NODE_ENV,vercelEnv:process.env.VERCEL_ENV})
  commerceAssert(!process.env.VERCEL && !process.env.RESEND_API_KEY, 'ACADEMY_PRICING_PRODUCTION_REFUSED')
}
export async function saveAcademyPrices(actorId: string, raw: unknown) {
  assertAcademyPricingEnvironment()
  const input=academyPriceWrite.parse(raw)
  return runSerializableFinancialTransaction(async tx=>{
    await requireMarketplacePlatformAdmin(tx,actorId)
    await lockAcademyCommerce(tx,'pricing')
    if(input.courseId) commerceAssert(await tx.learningCourse.findUnique({where:{id:input.courseId}}),'ACADEMY_PRICE_COURSE_INVALID')
    const scopeKey=input.courseId??'DEFAULT'
    const old=await tx.learningAcademyPriceVersion.findFirst({where:{scopeKey},orderBy:{revision:'desc'}})
    commerceAssert((old?.id??null)===input.expectedVersionId,'ACADEMY_PRICE_STALE')
    const values={courseId:input.courseId,individualCents:input.individualCents,fiveCents:input.fiveCents,followUpIndividualCents:input.followUpIndividualCents,followUpFiveCents:input.followUpFiveCents,vatRateBps:input.vatRateBps,vatTreatment:input.vatTreatment,taxStatus:input.taxStatus,taxReference:input.taxReference}
    const created=await tx.learningAcademyPriceVersion.create({data:{...values,scopeKey,revision:(old?.revision??0)+1,createdByUserId:actorId}})
    await tx.adminActionLog.create({data:{actorUserId:actorId,action:'ACADEMY_PRICE_CHANGED',entityType:'LearningAcademyPriceVersion',entityId:created.id,metadata:{before:JSON.parse(JSON.stringify(old??defaultAcademyPrices)),after:JSON.parse(JSON.stringify(created))}}})
    return {id:created.id,revision:created.revision}
  })
}
export async function saveAcademyPromotion(actorId:string,raw:unknown) {
  assertAcademyPricingEnvironment()
  const input=academyPromotionWrite.parse(raw)
  return runSerializableFinancialTransaction(async tx=>{
    await requireMarketplacePlatformAdmin(tx,actorId)
    await lockAcademyCommerce(tx,'pricing')
    if(input.userId) commerceAssert(await tx.user.findUnique({where:{id:input.userId}}),'ACADEMY_PROMOTION_TARGET_INVALID')
    if(input.organizationId) commerceAssert(await tx.organization.findFirst({where:{id:input.organizationId,systemKey:null}}),'ACADEMY_PROMOTION_TARGET_INVALID')
    commerceAssert(await tx.learningCourse.count({where:{id:{in:input.courseIds}}})===input.courseIds.length,'ACADEMY_PROMOTION_COURSE_INVALID')
    const {id,expectedRevision,creationKey,...rest}=input
    const values={...rest,validFrom:rest.validFrom?new Date(rest.validFrom):null,validUntil:rest.validUntil?new Date(rest.validUntil):null}
    const fingerprint=createHash('sha256').update(JSON.stringify(values)).digest('hex')
    const old=id?await tx.learningAcademyPromotion.findUnique({where:{id}}):await tx.learningAcademyPromotion.findUnique({where:{createdByUserId_creationKey:{createdByUserId:actorId,creationKey}}})
    if(!id&&old) {commerceAssert(old.creationFingerprint===fingerprint,'ACADEMY_PROMOTION_IDEMPOTENCY_CONFLICT');return {id:old.id,revision:old.revision}}
    if(id) {
      commerceAssert(old&&old.revision===expectedRevision,'ACADEMY_PROMOTION_STALE')
      commerceAssert(old.kind===values.kind&&old.code===values.code&&old.userId===values.userId&&old.organizationId===values.organizationId,'ACADEMY_PROMOTION_IDENTITY_IMMUTABLE')
      const total=await tx.learningAcademyPromotionUse.count({where:{promotionId:id,status:{in:['RESERVED','COMMITTED']}}})
      commerceAssert(input.maximumUses===null||input.maximumUses>=total,'ACADEMY_PROMOTION_LIMIT_BELOW_USAGE')
      if(input.maximumPerAccount!==null) {
        const grouped=await tx.learningAcademyPromotionUse.groupBy({by:['buyerUserId'],where:{promotionId:id,status:{in:['RESERVED','COMMITTED']}},_count:{_all:true}})
        commerceAssert(grouped.every(g=>g._count._all<=input.maximumPerAccount!),'ACADEMY_PROMOTION_LIMIT_BELOW_USAGE')
      }
    }
    const row=id?await tx.learningAcademyPromotion.update({where:{id},data:{...values,revision:old!.revision+1}}):await tx.learningAcademyPromotion.create({data:{...values,creationKey,creationFingerprint:fingerprint,createdByUserId:actorId}})
    await tx.adminActionLog.create({data:{actorUserId:actorId,action:id?'ACADEMY_PROMOTION_CHANGED':'ACADEMY_PROMOTION_CREATED',entityType:'LearningAcademyPromotion',entityId:row.id,metadata:{before:old?JSON.parse(JSON.stringify(old)):null,after:JSON.parse(JSON.stringify(row))}}})
    return {id:row.id,revision:row.revision}
  })
}
export async function readAcademyPricingAdmin(search='') {
  assertAcademyPricingEnvironment()
  const actor=await getCurrentUser();commerceAssert(actor,'ACADEMY_PRICING_UNAUTHORIZED');await getPlatformOperatorContext(actor.id)
  const db=getPrisma()
  const [courses,versions,promotions,users,organizations]=await Promise.all([
    db.learningCourse.findMany({where:regularAcademyCourses,select:{id:true,code:true,title:true},orderBy:{code:'asc'}}),
    db.learningAcademyPriceVersion.findMany({orderBy:[{scopeKey:'asc'},{revision:'desc'}]}),
    db.learningAcademyPromotion.findMany({where:search?{OR:[{code:{contains:search.trim().toUpperCase()}},{label:{contains:search.trim(),mode:'insensitive'}}]}:{},include:{uses:{select:{status:true}}},orderBy:{createdAt:'desc'},take:100}),
    db.user.findMany({where:registeredAcademyAccounts,select:{id:true,displayName:true,email:true},orderBy:{displayName:'asc'},take:250}),
    db.organization.findMany({where:registeredAcademyOrganizations,select:{id:true,name:true},orderBy:{name:'asc'},take:250}),
  ])
  return {courses,versions,promotions,users,organizations}
}

export {readAcademyPrices,quoteAcademyPrice} from './academy-pricing-store'

export async function previewAcademyPricing(actorId:string,input:{courseId:string;quantity:1|5;buyerUserId:string;organizationId:string|null;code?:string;eligible:number}) {
  assertAcademyPricingEnvironment()
  commerceAssert([1,5].includes(input.quantity)&&Number.isInteger(input.eligible)&&input.eligible>=0&&input.eligible<=input.quantity,'ACADEMY_PRICE_INVALID')
  return runSerializableFinancialTransaction(async tx=>{
    await requireMarketplacePlatformAdmin(tx,actorId)
    commerceAssert(await tx.learningCourse.findUnique({where:{id:input.courseId}}),'ACADEMY_PRICE_COURSE_INVALID')
    commerceAssert(await tx.user.findUnique({where:{id:input.buyerUserId}}),'ACADEMY_PROMOTION_TARGET_INVALID')
    if(input.organizationId)await requireAcademyOrganizationBuyer(tx,input.buyerUserId,input.organizationId)
    commerceAssert(input.quantity===1||input.organizationId,'ACADEMY_BILLING_CONTEXT_INVALID')
    const {readAcademyPrices,quoteAcademyPrice}=await import('./academy-pricing-store')
    await lockAcademyCommerce(tx,'pricing')
    const prices=await readAcademyPrices(tx,input.courseId)
    const result=await quoteAcademyPrice(tx,{...input,now:new Date()},academyAlumniGross(prices,input.quantity,input.eligible))
    return {original:result.originalGrossCents,discount:result.discountGrossCents,total:result.financial.amountInclVatCents,label:result.chosen.label}
  })
}
