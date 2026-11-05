import { afterEach,expect,it,vi } from 'vitest'
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules()})
it('suppresses Next access/fetch URLs for the explicit local capture server',async()=>{
  vi.stubEnv('ACADEMY_LOCAL_MAIL','1');vi.resetModules()
  const {default:config}=await import('../../next.config')
  expect(config.logging).toMatchObject({incomingRequests:false,fetches:{fullUrl:false}})
})
it('retains the normal Next logging configuration outside local capture',async()=>{
  vi.stubEnv('ACADEMY_LOCAL_MAIL',undefined);vi.resetModules()
  const {default:config}=await import('../../next.config')
  expect(config.logging).toBeUndefined()
})
