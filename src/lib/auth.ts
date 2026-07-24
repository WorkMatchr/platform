import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { passwordResetEmail, sendAuthEmail, verificationEmail } from '@/lib/email'
import { captureAuthEmailDelivery } from '@/lib/auth-email-delivery-context'
import { getPrisma } from '@/lib/prisma'
import { GENERIC_SIGN_IN_ERROR, normalizeEmail, registrationSchema } from '@/lib/auth-validation'
import { AUTH_SESSION_POLICY, canStartSession, canUseAccountRecovery, shouldActivateVerifiedInvitation } from '@/lib/auth-policy'
import { activateVerifiedInvitation } from '@/lib/account-architecture/invitation-acceptance-service'
import { AUTH_BASE_PATH } from '@/lib/auth-config'

const configuredAppUrl =
  process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const authBaseURL =
  process.env.NODE_ENV === 'development'
    ? {
        allowedHosts: ['localhost:*', '127.0.0.1:*'],
        fallback: configuredAppUrl,
        protocol: 'http' as const,
      }
    : configuredAppUrl
const authTrustedOrigins =
  process.env.NODE_ENV === 'development'
    ? [configuredAppUrl, 'http://localhost:*', 'http://127.0.0.1:*']
    : [configuredAppUrl]

export const auth = betterAuth({
  appName: 'WorkMatchr',
  baseURL: authBaseURL,
  basePath: AUTH_BASE_PATH,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: authTrustedOrigins,
  database: prismaAdapter(getPrisma(), { provider: 'postgresql' }),
  advanced: { database: { generateId: 'uuid' }, useSecureCookies: process.env.NODE_ENV === 'production' },
  user: {
    fields: { name: 'displayName' },
    additionalFields: {
      platformRole: { type: ['USER', 'ADMIN'], defaultValue: 'USER', input: false },
      status: {
        type: ['INVITED', 'ACTIVE', 'BLOCKED', 'ARCHIVED', 'DELETION_PENDING', 'ANONYMIZED'],
        defaultValue: 'INVITED',
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: AUTH_SESSION_POLICY.revokeSessionsOnPasswordReset,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      const current = await getPrisma().user.findUnique({ where: { id: user.id }, select: { status: true } })
      if (!canUseAccountRecovery(current?.status ?? null)) return
      const delivery = await sendAuthEmail(passwordResetEmail(user.email, user.name, url))
      captureAuthEmailDelivery(delivery)
    },
  },
  emailVerification: {
    expiresIn: 3600,
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      const delivery = await sendAuthEmail(verificationEmail(user.email, user.name, url))
      captureAuthEmailDelivery(delivery)
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  rateLimit: {
    enabled: true,
    storage: 'database',
    modelName: 'RateLimit',
    window: 60,
    max: 100,
    customRules: {
      '/sign-up/email': { window: 60, max: 5 },
      '/sign-in/email': { window: 60, max: 5 },
      '/send-verification-email': { window: 300, max: 3 },
      '/request-password-reset': { window: 300, max: 3 },
      '/reset-password': { window: 300, max: 5 },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === '/sign-in/email') {
        const email = typeof ctx.body?.email === 'string' ? normalizeEmail(ctx.body.email) : ''
        const user = email
          ? await getPrisma().user.findUnique({ where: { email }, select: { status: true } })
          : null

        if (user && !canStartSession(user.status)) {
          throw new APIError('UNAUTHORIZED', { message: GENERIC_SIGN_IN_ERROR })
        }
      }

      if (ctx.path === '/reset-password') {
        const token = typeof ctx.body?.token === 'string' ? ctx.body.token : ''
        if (token) {
          const verification = await getPrisma().verification.findFirst({
            where: { identifier: `reset-password:${token}` },
            select: { value: true },
          })
          const user = verification
            ? await getPrisma().user.findUnique({ where: { id: verification.value }, select: { status: true } })
            : null
          if (user && !canUseAccountRecovery(user.status)) {
            throw new APIError('BAD_REQUEST', { message: 'De herstelcode is ongeldig of verlopen.' })
          }
        }
      }

      if (ctx.path !== '/sign-up/email') return

      const result = registrationSchema.safeParse({
        name: ctx.body?.name,
        email: ctx.body?.email,
        password: ctx.body?.password,
        passwordConfirmation: ctx.body?.passwordConfirmation,
        acceptedTerms: ctx.body?.acceptedTerms === true ? 'on' : undefined,
      })

      if (!result.success) {
        throw new APIError('BAD_REQUEST', { message: 'Controleer de ingevulde registratiegegevens.' })
      }

      ctx.body.email = result.data.email
      ctx.body.name = result.data.name
    }),
  },
  databaseHooks: {
    user: {
      create: { before: async (user) => ({ data: { ...user, email: user.email.trim().toLowerCase() } }) },
      update: {
        after: async (user, context) => {
          if (context?.path !== '/verify-email') return
          const current = await getPrisma().user.findUnique({
            where: { id: user.id },
            select: { status: true, emailVerified: true, migrationClassification: true },
          })
          if (current && shouldActivateVerifiedInvitation(current)) {
            await activateVerifiedInvitation(user.id)
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const user = await getPrisma().user.findUnique({ where: { id: session.userId }, select: { status: true } })
          return user && canStartSession(user.status) ? { data: session } : false
        },
      },
    },
  },
  plugins: [nextCookies()],
})
