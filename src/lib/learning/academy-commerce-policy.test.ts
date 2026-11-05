import { describe, expect, it } from 'vitest'
import { academyOrderInput, academyPriceDecision, calculateAcademyPrice, ACADEMY_LEGAL_VERSION, verifiedAcademyPayment } from './academy-commerce-policy'

describe('Academy vaste totaalprijzen en persoonlijke alumni-rechten', () => {
  it.each([[0,59500],[1,58900],[2,58300],[3,57700],[4,57100],[5,56500]])('vijf plaatsen met %i alumni kosten %i cent inclusief btw', (alumni,total) => {
    const p=calculateAcademyPrice({quantity:5,followUp:true,eligibleParticipants:alumni},academyPriceDecision)
    expect(p.amountInclVatCents).toBe(total)
    expect(p.amountExclVatCents+p.vatAmountCents).toBe(total)
    expect(p.proDiscountCents+p.discountCodeDiscountCents).toBe(0)
  })
  it.each([[false,0,14900],[true,1,13999]] as const)('gebruikt de individuele vaste prijs', (followUp,eligible,total)=>{
    expect(calculateAcademyPrice({quantity:1,followUp,eligibleParticipants:eligible},academyPriceDecision).amountInclVatCents).toBe(total)
  })
  it('weigert een individuele korting zonder persoonlijke kwalificatie',()=>{
    expect(()=>calculateAcademyPrice({quantity:1,followUp:true,eligibleParticipants:0},academyPriceDecision)).toThrow('BENEFIT_NOT_ESTABLISHED')
  })
  it.each([-1,6,1.5])('weigert ongeldige alumnitelling %s',eligibleParticipants=>{
    expect(()=>calculateAcademyPrice({quantity:5,followUp:true,eligibleParticipants},academyPriceDecision)).toThrow()
  })
  it('maakt een voorlopige fiscale keuze of vrijstelling niet stilzwijgend definitief',()=>{
    expect(academyPriceDecision).toMatchObject({basis:'INCLUSIVE',vatRateBps:2100,taxStatus:'TAX_REVIEW_REQUIRED'})
    expect(()=>calculateAcademyPrice({quantity:1,followUp:false,eligibleParticipants:0},null)).toThrow('PRICING_REVIEW_REQUIRED')
    expect(()=>calculateAcademyPrice({quantity:1,followUp:false,eligibleParticipants:0},{...academyPriceDecision,vatRateBps:0,vatTreatment:'EXEMPT'})).toThrow('EXEMPTION_NOT_ESTABLISHED')
    expect(calculateAcademyPrice({quantity:1,followUp:false,eligibleParticipants:0},{...academyPriceDecision,vatRateBps:0,vatTreatment:'EXEMPT',taxStatus:'APPROVED',exemptionLegalBasis:'Alleen een toekomstig goedgekeurd testbesluit'}).amountInclVatCents).toBe(14900)
  })
  const raw={courseCode:'WL-001',quantity:1,buyerType:'CONSUMER',billing:{name:'Fictieve deelnemer',address:'Teststraat 1',postalCode:'1000AA',city:'Teststad',country:'NL'},platformTermsAccepted:true,academyTermsAccepted:true,legalVersion:ACADEMY_LEGAL_VERSION,idempotencyKey:'fixture-order-0001'}
  it.each(['platformTermsAccepted','academyTermsAccepted'])('vereist een expliciet positief %s-signaal',field=>{
    expect(academyOrderInput.safeParse({...raw,[field]:false}).success).toBe(false)
    expect(academyOrderInput.safeParse({...raw,[field]:undefined}).success).toBe(false)
  })
  it.each(['discountCode','isCorrect','price','eligibleParticipants'])('weigert client-autoriteit via %s',field=>expect(academyOrderInput.safeParse({...raw,[field]:'manipulated'}).success).toBe(false))
  const purchase={id:'purchase',organizationId:null,amountInclVatCents:14900,currency:'EUR',molliePaymentId:'tr_fixture'}
  const payment={id:'tr_fixture',amountValue:'149.00',currency:'EUR',metadata:{purchaseId:'purchase'}}
  it('bindt een persoonlijke betaling zonder fictieve organisatie aan het purchase-ID',()=>expect(verifiedAcademyPayment(purchase,payment)).toBe(true))
  it.each([{id:'tr_other'},{amountValue:'1.00'},{currency:'USD'},{metadata:{purchaseId:'other'}},{metadata:{purchaseId:'purchase',organizationId:'other'}}])('weigert mismatch %j',change=>expect(verifiedAcademyPayment(purchase,{...payment,...change})).toBe(false))
})
