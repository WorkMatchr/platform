import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { randomBytes } from 'node:crypto'
const state=vi.hoisted(()=>({body:'',options:{} as Record<string,unknown>,request:vi.fn(),read:vi.fn(),responseStatus:200}))
vi.mock('./academy-local-mail-private',()=>({readAcademyMailPrivateFile:state.read}))
vi.mock('node:https',()=>({request:state.request}))
const resend=vi.hoisted(()=>vi.fn())
vi.mock('resend',()=>({Resend:class{emails={send:resend}}}))
import { captureAcademyLocalMail } from './academy-local-mail'
import { sendAuthEmail,verificationEmail } from './email'
import { ACADEMY_APP_ORIGIN } from './academy-local-mail-policy'
beforeEach(()=>{
  vi.stubEnv('NODE_ENV','test');vi.stubEnv('VERCEL','');vi.stubEnv('VERCEL_ENV','');vi.stubEnv('RESEND_API_KEY','');vi.stubEnv('AUTH_EMAIL_FROM','')
  vi.stubEnv('ACADEMY_LOCAL_MAIL','1');vi.stubEnv('ACADEMY_TEST_PROJECT_ID','academy-synthetic-project');vi.stubEnv('ACADEMY_TEST_BRANCH_ID','branch-fixture-little-hill')
  vi.stubEnv('DATABASE_URL','postgresql://test:placeholder@fixture-6e93ad508d.example.invalid/neondb?sslmode=verify-full')
  vi.stubEnv('BETTER_AUTH_URL',ACADEMY_APP_ORIGIN);vi.stubEnv('NEXT_PUBLIC_APP_URL',ACADEMY_APP_ORIGIN)
  state.responseStatus=200;state.body='';state.request.mockReset();resend.mockReset()
  const createdAt=Date.now()
  state.read.mockImplementation((name:string)=>name==='cert.pem'?'PRIVATE_TEST_CA':JSON.stringify({version:1,origin:ACADEMY_APP_ORIGIN,createdAt,expiresAt:createdAt+86400000,senderPassword:'a'.repeat(64)}))
  state.request.mockImplementation((_url,options,callback)=>{
    state.options=options;const response=Object.assign(new EventEmitter(),{statusCode:state.responseStatus}),req=Object.assign(new EventEmitter(),{setTimeout:vi.fn(),destroy:vi.fn(),end:vi.fn()})
    req.end.mockImplementation((body:string)=>{state.body=body;queueMicrotask(()=>{callback(response);response.emit('data',JSON.stringify({ID:'local-fixture-id'}));response.emit('end')})})
    return req
  })
})
afterEach(()=>{vi.unstubAllEnvs();vi.restoreAllMocks()})
describe('Academy capture through the existing mail adapter',()=>{
  it('preserves templates/URLs, uses private TLS and never calls the provider or logs content',async()=>{
    const url=`${ACADEMY_APP_ORIGIN}/api/auth/verify-email?probe=${randomBytes(16).toString('hex')}`
    const message=verificationEmail('operator@example.invalid','Test',url),output=vi.spyOn(process.stdout,'write').mockImplementation(()=>true),info=vi.spyOn(console,'info').mockImplementation(()=>{})
    await expect(sendAuthEmail(message)).resolves.toMatchObject({transport:'LOCAL_MAILPIT',status:'DEVELOPMENT_ONLY'})
    expect(JSON.parse(state.body)).toMatchObject({Text:message.text,HTML:message.html})
    expect(state.options).toMatchObject({ca:'PRIVATE_TEST_CA',rejectUnauthorized:true})
    expect(output).not.toHaveBeenCalled();expect(info).not.toHaveBeenCalled();expect(resend).not.toHaveBeenCalled()
  })
  it('fails closed on unavailable capture without provider or log fallback',async()=>{
    state.responseStatus=503
    await expect(captureAcademyLocalMail(verificationEmail('operator@example.invalid','Test',`${ACADEMY_APP_ORIGIN}/api/auth/verify-email`))).rejects.toThrow('niet veilig')
    expect(resend).not.toHaveBeenCalled()
  })
  it('blocks production before any local network or provider call',async()=>{
    vi.stubEnv('NODE_ENV','production')
    await expect(sendAuthEmail(verificationEmail('operator@example.invalid','Test',`${ACADEMY_APP_ORIGIN}/api/auth/verify-email`))).rejects.toThrow()
    expect(state.request).not.toHaveBeenCalled();expect(resend).not.toHaveBeenCalled()
  })
})
