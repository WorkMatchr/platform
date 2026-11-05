import {describe,it,expect} from 'vitest'
import {originalAcademySeatAmounts,academySeatAlumniState,ACADEMY_SEAT_ALLOCATION_VERSION as policyVersion} from './academy-seat-refund-policy'
const seats=Array.from({length:5},(_,i)=>({id:`seat-${i}`,position:i+1}))
const original={quantity:5,amountInclVatCents:59500,seats,benefitProof:{},pricingSnapshot:{formatVersion:1,quantity:5,originalGrossCents:59500,finalGrossCents:59500,discountGrossCents:0,scheme:{kind:'NONE',grossCents:59500}}}
const line=(seatId:string,amountCents:number)=>({seatId,amountCents,originalAmountCents:11900,policyVersion})
const refunded=(id:string,seatId:string,amountCents:number)=>({id,status:'REFUNDED',amountCents,seatAllocations:[line(seatId,amountCents)]})
const state=(refunds:Parameters<typeof academySeatAlumniState>[0]['refunds'])=>academySeatAlumniState({...original,seatId:'seat-0',refunds})
describe('immutable original seat consideration',()=>{
 it.each([0,1,2,3,4,5])('attributes personal alumni discount for %s alumni',n=>{
  const gross=59500-n*600
  const input={...original,amountInclVatCents:gross,benefitProof:{applied:true,participants:seats.map(s=>({position:s.position,discountCents:s.position<=n?600:0}))},pricingSnapshot:{...original.pricingSnapshot,finalGrossCents:gross,discountGrossCents:n*600,scheme:{kind:'ALUMNI',grossCents:gross}}}
  const allocations=originalAcademySeatAmounts(input)
  expect(allocations.map(s=>s.originalAmountCents)).toEqual(seats.map(s=>s.position<=n?11300:11900))
  expect(allocations.reduce((sum,s)=>sum+s.originalAmountCents,0)).toBe(gross)
 })
 it.each(['CODE','ACCOUNT','ORGANIZATION'])('divides package discount %s with deterministic final cents',kind=>{
  const input={...original,amountInclVatCents:50003,pricingSnapshot:{...original.pricingSnapshot,finalGrossCents:50003,discountGrossCents:9497,scheme:{kind,grossCents:50003}}}
  expect(originalAcademySeatAmounts(input).map(s=>s.originalAmountCents)).toEqual([10001,10001,10001,10000,10000])
  expect(originalAcademySeatAmounts({...input,seats:[...seats].reverse()})).toEqual(originalAcademySeatAmounts(input))
 })
 it('supports the original individual paid amount',()=>{
  const input={...original,quantity:1,seats:[seats[0]],amountInclVatCents:14900,pricingSnapshot:{formatVersion:1,quantity:1,originalGrossCents:14900,finalGrossCents:14900,discountGrossCents:0,scheme:{kind:'NONE',grossCents:14900}}}
  expect(originalAcademySeatAmounts(input)[0].originalAmountCents).toBe(14900)
 })
 it('refuses absent or inconsistent historical proof instead of guessing',()=>{
  expect(()=>originalAcademySeatAmounts({...original,pricingSnapshot:{}})).toThrow('REVIEW_REQUIRED')
  expect(()=>originalAcademySeatAmounts({...original,seats:[seats[0],seats[0],...seats.slice(2)]})).toThrow('REVIEW_REQUIRED')
  expect(()=>originalAcademySeatAmounts({...original,pricingSnapshot:{...original.pricingSnapshot,scheme:{kind:'ALUMNI',grossCents:59500}}})).toThrow('REVIEW_REQUIRED')
  expect(()=>originalAcademySeatAmounts({...original,amountInclVatCents:1})).toThrow('REVIEW_REQUIRED')
 })
})
describe('confirmed refunds per participant',()=>{
 it('keeps benefit after own partial refund',()=>expect(state([refunded('a','seat-0',5000)])).toBe('ELIGIBLE'))
 it('removes benefit after cumulative own full refund while package is partial',()=>expect(state([refunded('a','seat-0',5000),refunded('b','seat-0',6900)])).toBe('FULLY_REFUNDED'))
 it('never attributes another seat refund to this participant',()=>expect(state([refunded('a','seat-1',11900)])).toBe('ELIGIBLE'))
 it.each(['PENDING','FAILED','CANCELED'])('does not treat %s as confirmed money',status=>expect(state([{...refunded('a','seat-0',11900),status}])).toBe('ELIGIBLE'))
 it('deduplicates identical delivery evidence',()=>{const a=refunded('a','seat-0',6000);expect(state([a,a])).toBe('ELIGIBLE')})
 it('requires manual review for inconsistent duplicate records',()=>expect(state([refunded('a','seat-0',6000),refunded('a','seat-0',5000)])).toBe('REVIEW_REQUIRED'))
 it('recognizes full original purchase refund without inventing historic seat allocation',()=>expect(state([{id:'legacy',status:'REFUNDED',amountCents:59500,seatAllocations:[]}])).toBe('FULLY_REFUNDED'))
 it('requires manual review for missing partial history',()=>expect(state([{id:'legacy',status:'REFUNDED',amountCents:100,seatAllocations:[]}])).toBe('REVIEW_REQUIRED'))
 it('refuses excessive seat refunds even below the package total',()=>expect(state([refunded('a','seat-0',11900),refunded('b','seat-0',1)])).toBe('REVIEW_REQUIRED'))
 it('checks allocation origin, policy and amount rather than access-revocation seat IDs',()=>{
  for(const change of [{originalAmountCents:100},{policyVersion:'unknown'},{seatId:'foreign'},{amountCents:0}]){
   expect(state([{...refunded('a','seat-0',100),seatAllocations:[{...line('seat-0',100),...change}]}])).toBe('REVIEW_REQUIRED')
  }
 })
})
