import { beforeEach, describe, expect, it, vi } from 'vitest'
const state=vi.hoisted(()=>({db:null as unknown}))
vi.mock('@/lib/prisma',()=>({getPrisma:()=>state.db}))
vi.mock('./academy-commerce-environment',()=>({assertAcademyCommerceSandbox:vi.fn()}))
vi.mock('@/lib/public-app-url',()=>({getPublicAppBaseUrl:()=> 'http://127.0.0.1:3002'}))
import { deliverAcademyCommerceEmails } from './academy-commerce-email-worker'
const tick=new Date('2026-10-26T12:00:00Z')
const job={id:'job',status:'PENDING',templateKey:'ACADEMY_ORDER_CONFIRMED',recipientUserId:'buyer',idempotencyKey:'academy-order-confirmed:purchase',payload:{orderId:'order'},attemptCount:0,firstAttemptAt:null,createdAt:tick}
const order={id:'order',buyerUserId:'buyer',buyer:{email:'buyer@example.invalid',status:'ACTIVE',emailVerified:true},purchase:{status:'PAID',amountInclVatCents:14900},courseVersion:{course:{title:'RI&E in de praktijk'}},agreedAt:tick,legalAgreement:{version:'DRAFT',taxStatus:'TAX_REVIEW_REQUIRED'}}
let db: ReturnType<typeof fixture>
function fixture(){return {notificationOutbox:{findMany:vi.fn().mockResolvedValue([job]),updateMany:vi.fn().mockResolvedValue({count:1})},learningAcademyOrder:{findUnique:vi.fn().mockResolvedValue(order)},learningAcademySeat:{findFirst:vi.fn()}}}
const sender=()=>vi.fn().mockResolvedValue({accepted:true as const,transport:'DEVELOPMENT_LOG' as const,status:'ACCEPTED' as const,messageId:'fake-only'})
beforeEach(()=>{db=fixture();state.db=db})
describe('Academy commerce outbox met uitsluitend geïnjecteerde fake verzending',()=>{
 it('bevestigt de juiste buyer met immutable contractbijlage en stabiele idempotencykey',async()=>{
  const send=sender();expect(await deliverAcademyCommerceEmails({send,now:()=>tick})).toMatchObject({sent:1})
  expect(send).toHaveBeenCalledWith(expect.objectContaining({to:'buyer@example.invalid',idempotencyKey:job.idempotencyKey,subject:'Uw WorkMatchr Academy-testbestelling'}))
  expect(send.mock.calls[0][0].attachments[0].content).toContain('TAX_REVIEW_REQUIRED')
  expect(send.mock.calls[0][0].text).not.toMatch(/korting|aanbieding|score|zwakke/i)
 })
 it('verstuurd geen aankoopbevestiging zonder actuele betaalstatus',async()=>{
  db.learningAcademyOrder.findUnique.mockResolvedValue({...order,purchase:{...order.purchase,status:'REFUNDED'}})
  const send=sender();expect(await deliverAcademyCommerceEmails({send,now:()=>tick})).toMatchObject({failed:1});expect(send).not.toHaveBeenCalled()
 })
 it('onderdrukt een oude uitnodiging na herverdeling of refund',async()=>{
  db.notificationOutbox.findMany.mockResolvedValue([{...job,templateKey:'ACADEMY_SEAT_INVITED',payload:{seatId:'seat',email:'student@example.invalid'}}])
  db.learningAcademySeat.findFirst.mockResolvedValue(null)
  const send=sender();expect(await deliverAcademyCommerceEmails({send,now:()=>tick})).toMatchObject({failed:1});expect(send).not.toHaveBeenCalled()
 })
 it('stuurt geen tokens of login-bypass in een gewone authenticated uitnodigingslink',async()=>{
  db.notificationOutbox.findMany.mockResolvedValue([{...job,templateKey:'ACADEMY_SEAT_INVITED',payload:{seatId:'seat',email:'student@example.invalid'}}])
  db.learningAcademySeat.findFirst.mockResolvedValue({id:'seat',invitedEmail:'student@example.invalid',order:{courseVersion:{course:{title:'Preventiemedewerker in de praktijk'}}}})
  const send=sender();await deliverAcademyCommerceEmails({send,now:()=>tick})
  expect(send.mock.calls[0][0].text).toContain('/e-learnings/uitnodiging/seat')
  expect(send.mock.calls[0][0].text).not.toMatch(/token=|login-token|kortingscode|score/)
 })
 it('blokkeert niet-fictieve ontvangers in de sandbox',async()=>{
  db.learningAcademyOrder.findUnique.mockResolvedValue({...order,buyer:{...order.buyer,email:'not-a-test@example.com'}})
  const send=sender();await deliverAcademyCommerceEmails({send,now:()=>tick});expect(send).not.toHaveBeenCalled()
 })
 it('herstelt een providerfout met dezelfde intentie, begrensde backoff en zonder SENT',async()=>{
  const send=sender().mockRejectedValue(new Error('Fake network failure'))
  expect(await deliverAcademyCommerceEmails({send,now:()=>tick})).toMatchObject({retry:1,sent:0})
  expect(db.notificationOutbox.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({data:expect.objectContaining({status:'PENDING',availableAt:new Date(tick.getTime()+60000)})}))
 })
 it('maakt de vijfde fout terminal/dead-letter in de bestaande FAILED-status',async()=>{
  db.notificationOutbox.findMany.mockResolvedValue([{...job,attemptCount:4}]);const send=sender().mockRejectedValue(new Error('Fake failure'))
  expect(await deliverAcademyCommerceEmails({send,now:()=>tick})).toMatchObject({failed:1,retry:0})
 })
 it('verwerkt een te oude/onzekere intentie niet eindeloos opnieuw',async()=>{
  db.notificationOutbox.findMany.mockResolvedValue([{...job,firstAttemptAt:new Date(tick.getTime()-24*3600000)}]);const send=sender()
  expect(await deliverAcademyCommerceEmails({send,now:()=>tick})).toMatchObject({failed:1});expect(send).not.toHaveBeenCalled()
 })
 it('laat een verloren lease/concurrente claim geen tweede verzending starten',async()=>{
  db.notificationOutbox.updateMany.mockResolvedValue({count:0});const send=sender()
  expect(await deliverAcademyCommerceEmails({send,now:()=>tick})).toMatchObject({sent:0});expect(send).not.toHaveBeenCalled()
 })
})
