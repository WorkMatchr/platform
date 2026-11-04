 'use server'
import { receiveAcademyWithdrawal } from '@/lib/learning/academy-withdrawal-service'
import { AcademyCommerceError } from '@/lib/learning/academy-commerce-policy'
export type WithdrawalState = { reference?: string; receivedAt?: string; error?: string }
export async function submitWithdrawal(_: WithdrawalState, form: FormData): Promise<WithdrawalState> {
  try { return await receiveAcademyWithdrawal({ requestKey: form.get('requestKey'), orderReference: form.get('orderReference'), email: form.get('email'), confirmed: form.get('confirmed') === 'yes', declarationVersion: form.get('declarationVersion') }) }
  catch (error) { return { error: error instanceof AcademyCommerceError && error.code === 'WITHDRAWAL_RATE_LIMIT'
    ? 'Er zijn veel verzoeken ontvangen. Wacht een minuut en probeer opnieuw. Uw gegevens blijven ingevuld.'
    : 'Uw verklaring kon niet worden geregistreerd. Controleer uw gegevens en probeer opnieuw. Uw invoer blijft bewaard.' } }
}
