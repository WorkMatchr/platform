import { describe,expect,it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { ACADEMY_APP_ORIGIN,ACADEMY_MAIL_IMAGE,assertAcademyLocalMailEnvironment,validateAcademyLocalMessage,academyMailContainerArguments } from './academy-local-mail-policy'
import { verificationEmail,invitationActivationEmail } from './email'
const env={NODE_ENV:'test',ACADEMY_LOCAL_MAIL:'1',ACADEMY_TEST_PROJECT_ID:'academy-synthetic-project',ACADEMY_TEST_BRANCH_ID:'branch-fixture-little-hill',DATABASE_URL:'postgresql://test:placeholder@fixture-6e93ad508d.example.invalid/neondb?sslmode=verify-full',BETTER_AUTH_URL:ACADEMY_APP_ORIGIN,NEXT_PUBLIC_APP_URL:ACADEMY_APP_ORIGIN}
describe('Academy local mail environment and outbound isolation',()=>{
  it('requires the pinned Academy environment plus local application origins',()=>{expect(assertAcademyLocalMailEnvironment(env).projectId).toBe('academy-synthetic-project')})
  it.each([
    {...env,NODE_ENV:'production'},{...env,VERCEL_ENV:'production'},{...env,VERCEL:'1'},{...env,NODE_ENV:undefined},
    {...env,ACADEMY_LOCAL_MAIL:'0'},{...env,ACADEMY_TEST_PROJECT_ID:'fixture-842b0f40ee'},{...env,ACADEMY_TEST_BRANCH_ID:'other'},
    {...env,DATABASE_URL:undefined},{...env,DATABASE_URL:'invalid'},{...env,DATABASE_URL:env.DATABASE_URL.replace('fixture-6e93ad508d.example.invalid','different.example.invalid')},
    {...env,DATABASE_URL:env.DATABASE_URL.replace('neondb','other')},{...env,RESEND_API_KEY:'mock-key'},
    {...env,BETTER_AUTH_URL:'https://www.workmatchr.nl'},{...env,NEXT_PUBLIC_APP_URL:'http://127.0.0.1:3001'},
  ])('refuses unsafe configuration without fallback (%#)',value=>{expect(()=>assertAcademyLocalMailEnvironment(value)).toThrow()})
  it('retains normal Better Auth links only for fictional recipients and local callbacks',()=>{
    const message=verificationEmail('operator@example.invalid','Test',`${ACADEMY_APP_ORIGIN}/api/auth/verify-email?probe=${randomUUID()}`)
    expect(()=>validateAcademyLocalMessage(message)).not.toThrow()
    const activation=invitationActivationEmail('operator@example.invalid','Test','Test',`${ACADEMY_APP_ORIGIN}/api/auth/reset-password/${randomUUID()}?callbackURL=%2Faccount-activeren`)
    expect(()=>validateAcademyLocalMessage(activation)).not.toThrow()
    for(const changed of [{...message,to:'operator@external.invalid'},{...message,developmentUrl:message.developmentUrl!.replace('127.0.0.1','evil.invalid')},{...message,developmentUrl:message.developmentUrl+'&callbackURL=https://evil.invalid'},{...message,attachments:[{filename:'unexpected',content:'x'}]}])expect(()=>validateAcademyLocalMessage(changed)).toThrow()
  })
  it('publishes only loopback TLS, with private roles, ephemeral storage and no SMTP forwarding',()=>{
    const args=academyMailContainerArguments()
    expect(args).toContain(ACADEMY_MAIL_IMAGE)
    expect(args.filter(value=>value==='--publish')).toHaveLength(1)
    expect(args).toContain('127.0.0.1:8025:8025')
    expect(args.join(' ')).toContain('--send-api-auth-file');expect(args.join(' ')).toContain('--ui-auth-file')
    expect(args.join(' ')).toContain('--ui-tls-cert');expect(args).toContain('--read-only');expect(args).toContain('--tmpfs')
    expect(args).toContain('--log-driver');expect(args).toContain('none')
    expect(args.join(' ')).not.toMatch(/smtp-relay|smtp-forward|auth-accept-any|--privileged|--network host/)
  })
})
