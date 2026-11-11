import { afterEach, expect, it, vi } from 'vitest'
import { GET, POST } from './route'
import { GET as read } from './status/route'
import { dispatchBatch } from '@/lib/marketplace/dispatch-batch'
import { claimDispatchSlot, finishDispatch, readDispatchStatus } from '@/lib/marketplace/dispatch-status'

vi.mock('@/lib/marketplace/dispatch-batch', () => ({ dispatchBatch: vi.fn() }))
vi.mock('@/lib/marketplace/dispatch-status', () => ({ claimDispatchSlot: vi.fn(), finishDispatch: vi.fn(), readDispatchStatus: vi.fn() }))
const cron = 'a'.repeat(64), monitor = 'b'.repeat(64)
const req = (key: string) => new Request('https://example.invalid', {headers: {authorization: 'Bearer ' + key}})
function configure() {
  vi.stubEnv('VERCEL_ENV', 'production')
  vi.stubEnv('MARKETPLACE_DISPATCH_PLANNER', 'vercel')
  vi.stubEnv('CRON_SECRET', cron)
  vi.stubEnv('MARKETPLACE_MONITOR_SECRET', monitor)
}
afterEach(() => { vi.resetAllMocks(); vi.unstubAllEnvs() })
it('drains 13 due records after a missed quarter and ignores a concurrent duplicate', async () => {
  configure()
  vi.mocked(claimDispatchSlot).mockResolvedValueOnce(true).mockResolvedValueOnce(false)
  const report = (n: number) => ({claimed:n, sent:n, failed:0, retry:0, contact:{claimed:0,sent:0,failed:0,retry:0,redacted:0,retention:{enabled:false,redacted:0,metadataDeleted:0,countersDeleted:0,pending:false,reviewRequired:0}}})
  vi.mocked(dispatchBatch).mockResolvedValueOnce(report(10)).mockResolvedValueOnce(report(3))
  const [first, second] = await Promise.all([GET(req(cron)), GET(req(cron))])
  expect(await first.json()).toEqual({claimed:13,sent:13,retry:0,failed:0})
  expect(await second.json()).toEqual({duplicate:true})
  expect(dispatchBatch).toHaveBeenCalledTimes(2)
  expect(finishDispatch).toHaveBeenCalledTimes(1)
})
it('records failure and never records success on worker error', async () => {
  configure()
  vi.mocked(claimDispatchSlot).mockResolvedValue(true)
  vi.mocked(dispatchBatch).mockRejectedValue(new Error('fixture'))
  expect((await GET(req(cron))).status).toBe(503)
  expect(finishDispatch).toHaveBeenCalledWith('FAILED', {claimed:0,sent:0,retry:0,failed:0})
})
it('isolates both planners and monitoring credentials', async () => {
  configure()
  expect((await POST(req(cron))).status).toBe(404)
  expect((await GET(req(monitor))).status).toBe(401)
  expect((await read(req(cron))).status).toBe(401)
  vi.mocked(readDispatchStatus).mockResolvedValue({lastSuccessfulAt:null,counters:null,status:'NEVER',ready:2,expiredLeases:1})
  const status = await read(req(monitor))
  expect(status.status).toBe(200)
  expect((await status.json()).ready).toBe(2)
  expect(status.headers.get('Cache-Control')).toContain('no-store')
  vi.stubEnv('MARKETPLACE_MONITOR_SECRET',cron)
  expect((await read(req(cron))).status).toBe(401)
  expect(claimDispatchSlot).not.toHaveBeenCalled()
  expect(dispatchBatch).not.toHaveBeenCalled()
})
