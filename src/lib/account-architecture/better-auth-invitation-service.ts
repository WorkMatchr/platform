import { randomBytes } from 'node:crypto'
import { auth } from '@/lib/auth'
import { withInvitationActivationDelivery } from '@/lib/auth-email-delivery-context'
import { AuthEmailDeliveryError, type AuthEmailDeliveryResult } from '@/lib/email'
import { getPrisma } from '@/lib/prisma'

export async function hashInvitationCredential(): Promise<string> {
  const context = await auth.$context
  return context.password.hash(randomBytes(48).toString('base64url'))
}

export async function sendOrganizationInvitationActivation(input: {
  email: string
  organizationId: string
  organizationName: string
  requestHeaders?: Headers
}): Promise<AuthEmailDeliveryResult> {
  const invitedUser = await getPrisma().user.findUnique({
    where: { email: input.email.trim().toLowerCase() },
    select: { id: true },
  })
  if (invitedUser) {
    await getPrisma().verification.deleteMany({
      where: {
        value: invitedUser.id,
        identifier: { startsWith: 'reset-password:' },
      },
    })
  }
  const delivery = await withInvitationActivationDelivery(
    { organizationId: input.organizationId, organizationName: input.organizationName },
    () => auth.api.requestPasswordReset({
      body: { email: input.email, redirectTo: '/account-activeren' },
      headers: input.requestHeaders,
    }),
  )
  if (!delivery) {
    throw new AuthEmailDeliveryError(
      'EMAIL_PROVIDER_RESPONSE_INVALID',
      'De e-mailprovider gaf geen controleerbaar bezorgresultaat terug.',
    )
  }
  return delivery
}
