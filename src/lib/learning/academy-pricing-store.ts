import 'server-only'
import type {Prisma} from '@/generated/prisma/client'
import {lockAcademyCommerce} from './academy-commerce-access'
import {commerceAssert} from './academy-commerce-policy'
import {defaultAcademyPrices,academyPromotionApplies,chooseAcademyPrice,type AcademyPrices,type PricingContext,type AcademyPromotion} from './academy-pricing-policy'
export async function readAcademyPrices(tx: Prisma.TransactionClient, courseId: string): Promise<AcademyPrices> {
  return await tx.learningAcademyPriceVersion.findFirst({where:{scopeKey:courseId},orderBy:{revision:'desc'}})
    ?? await tx.learningAcademyPriceVersion.findFirst({where:{scopeKey:'DEFAULT'},orderBy:{revision:'desc'}}) ?? defaultAcademyPrices
}
export async function quoteAcademyPrice(tx: Prisma.TransactionClient, context: PricingContext, alumniGrossCents:number|null) {
  await lockAcademyCommerce(tx,'pricing')
  const prices=await readAcademyPrices(tx,context.courseId)
  const rows=await tx.learningAcademyPromotion.findMany({where:{OR:[{kind:'ACCOUNT',userId:context.buyerUserId},...(context.organizationId?[{kind:'ORGANIZATION',organizationId:context.organizationId}]:[]),...(context.code?[{kind:'CODE',code:context.code.trim().toUpperCase()}]:[])]}})
  const available:AcademyPromotion[]=[]
  for(const p of rows) {
    if(!academyPromotionApplies(p,context))continue
    const total=await tx.learningAcademyPromotionUse.count({where:{promotionId:p.id,status:{in:['RESERVED','COMMITTED']}}})
    const personal=await tx.learningAcademyPromotionUse.count({where:{promotionId:p.id,buyerUserId:context.buyerUserId,status:{in:['RESERVED','COMMITTED']}}})
    if((p.maximumUses===null||total<p.maximumUses)&&(p.maximumPerAccount===null||personal<p.maximumPerAccount))available.push(p)
  }
  commerceAssert(!context.code||available.some(p=>p.kind==='CODE'),'ACADEMY_CODE_NOT_AVAILABLE')
  return {prices,...chooseAcademyPrice(prices,context.quantity,available,alumniGrossCents)}
}

export async function settleAcademyPromotionUse(tx:Prisma.TransactionClient,orderId:string,status:'PAID'|'CANCELED'|'FAILED'|'EXPIRED') {
  await lockAcademyCommerce(tx,'pricing')
  const now=new Date()
  await tx.learningAcademyPromotionUse.updateMany({where:{orderId,status:'RESERVED'},data:status==='PAID'?{status:'COMMITTED',committedAt:now}:{status:'RELEASED',releasedAt:now}})
}
