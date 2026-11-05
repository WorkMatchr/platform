import { describe,it,expect } from 'vitest'
import { randomUUID } from 'node:crypto'
import { ACADEMY_MAIL_URL,ACADEMY_APP_ORIGIN } from './academy-local-mail-policy'
import { academyMailRequest,readAcademyMailState } from './academy-local-mail'
import { readAcademyMailPrivateFile } from './academy-local-mail-private'
import { verificationEmail,sendAuthEmail } from './email'

describe.skipIf(process.env.ACADEMY_MAIL_RUNTIME!=='1')('real private Mailpit, no accounts or Better Auth tokens',()=>{
  it('requires the per-run TLS certificate',async()=>{await expect(fetch(ACADEMY_MAIL_URL)).rejects.toThrow()})
  it('requires operator authentication and denies the send role mailbox access',async()=>{
    expect((await academyMailRequest('/api/v1/messages','GET',undefined)).status).toBe(401)
    expect((await academyMailRequest('/api/v1/messages','GET',`sender:${readAcademyMailState().senderPassword}`)).status).toBe(401)
    expect((await academyMailRequest('/api/v1/messages','GET',readAcademyMailPrivateFile('ui.auth').trim())).status).toBe(200)
    expect((await academyMailRequest('/api/v1/send','POST',readAcademyMailPrivateFile('ui.auth').trim(),{})).status).toBe(401)
  })
  it('captures a synthetic message without generating or using an account-verification token',async()=>{
    const url=`${ACADEMY_APP_ORIGIN}/api/auth/verify-email?localCaptureProbe=${randomUUID()}`
    const result=await sendAuthEmail(verificationEmail('capture-fixture@example.invalid','Lokale rooktest',url))
    expect(result.transport).toBe('LOCAL_MAILPIT')
    const response=await academyMailRequest(`/api/v1/message/${result.messageId}`,'GET',readAcademyMailPrivateFile('ui.auth').trim())
    expect(response.status).toBe(200)
    const message=JSON.parse(response.body)
    expect(message.Text).toContain(url)
    const deleted=await academyMailRequest('/api/v1/messages','DELETE',readAcademyMailPrivateFile('ui.auth').trim(),{IDs:[result.messageId]})
    expect(deleted.status).toBe(200)
  })
})
