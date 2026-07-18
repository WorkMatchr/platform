import { randomBytes } from 'node:crypto'
import { auth } from '@/lib/auth'
import { withAuthEmailDeliveryCapture } from '@/lib/auth-email-delivery-context'
import { AuthEmailDeliveryError, type AuthEmailDeliveryResult } from '@/lib/email'

export async function hashInvitationCredential(): Promise<string> {
  const context = await auth.$context
  return context.password.hash(randomBytes(48).toString('base64url'))
}

export async function sendOrganizationInvitationVerification(email: string): Promise<AuthEmailDeliveryResult> {
  const delivery = await withAuthEmailDeliveryCapture(() => auth.api.sendVerificationEmail({
    body: { email, callbackURL: '/verifieer-email?status=uitnodiging' },
  }))
  if (!delivery) {
    throw new AuthEmailDeliveryError(
      'EMAIL_PROVIDER_RESPONSE_INVALID',
      'De e-mailprovider gaf geen controleerbaar bezorgresultaat terug.',
    )
  }
  return delivery
}
