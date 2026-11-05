import { describe,it,expect } from 'vitest'
import { academyMoney,academyPriceWrite,academyPromotionWrite,academyPromotionApplies,chooseAcademyPrice,defaultAcademyPrices,academyAlumniGross,academyAmsterdamDateToIso,type AcademyPromotion,type PricingContext } from './academy-pricing-policy'
const user='11111111-1111-4111-8111-111111111111',org='22222222-2222-4222-8222-222222222222',course='33333333-3333-4333-8333-333333333333'
const promotion=(overrides:Partial<AcademyPromotion>={}):AcademyPromotion=>({id:'44444444-4444-4444-8444-444444444444',revision:1,kind:'CODE',label:'Voorbeeldactie',code:'ACTIE',userId:null,organizationId:null,percentage:10,courseIds:[],active:true,validFrom:null,validUntil:null,maximumUses:null,maximumPerAccount:null,quantity:null,...overrides})
const context:PricingContext={buyerUserId:user,organizationId:org,courseId:course,quantity:1,code:' actie ',now:new Date('2026-11-01T12:00:00Z')}
describe('Academy centrale prijzen en niet-stapelbare kortingen',()=>{
 it.each([['149',14900],['149,00',14900],['139.99',13999],['0',0],['0,01',1]])('parseert euro %s exact tot %i cent',(value,cents)=>expect(academyMoney.parse(value)).toBe(cents))
 it.each(['-1','1,234','1e2','NaN','Infinity','1.234,00'])('weigert ongeldige bedraginvoer %s',value=>expect(academyMoney.safeParse(value).success).toBe(false))
 it.each([[1,14900],[5,59500]] as const)('standaardproduct %i kost %i', (q,total)=>expect(chooseAcademyPrice(defaultAcademyPrices,q,[],null).financial.amountInclVatCents).toBe(total))
 it('gebruikt eigen opleidingsprijzen',()=>expect(chooseAcademyPrice({...defaultAcademyPrices,individualCents:20000},1,[],null).financial.amountInclVatCents).toBe(20000))
 it.each([0,10,100])('past %i%% eenmaal toe op het hele 5-pack',percentage=>expect(chooseAcademyPrice(defaultAcademyPrices,5,[promotion({percentage})],null).financial.amountInclVatCents).toBe(59500-Math.round(59500*percentage/100)))
 it('kiest €139,99 alumni boven 5% accountkorting',()=>expect(chooseAcademyPrice(defaultAcademyPrices,1,[promotion({kind:'ACCOUNT',percentage:5})],13999).chosen.kind).toBe('ALUMNI'))
 it('kiest 20% boven alumni en telt deze nooit op',()=>expect(chooseAcademyPrice(defaultAcademyPrices,1,[promotion({percentage:20}),promotion({kind:'ACCOUNT',percentage:10})],13999).financial.amountInclVatCents).toBe(11920))
 it('verbruikt bij 0% of gelijke nulprijs geen actiecode',()=>expect(chooseAcademyPrice(defaultAcademyPrices,1,[promotion({percentage:0})],null).chosen.kind).toBe('NONE'))
 it('houdt bij gelijke bedragen account vóór organisatie en code',()=>expect(chooseAcademyPrice(defaultAcademyPrices,1,[promotion({kind:'CODE'}),promotion({kind:'ORGANIZATION'}),promotion({kind:'ACCOUNT'})],null).chosen.kind).toBe('ACCOUNT'))
 it('kiest dezelfde ID bij gelijke regelingen ongeacht leesvolgorde',()=>{const a=promotion({id:'a'}),b=promotion({id:'b'});expect(chooseAcademyPrice(defaultAcademyPrices,1,[b,a],null).chosen.id).toBe('a')})
 it('100% geeft nulsaldo en sluitende btw zonder negatieve bedragen',()=>{const r=chooseAcademyPrice(defaultAcademyPrices,1,[promotion({percentage:100})],null);expect(r.financial.amountExclVatCents).toBe(0);expect(r.financial.vatAmountCents).toBe(0);expect(r.discountGrossCents).toBe(14900)})
 it('rondt percentagevoordeel eenmaal af op centen',()=>expect(chooseAcademyPrice({...defaultAcademyPrices,individualCents:101},1,[promotion({percentage:50})],null).financial.amountInclVatCents).toBe(50))
 it.each([-1,0.5,101])('weigert ongeldige percentage %s',percentage=>expect(()=>chooseAcademyPrice(defaultAcademyPrices,1,[promotion({percentage})],null)).toThrow())
 it('case-insensitive code geldt alleen bij de ingevoerde code',()=>{expect(academyPromotionApplies(promotion(),context)).toBe(true);expect(academyPromotionApplies(promotion(),{...context,code:'ANDERS'})).toBe(false)})
 it('accountkorting lekt niet naar organisatiegenoten',()=>{const p=promotion({kind:'ACCOUNT',userId:user});expect(academyPromotionApplies(p,context)).toBe(true);expect(academyPromotionApplies(p,{...context,buyerUserId:org})).toBe(false)})
 it('organisatieregel geldt alleen in de gecontroleerde koopcontext',()=>{const p=promotion({kind:'ORGANIZATION',organizationId:org});expect(academyPromotionApplies(p,context)).toBe(true);expect(academyPromotionApplies(p,{...context,organizationId:null})).toBe(false)})
 it('controleert cursus- en productscope',()=>{expect(academyPromotionApplies(promotion({courseIds:[org]}),context)).toBe(false);expect(academyPromotionApplies(promotion({quantity:5}),context)).toBe(false)})
 it('begint inclusief en eindigt exclusief',()=>{expect(academyPromotionApplies(promotion({validFrom:context.now}),context)).toBe(true);expect(academyPromotionApplies(promotion({validUntil:context.now}),context)).toBe(false)})
 it('inactieve en toekomstige korting niet toepasbaar',()=>{expect(academyPromotionApplies(promotion({active:false}),context)).toBe(false);expect(academyPromotionApplies(promotion({validFrom:new Date('2030-01-01')}),context)).toBe(false)})
 it('vereist formele onderbouwing voor vrijstelling',()=>expect(()=>chooseAcademyPrice({...defaultAcademyPrices,vatRateBps:0,vatTreatment:'EXEMPT'},1,[],null)).toThrow())
 it('valideert centrale prijswijziging en nulprijs',()=>{const p={courseId:null,expectedVersionId:null,individualCents:'0',fiveCents:'0',followUpIndividualCents:'0',followUpFiveCents:'0',vatRateBps:2100,vatTreatment:'TAXABLE',taxStatus:'TAX_REVIEW_REQUIRED'};expect(academyPriceWrite.parse(p).individualCents).toBe(0);expect(academyPriceWrite.safeParse({...p,taxStatus:'APPROVED'}).success).toBe(false)})
 it('behoudt codecanonisatie en weigert verkeerde doelbinding',()=>{const raw={...promotion(),id:undefined,revision:undefined,creationKey:user,validFrom:null,validUntil:null};delete raw.id;delete raw.revision;expect(academyPromotionWrite.parse(raw).code).toBe('ACTIE');expect(academyPromotionWrite.safeParse({...raw,userId:user}).success).toBe(false)})
 it('verwerkt Nederlandse winter-/zomertijd en weigert niet-bestaande of dubbele lokale tijd',()=>{expect(academyAmsterdamDateToIso('2026-11-01T12:00')).toBe('2026-11-01T11:00:00.000Z');expect(academyAmsterdamDateToIso('2026-07-01T12:00')).toBe('2026-07-01T10:00:00.000Z');expect(()=>academyAmsterdamDateToIso('2026-03-29T02:30')).toThrow();expect(()=>academyAmsterdamDateToIso('2026-10-25T02:30')).toThrow()})
})

describe('Goedgekeurde evenredige alumni-regel',()=>{
 it.each([[0,null],[1,58900],[2,58300],[3,57700],[4,57100],[5,56500]])('%i alumni: %s', (n,price)=>expect(academyAlumniGross(defaultAcademyPrices,5,n)).toBe(price))
 it.each([[1,74000],[2,73000],[3,72000],[4,71000],[5,70000]])('beheerdersvoorbeeld €750/€700: %i alumni',(n,price)=>expect(academyAlumniGross({...defaultAcademyPrices,fiveCents:75000,followUpFiveCents:70000},5,n)).toBe(price))
 it('rondt uitsluitend het ordertotaal en bereikt bij vijf exact de volledige alumni-prijs',()=>{const p={...defaultAcademyPrices,fiveCents:59501,followUpFiveCents:56503};for(let n=1;n<=5;n++)expect(academyAlumniGross(p,5,n)).toBe(Math.round(59501-n/5*(59501-56503)));expect(academyAlumniGross(p,5,5)).toBe(56503)})
})
