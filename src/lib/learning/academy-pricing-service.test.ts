import {beforeEach,describe,expect,it,vi} from 'vitest'
const m=vi.hoisted(()=>({admin:vi.fn(),log:vi.fn(),priceFind:vi.fn(),priceCreate:vi.fn(),promotionFind:vi.fn(),uses:vi.fn(),course:vi.fn()}))
vi.mock('@/lib/marketplace/marketplace-authorization',()=>({requireMarketplacePlatformAdmin:m.admin}))
vi.mock('@/lib/finance/financial-transaction',()=>({runSerializableFinancialTransaction:(fn:(db:unknown)=>unknown)=>fn({learningAcademyPriceVersion:{findFirst:m.priceFind,create:m.priceCreate},adminActionLog:{create:m.log},learningCourse:{findUnique:m.course},learningAcademyPromotion:{findMany:m.promotionFind},learningAcademyPromotionUse:{count:m.uses}})}))
vi.mock('./academy-commerce-access',()=>({lockAcademyCommerce:vi.fn()}))
vi.mock('@/lib/prisma',()=>({getPrisma:vi.fn()}))
vi.mock('@/lib/authorization',()=>({getCurrentUser:vi.fn()}))
vi.mock('@/lib/platform-admin/platform-admin-authorization',()=>({getPlatformOperatorContext:vi.fn()}))
import {saveAcademyPrices,readAcademyPrices,quoteAcademyPrice} from './academy-pricing-service'
import {defaultAcademyPrices} from './academy-pricing-policy'
import type {Prisma} from '@/generated/prisma/client'
const actor='11111111-1111-4111-8111-111111111111'
const input={courseId:null,expectedVersionId:null,individualCents:'149',fiveCents:'595',followUpIndividualCents:'139.99',followUpFiveCents:'565',vatRateBps:2100,vatTreatment:'TAXABLE',taxStatus:'TAX_REVIEW_REQUIRED'}
beforeEach(()=>{vi.resetAllMocks();vi.stubEnv('NODE_ENV','test');vi.stubEnv('VERCEL','');vi.stubEnv('VERCEL_ENV','');vi.stubEnv('RESEND_API_KEY','');vi.stubEnv('DATABASE_URL','postgresql://fixture:fixture@fixture-6e93ad508d.example.invalid/neondb?sslmode=verify-full');vi.stubEnv('ACADEMY_TEST_PROJECT_ID','academy-synthetic-project');vi.stubEnv('ACADEMY_TEST_BRANCH_ID','branch-fixture-little-hill');m.admin.mockResolvedValue({id:actor});m.priceFind.mockResolvedValue(null);m.priceCreate.mockImplementation(({data})=>({id:actor,...data}));m.log.mockResolvedValue({});m.promotionFind.mockResolvedValue([]);m.uses.mockResolvedValue(0)})
describe('Academy prijsbeheer autorisatie, historie en quotelimieten',()=>{
 it('weigert onbevoegde beheerder voordat prijzen worden geschreven',async()=>{m.admin.mockRejectedValue(new Error('ACCESS_DENIED'));await expect(saveAcademyPrices(actor,input)).rejects.toThrow('ACCESS_DENIED');expect(m.priceCreate).not.toHaveBeenCalled();expect(m.log).not.toHaveBeenCalled()})
 it.each(['production','development'])('weigert productie of verkeerd DBtarget in %s',async mode=>{vi.stubEnv('NODE_ENV',mode);vi.stubEnv('DATABASE_URL','postgresql://fixture:fixture@127.0.0.1:5432/neondb');await expect(saveAcademyPrices(actor,input)).rejects.toThrow();expect(m.priceCreate).not.toHaveBeenCalled()})
 it('maakt een nieuwe prijsversie en één auditlog, zonder oude orders te wijzigen',async()=>{await saveAcademyPrices(actor,input);expect(m.priceCreate).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({revision:1,scopeKey:'DEFAULT',individualCents:14900})}));expect(m.log).toHaveBeenCalledOnce()})
 it('weigert gelijktijdig verouderde prijsinvoer',async()=>{m.priceFind.mockResolvedValue({id:actor,revision:2});await expect(saveAcademyPrices(actor,input)).rejects.toThrow('ACADEMY_PRICE_STALE');expect(m.priceCreate).not.toHaveBeenCalled()})
 it('eigen cursusprijs gaat vóór default; ontbrekend default gebruikt bestaand startbedrag',async()=>{const db={learningAcademyPriceVersion:{findFirst:m.priceFind}} as unknown as Prisma.TransactionClient;m.priceFind.mockResolvedValueOnce({...defaultAcademyPrices,individualCents:20000});expect((await readAcademyPrices(db,actor)).individualCents).toBe(20000);m.priceFind.mockResolvedValue(null);expect((await readAcademyPrices(db,actor)).individualCents).toBe(14900)})
 it('weigert onbeschikbare code en heeft geen write bij quotering',async()=>{const db={learningAcademyPriceVersion:{findFirst:m.priceFind},learningAcademyPromotion:{findMany:m.promotionFind},learningAcademyPromotionUse:{count:m.uses}} as unknown as Prisma.TransactionClient;await expect(quoteAcademyPrice(db,{buyerUserId:actor,organizationId:null,courseId:actor,quantity:1,code:'NIET',now:new Date()},null)).rejects.toThrow('ACADEMY_CODE_NOT_AVAILABLE');expect(m.log).not.toHaveBeenCalled()})
})
