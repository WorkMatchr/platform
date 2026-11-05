import { assertAcademyDatabaseTarget } from './learning/academy-database-policy'
import type { AuthEmail } from './email'

export const ACADEMY_MAIL_URL = 'https://127.0.0.1:8025'
export const ACADEMY_APP_ORIGIN = 'http://127.0.0.1:3002'
export const ACADEMY_MAIL_IMAGE = 'axllent/mailpit@sha256:df6c2541907e1be6fac21f509927cf6ed771617a1f4b361ef66d97bd05593d2d'
export const ACADEMY_MAIL_CONTAINER = 'workmatchr-academy-local-mail'
export const ACADEMY_MAIL_NETWORK = 'workmatchr-academy-mail-isolated'
export const ACADEMY_MAIL_LABEL = 'workmatchr.academy-local-mail'

export class AcademyLocalMailError extends Error {
  constructor() { super('Lokale Academy-mailopvang is niet veilig beschikbaar of geconfigureerd.'); this.name = 'AcademyLocalMailError' }
}

export function academyLocalMailSelected(env: Record<string,string|undefined> = process.env) {
  return env.ACADEMY_LOCAL_MAIL !== undefined || env.ACADEMY_TEST_PROJECT_ID === 'academy-synthetic-project'
}

export function assertAcademyLocalMailEnvironment(env: Record<string,string|undefined> = process.env) {
  try {
    if (env.ACADEMY_LOCAL_MAIL !== '1' || env.VERCEL || env.VERCEL_ENV || env.RESEND_API_KEY || env.AUTH_EMAIL_FROM
      || env.BETTER_AUTH_URL !== ACADEMY_APP_ORIGIN || env.NEXT_PUBLIC_APP_URL !== ACADEMY_APP_ORIGIN) throw new AcademyLocalMailError()
    return assertAcademyDatabaseTarget({databaseUrl:env.DATABASE_URL,projectId:env.ACADEMY_TEST_PROJECT_ID,branchId:env.ACADEMY_TEST_BRANCH_ID,nodeEnv:env.NODE_ENV,vercelEnv:env.VERCEL_ENV})
  } catch { throw new AcademyLocalMailError() }
}

export function validateAcademyLocalMessage(email: AuthEmail) {
  try {
    if (!['VERIFICATION','INVITATION','PASSWORD_RESET'].includes(email.kind) || !/^[^\s@]+@(?:[a-z0-9-]+\.)*example\.invalid$/i.test(email.to)
      || email.attachments?.length || !email.developmentUrl || JSON.stringify(email).length > 128_000) throw new AcademyLocalMailError()
    const url = new URL(email.developmentUrl)
    if (url.origin !== ACADEMY_APP_ORIGIN || url.username || url.password
      || (email.kind === 'VERIFICATION' ? url.pathname !== '/api/auth/verify-email' : !url.pathname.startsWith('/api/auth/reset-password/'))) throw new AcademyLocalMailError()
    const callback = url.searchParams.get('callbackURL')
    if (callback && new URL(callback,ACADEMY_APP_ORIGIN).origin !== ACADEMY_APP_ORIGIN) throw new AcademyLocalMailError()
  } catch { throw new AcademyLocalMailError() }
}

/** Only a loopback HTTPS port is published; no SMTP publish, relay or host network. */
export function academyMailContainerArguments() {
  return ['run','--detach','--pull','never','--name',ACADEMY_MAIL_CONTAINER,'--label',`${ACADEMY_MAIL_LABEL}=true`,
    '--network',ACADEMY_MAIL_NETWORK,'--dns','127.0.0.1','--publish','127.0.0.1:8025:8025','--read-only','--tmpfs','/tmp:rw,noexec,nosuid,size=32m',
    '--tmpfs','/private:rw,noexec,nosuid,size=1m,mode=0700',
    '--cap-drop','ALL','--security-opt','no-new-privileges=true','--log-driver','none','--no-healthcheck','--entrypoint','/bin/sh',ACADEMY_MAIL_IMAGE,
    '-c','while [ ! -f /private/ready ]; do sleep 0.1; done; exec /mailpit --listen 0.0.0.0:8025 --smtp 127.0.0.1:1025 --database /tmp/mailpit.db --max 50 --max-age 1h --quiet --disable-version-check --block-remote-css-and-fonts --ui-auth-file /private/ui.auth --send-api-auth-file /private/send.auth --ui-tls-cert /private/cert.pem --ui-tls-key /private/key.pem']
}
