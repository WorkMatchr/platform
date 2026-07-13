import { betterAuth } from 'better-auth'
import { APIError, createAuthMiddleware } from 'better-auth/api'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { passwordResetEmail, sendAuthEmail, verificationEmail } from '@/lib/email'
import { getPrisma } from '@/lib/prisma'
import { GENERIC_SIGN_IN_ERROR, normalizeEmail, registrationSchema } from '@/lib/auth-validation'
import { AUTH_SESSION_POLICY, canStartSession } from '@/lib/auth-policy'

const appUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'

export const auth = betterAuth({
  appName: 'WorkMatchr',
  baseURL: appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [appUrl],
  database: prismaAdapter(getPrisma(), { provider: 'postgresql' }),
  advanced: { database: { generateId: 'uuid' }, useSecureCookies: process.env.NODE_ENV === 'production' },
  user: {
    fields: { name: 'displayName' },
    additionalFields: {
      platformRole: { type: ['USER', 'ADMIN'], defaultValue: 'USER', input: false },
      status: { type: ['INVITED', 'ACTIVE', 'BLOCKED', 'ARCHIVED'], defaultValue: 'INVITED', input: false },
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
      await sendAuthEmail(passwordResetEmail(user.email, user.name, url))
    },
  },
  emailVerification: {
    expiresIn: 3600,
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail(verificationEmail(user.email, user.name, url))
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

        if (user?.status === 'BLOCKED' || user?.status === 'ARCHIVED') {
          throw new APIError('UNAUTHORIZED', { message: GENERIC_SIGN_IN_ERROR })
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
        before: async (data) => ({ data: data.emailVerified === true ? { ...data, status: 'ACTIVE' } : data }),
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
