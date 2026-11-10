import { z } from 'zod'
import { ACADEMY_FIXED_PRICES, AcademyCommerceError, commerceAssert, academyPriceDecision, type AcademyPriceDecision } from './academy-commerce-policy'

export const academyMoney = z.string().trim().regex(/^\d{1,8}(?:[.,]\d{1,2})?$/, 'Gebruik een bedrag met maximaal twee decimalen.').transform(value => {
  const [euros, fraction = ''] = value.replace(',', '.').split('.')
  return Number(euros) * 100 + Number(fraction.padEnd(2, '0'))
}).pipe(z.number().int().min(0).max(2_000_000_000))
const tax = z.object({ vatRateBps: z.union([z.literal(0), z.literal(900), z.literal(2100)]), vatTreatment: z.enum(['TAXABLE', 'EXEMPT']), taxStatus: z.enum(['TAX_REVIEW_REQUIRED', 'APPROVED']), taxReference: z.string().trim().max(500).default('') })
export const academyPriceWrite = z.object({ courseId: z.uuid().nullable(), expectedVersionId: z.uuid().nullable(), individualCents: academyMoney, fiveCents: academyMoney, followUpIndividualCents: academyMoney, followUpFiveCents: academyMoney, ...tax.shape }).strict().superRefine((v, ctx) => {
  if (v.followUpIndividualCents > v.individualCents || v.followUpFiveCents > v.fiveCents) ctx.addIssue({ code: 'custom', message: 'De vervolgprijs mag niet hoger zijn dan de standaardprijs.' })
  if (v.taxStatus === 'APPROVED' && v.taxReference.length < 10) ctx.addIssue({ code: 'custom', message: 'Leg de referentie naar het formele fiscale besluit vast.' })
  if (v.vatTreatment === 'EXEMPT' && (v.vatRateBps !== 0 || v.taxStatus !== 'APPROVED')) ctx.addIssue({ code: 'custom', message: 'Vrijstelling vereist een vastgelegd fiscaal besluit en 0%.' })
})
export type AcademyPrices = { id: string | null; revision: number; scopeKey: string; individualCents: number; fiveCents: number; followUpIndividualCents: number; followUpFiveCents: number; vatRateBps: number; vatTreatment: string; taxStatus: string; taxReference: string }
export const defaultAcademyPrices: AcademyPrices = Object.freeze({ id: null, revision: 0, scopeKey: 'DEFAULT', individualCents: ACADEMY_FIXED_PRICES.individual, fiveCents: ACADEMY_FIXED_PRICES.five, followUpIndividualCents: ACADEMY_FIXED_PRICES.followUpIndividual, followUpFiveCents: ACADEMY_FIXED_PRICES.followUpFive, vatRateBps: 2100, vatTreatment: 'TAXABLE', taxStatus: 'TAX_REVIEW_REQUIRED', taxReference: '' })
export const normalizeAcademyPromotionCode = (code: string) => code.trim().toUpperCase()
const nullableDate = z.string().datetime({ offset: true }).nullable()
export const academyPromotionWrite = z.object({ id: z.uuid().optional(), expectedRevision: z.number().int().positive().optional(), creationKey: z.uuid(), kind: z.enum(['ACCOUNT','ORGANIZATION','CODE']), label: z.string().trim().min(3).max(120), code: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/).transform(normalizeAcademyPromotionCode).nullable(), userId: z.uuid().nullable(), organizationId: z.uuid().nullable(), percentage: z.number().int().min(0).max(100), courseIds: z.array(z.uuid()).max(500), active: z.boolean(), validFrom: nullableDate, validUntil: nullableDate, maximumUses: z.number().int().positive().nullable(), maximumPerAccount: z.number().int().positive().nullable(), quantity: z.union([z.literal(1),z.literal(5)]).nullable() }).strict().superRefine((v, ctx) => {
  if ((v.kind === 'ACCOUNT' ? !v.userId || v.organizationId || v.code : v.kind === 'ORGANIZATION' ? !v.organizationId || v.userId || v.code : !v.code || v.userId || v.organizationId)) ctx.addIssue({ code: 'custom', message: 'Kies precies het passende account, de organisatie of actiecode.' })
  if (new Set(v.courseIds).size !== v.courseIds.length) ctx.addIssue({ code: 'custom', message: 'Selecteer iedere opleiding eenmaal.' })
  if (v.validFrom && v.validUntil && new Date(v.validFrom) >= new Date(v.validUntil)) ctx.addIssue({ code: 'custom', message: 'De einddatum moet na de begindatum liggen.' })
  if (Boolean(v.id) !== Boolean(v.expectedRevision)) ctx.addIssue({ code: 'custom', message: 'De kortingsversie ontbreekt.' })
})
export type AcademyPromotion = { id: string; revision: number; kind: string; label: string; code: string | null; userId: string | null; organizationId: string | null; percentage: number; courseIds: string[]; active: boolean; validFrom: Date | null; validUntil: Date | null; maximumUses: number | null; maximumPerAccount: number | null; quantity: number | null }
export type PricingContext = { buyerUserId: string; organizationId: string | null; courseId: string; quantity: 1 | 5; code?: string; now: Date }
export function academyPromotionApplies(p: AcademyPromotion, c: PricingContext) {
  return p.active && (!p.validFrom || p.validFrom <= c.now) && (!p.validUntil || p.validUntil > c.now) && (!p.quantity || p.quantity === c.quantity) && (!p.courseIds.length || p.courseIds.includes(c.courseId)) && (p.kind === 'ACCOUNT' ? p.userId === c.buyerUserId : p.kind === 'ORGANIZATION' ? Boolean(c.organizationId) && p.organizationId === c.organizationId : p.kind === 'CODE' && Boolean(c.code) && p.code === normalizeAcademyPromotionCode(c.code!))
}
export type AcademyChosenScheme = { kind: 'NONE' | 'ALUMNI' | 'ACCOUNT' | 'ORGANIZATION' | 'CODE'; id: string | null; revision: number | null; label: string; percentage: number | null; grossCents: number }
// Stable tie order avoids consuming an action code when an equally good automatic right exists.
const priority = { NONE: 0, ALUMNI: 1, ACCOUNT: 2, ORGANIZATION: 3, CODE: 4 }
export function chooseAcademyPrice(prices: AcademyPrices, quantity: 1 | 5, promotions: AcademyPromotion[], alumniGrossCents: number | null) {
  const base = quantity === 1 ? prices.individualCents : prices.fiveCents
  const candidates: AcademyChosenScheme[] = [{ kind: 'NONE', id: null, revision: null, label: 'Standaardprijs', percentage: null, grossCents: base }]
  if (alumniGrossCents !== null) { commerceAssert(Number.isInteger(alumniGrossCents) && alumniGrossCents >= 0 && alumniGrossCents <= base, 'ACADEMY_PRICE_INVALID'); candidates.push({kind:'ALUMNI',id:null,revision:null,label:'Vervolgleervoordeel',percentage:null,grossCents:alumniGrossCents}) }
  for (const p of promotions) {
    commerceAssert(Number.isInteger(p.percentage) && p.percentage >= 0 && p.percentage <= 100 && p.kind in priority && p.kind !== 'NONE' && p.kind !== 'ALUMNI', 'ACADEMY_PROMOTION_INVALID')
    candidates.push({kind:p.kind as 'ACCOUNT'|'ORGANIZATION'|'CODE',id:p.id,revision:p.revision,label:p.label,percentage:p.percentage,grossCents:base-Math.round(base*p.percentage/100)})
  }
  const chosen = candidates.sort((a,b)=>a.grossCents-b.grossCents || priority[a.kind]-priority[b.kind] || (a.id??'').localeCompare(b.id??''))[0]
  const net = (gross:number) => Math.round(gross*10000/(10000+prices.vatRateBps))
  commerceAssert(prices.vatTreatment !== 'EXEMPT' || prices.vatRateBps === 0 && prices.taxStatus === 'APPROVED' && prices.taxReference.length >= 10, 'ACADEMY_TAX_EXEMPTION_NOT_ESTABLISHED')
  const amountExclVatCents=net(chosen.grossCents), baseAmountCents=net(base)
  return { chosen, originalGrossCents:base, discountGrossCents:base-chosen.grossCents, financial:{baseAmountCents,packageDiscountCents:baseAmountCents-amountExclVatCents,proDiscountCents:0,discountCodeDiscountCents:0,amountExclVatCents,vatRateBps:prices.vatRateBps,vatAmountCents:chosen.grossCents-amountExclVatCents,amountInclVatCents:chosen.grossCents,currency:'EUR' as const} }
}
export function academyTaxDecision(prices: AcademyPrices): AcademyPriceDecision {
  return { ...academyPriceDecision, version: prices.id ?? academyPriceDecision.version, vatRateBps: prices.vatRateBps as 0|900|2100, vatTreatment:prices.vatTreatment as 'TAXABLE'|'EXEMPT',taxStatus:prices.taxStatus as 'TAX_REVIEW_REQUIRED'|'APPROVED',exemptionLegalBasis:prices.taxReference }
}
export function academyPricingError(error: unknown) {
  if(error instanceof AcademyCommerceError) return error.code
  return 'ACADEMY_PRICING_INVALID'
}

export function academyAmsterdamDateToIso(value:string|null):string|null {
  if(!value)return null
  commerceAssert(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value),'ACADEMY_DATE_INVALID')
  const nominal=Date.parse(value+'Z'), matches:string[]=[]
  for(const offset of [60,120]) {
    const candidate=new Date(nominal-offset*60000)
    const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(candidate).replace(' ','T')
    if(parts===value)matches.push(candidate.toISOString())
  }
  commerceAssert(matches.length===1,'ACADEMY_DATE_AMBIGUOUS')
  return matches[0]
}
export function academyAmsterdamDate(value:Date|string|null):string {
  return value?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Amsterdam',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)).replace(' ','T'):''
}

/** Round the final package total once, never the per-person reduction. */
export function academyAlumniGross(prices:AcademyPrices,quantity:1|5,eligible:number):number|null {
  commerceAssert(Number.isInteger(eligible)&&eligible>=0&&eligible<=quantity,'ACADEMY_BENEFIT_NOT_ESTABLISHED')
  if(!eligible)return null
  return quantity===1?prices.followUpIndividualCents:Math.round((prices.fiveCents*5-eligible*(prices.fiveCents-prices.followUpFiveCents))/5)
}
