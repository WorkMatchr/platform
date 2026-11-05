import { academyAlumniRefundState, type AcademyRefundEvidence } from './academy-alumni-refund-policy'
import { z } from 'zod'
import { commerceAssert } from './academy-commerce-policy'
export const ACADEMY_SEAT_ALLOCATION_VERSION = 'ORIGINAL_SEAT_CONSIDERATION_V1'
const cents = z.number().int().min(0).max(2147483647)
const snapshotSchema = z.object({ formatVersion: z.literal(1), quantity: z.union([z.literal(1), z.literal(5)]), originalGrossCents: cents,
  finalGrossCents: cents, discountGrossCents: cents, scheme: z.object({ kind: z.enum(['NONE','ALUMNI','CODE','ACCOUNT','ORGANIZATION']), grossCents: cents }) })
const proofSchema = z.object({ applied: z.literal(true), participants: z.array(z.object({ position: z.number().int().min(1).max(5), discountCents: cents })).min(1).max(5) })
/** Deterministic consideration, not a legal refund entitlement. Never reads current catalogue prices. */
export function originalAcademySeatAmounts(input: { quantity: number; pricingSnapshot: unknown; benefitProof: unknown; amountInclVatCents: number; seats: Array<{ id: string; position: number }> }) {
  const review = 'ACADEMY_ALUMNI_REFUND_REVIEW_REQUIRED'
  const parsed = snapshotSchema.safeParse(input.pricingSnapshot)
  commerceAssert(parsed.success, review)
  const snapshot = parsed.data
  commerceAssert(snapshot.quantity === input.quantity && snapshot.finalGrossCents === input.amountInclVatCents
    && snapshot.scheme.grossCents === snapshot.finalGrossCents && snapshot.originalGrossCents - snapshot.discountGrossCents === snapshot.finalGrossCents
    && input.seats.length === input.quantity && new Set(input.seats.map(s => s.id)).size === input.quantity
    && input.seats.every(s => Number.isInteger(s.position) && s.position >= 1 && s.position <= input.quantity)
    && new Set(input.seats.map(s => s.position)).size === input.quantity, review)
  let discounts = new Map<number, number>()
  if (snapshot.scheme.kind === 'ALUMNI') {
    const proof = proofSchema.safeParse(input.benefitProof)
    commerceAssert(proof.success && proof.data.participants.length === input.quantity, review)
    discounts = new Map(proof.data.participants.map(p => [p.position, p.discountCents]))
    commerceAssert(discounts.size === input.quantity && input.seats.every(s => discounts.has(s.position))
      && [...discounts.values()].reduce((sum, n) => sum + n, 0) === snapshot.discountGrossCents, review)
  } else if (snapshot.scheme.kind === 'NONE') commerceAssert(snapshot.discountGrossCents === 0, review)
  const base = snapshot.scheme.kind === 'ALUMNI' ? snapshot.originalGrossCents : snapshot.finalGrossCents
  const result = [...input.seats].sort((a,b) => a.position - b.position).map(seat => ({ seatId: seat.id, position: seat.position,
    originalAmountCents: Math.floor(base / input.quantity) + (seat.position <= base % input.quantity ? 1 : 0) - (discounts.get(seat.position) ?? 0) }))
  commerceAssert(result.every(s => s.originalAmountCents >= 0) && result.reduce((sum, s) => sum + s.originalAmountCents, 0) === snapshot.finalGrossCents, review)
  return result
}

/** Confirmed money only; access revocation is a separate decision. No historical inference. */
export function academySeatAlumniState(input: Parameters<typeof originalAcademySeatAmounts>[0] & {
 seatId: string;
 refunds: Array<AcademyRefundEvidence & { seatAllocations: Array<{seatId:string;amountCents:number;originalAmountCents:number;policyVersion:string}> }>;
}): 'ELIGIBLE' | 'FULLY_REFUNDED' | 'REVIEW_REQUIRED' {
 const total = academyAlumniRefundState(input.amountInclVatCents,input.refunds)
 if(total==='INVALID')return 'REVIEW_REQUIRED'
 if(total==='FULL')return 'FULLY_REFUNDED'
 if(total==='NONE')return 'ELIGIBLE'
 try {
  const originals=originalAcademySeatAmounts(input)
  const own=originals.find(s=>s.seatId===input.seatId)
  if(!own)return 'REVIEW_REQUIRED'
  const confirmed=[...new Map(input.refunds.filter(r=>r.status==='REFUNDED').map(r=>[r.id,r])).values()]
  const used=new Map<string,number>()
  for(const refund of confirmed){
   if(!Array.isArray(refund.seatAllocations)||refund.seatAllocations.reduce((sum,a)=>sum+a.amountCents,0)!==refund.amountCents
    ||new Set(refund.seatAllocations.map(a=>a.seatId)).size!==refund.seatAllocations.length)return 'REVIEW_REQUIRED'
   for(const a of refund.seatAllocations){
    const original=originals.find(s=>s.seatId===a.seatId)
    if(!original||a.policyVersion!==ACADEMY_SEAT_ALLOCATION_VERSION||a.originalAmountCents!==original.originalAmountCents
     ||!Number.isSafeInteger(a.amountCents)||a.amountCents<=0)return 'REVIEW_REQUIRED'
    used.set(a.seatId,(used.get(a.seatId)??0)+a.amountCents)
    if(used.get(a.seatId)!>original.originalAmountCents)return 'REVIEW_REQUIRED'
   }
  }
  return own.originalAmountCents>0&&(used.get(own.seatId)??0)===own.originalAmountCents?'FULLY_REFUNDED':'ELIGIBLE'
 }catch {return 'REVIEW_REQUIRED'}
}
