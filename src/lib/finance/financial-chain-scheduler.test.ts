import {afterEach,beforeEach,expect,it,vi} from 'vitest'
const mock=vi.hoisted(()=>({authorize:vi.fn(),reader:vi.fn(),create:vi.fn(),tx:vi.fn()}))
vi.mock('server-only',()=>({}))
vi.mock('@/lib/prisma',()=>({getPrisma:()=>({financialEvent:{createMany:mock.create},$transaction:mock.tx})}))
vi.mock('@/lib/marketplace/marketplace-authorization',()=>({requireMarketplacePlatformAdmin:mock.authorize}))
vi.mock('./financial-chain-reader',()=>({createFinancialChainReader:mock.reader}))
vi.mock('./jortt-api-gateway',()=>({JorttApiGateway:class{}}))
import {runScheduledFinancialChainReview} from './financial-chain-review-service'
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv('FINANCIAL_CHAIN_REVIEW_ENABLED','true');vi.stubEnv('FINANCIAL_REVIEW_OPERATOR_ID','00000000-0000-4000-8000-000000000001')
 mock.authorize.mockResolvedValue({id:'operator'});mock.create.mockResolvedValue({count:1});mock.reader.mockResolvedValue({scopes:[],paymentCount:0,reader:{}})
 mock.tx.mockImplementation(async fn=>fn({financialEvent:{createMany:mock.create}}))
})
afterEach(()=>vi.unstubAllEnvs())
it('closed gate invokes neither authorization nor providers',async()=>{
 vi.stubEnv('FINANCIAL_CHAIN_REVIEW_ENABLED','false');expect(await runScheduledFinancialChainReview({} as never)).toMatchObject({skipped:true});expect(mock.reader).not.toHaveBeenCalled();expect(mock.create).not.toHaveBeenCalled()
})
it('missing or unauthorized operator prevents provider access',async()=>{
 vi.stubEnv('FINANCIAL_REVIEW_OPERATOR_ID','');await expect(runScheduledFinancialChainReview({} as never)).rejects.toThrow('OPERATOR_REQUIRED');expect(mock.reader).not.toHaveBeenCalled()
 vi.stubEnv('FINANCIAL_REVIEW_OPERATOR_ID','00000000-0000-4000-8000-000000000001');mock.authorize.mockRejectedValue(new Error('ACCESS_DENIED'));await expect(runScheduledFinancialChainReview({} as never)).rejects.toThrow('ACCESS_DENIED');expect(mock.reader).not.toHaveBeenCalled()
})
it('provider outage records only safe failure evidence',async()=>{
 mock.reader.mockRejectedValue(new Error('sensitive upstream response'))
 await expect(runScheduledFinancialChainReview({} as never)).rejects.toThrow('FINANCIAL_REVIEW_INCOMPLETE')
 expect(mock.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({result:'FAILED'})}));expect(JSON.stringify(mock.create.mock.calls)).not.toContain('sensitive')
})
it('a verified empty provider collection can complete with authorization repeated at commit',async()=>{
 expect(await runScheduledFinancialChainReview({} as never)).toEqual({processed:0,succeeded:0,failed:0})
 expect(mock.authorize).toHaveBeenCalledTimes(2);expect(mock.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({result:'SUCCEEDED',metadata:expect.objectContaining({paymentCount:0,scopeCount:0})})}))
})
it('revocation during provider reads cannot create a successful cycle',async()=>{
 mock.authorize.mockResolvedValueOnce({id:'operator'}).mockRejectedValueOnce(new Error('ACCESS_DENIED'))
 await expect(runScheduledFinancialChainReview({} as never)).rejects.toThrow('FINANCIAL_REVIEW_INCOMPLETE')
 expect(mock.create.mock.calls.every(([args])=>args.data.result==='FAILED')).toBe(true)
})
