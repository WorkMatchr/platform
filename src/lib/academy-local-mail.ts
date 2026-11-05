import { request } from 'node:https'
import type { AuthEmail, AuthEmailDeliveryResult } from './email'
import { ACADEMY_APP_ORIGIN, ACADEMY_MAIL_URL, AcademyLocalMailError, assertAcademyLocalMailEnvironment, validateAcademyLocalMessage } from './academy-local-mail-policy'
import { readAcademyMailPrivateFile } from './academy-local-mail-private'

export type AcademyMailState = { version:1; origin:string; createdAt:number; expiresAt:number; senderPassword:string }
export function readAcademyMailState(allowExpired=false): AcademyMailState {
  try {
    const state=JSON.parse(readAcademyMailPrivateFile('state.json')) as AcademyMailState
    if(state.version!==1 || state.origin!==ACADEMY_APP_ORIGIN || !/^[a-f0-9]{64}$/.test(state.senderPassword)
      || !Number.isFinite(state.expiresAt) || state.expiresAt-state.createdAt!==24*60*60*1000 || (!allowExpired&&state.expiresAt<=Date.now())) throw new AcademyLocalMailError()
    return state
  } catch { throw new AcademyLocalMailError() }
}

/** Uses the private per-run certificate as CA. No redirects or disabled TLS checks. */
export function academyMailRequest(path: string, method: string, credential: string | undefined, payload?: unknown): Promise<{status:number;body:string}> {
  return new Promise((resolve,reject)=>{
    try {
      const body=payload===undefined?undefined:JSON.stringify(payload)
      const req=request(`${ACADEMY_MAIL_URL}${path}`,{
        method,agent:false,ca:readAcademyMailPrivateFile('cert.pem'),rejectUnauthorized:true,
        headers:{...(credential?{Authorization:`Basic ${Buffer.from(credential).toString('base64')}`} : {}),...(body?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{})},
      },response=>{
        let result=''
        response.on('data',chunk=>{result+=chunk;if(result.length>512_000)response.destroy(new AcademyLocalMailError())})
        response.on('error',()=>reject(new AcademyLocalMailError()))
        response.on('end',()=>resolve({status:response.statusCode??0,body:result}))
      })
      req.setTimeout(5000,()=>req.destroy())
      req.on('error',()=>reject(new AcademyLocalMailError()))
      req.end(body)
    } catch { reject(new AcademyLocalMailError()) }
  })
}

export async function captureAcademyLocalMail(email:AuthEmail):Promise<AuthEmailDeliveryResult> {
  try {
    assertAcademyLocalMailEnvironment()
    validateAcademyLocalMessage(email)
    const state=readAcademyMailState()
    const response=await academyMailRequest('/api/v1/send','POST',`sender:${state.senderPassword}`,{
      From:{Email:'academy@workmatchr.example.invalid',Name:'WorkMatchr Academy lokaal'},To:[{Email:email.to}],
      Subject:email.subject,Text:email.text,HTML:email.html,
    })
    const result=response.status===200?JSON.parse(response.body):null
    if(!result || typeof result.ID!=='string' || !/^[a-zA-Z0-9-]{1,100}$/.test(result.ID))throw new AcademyLocalMailError()
    return {accepted:true,transport:'LOCAL_MAILPIT',status:'DEVELOPMENT_ONLY',messageId:result.ID}
  } catch { throw new AcademyLocalMailError() }
}
