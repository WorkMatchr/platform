import { describe, expect, it } from 'vitest'
import {
  canScheduleProCancellation,
  getProCancellationExplanation,
  getProSubscriptionStatusLabel,
  hasActiveProBenefits,
  isRetryableProFirstPaymentAttempt,
} from './pro-subscription-presentation'

const future = new Date('2026-09-09T12:00:00Z')
const now = new Date('2026-08-09T12:00:00Z')

function subscription(status: 'PENDING_MANDATE' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELED', scheduled = false) {
  return { status, cancelAtPeriodEnd: scheduled, cancellationEffectiveAt: scheduled ? future : null }
}

describe('WorkMatchr Pro-presentatie en voordeelbeleid', () => {
  it('maakt opzeggen alleen beschikbaar voor ACTIVE en PAST_DUE', () => {
    expect(canScheduleProCancellation(null)).toBe(false)
    expect(canScheduleProCancellation(subscription('ACTIVE'))).toBe(true)
    expect(canScheduleProCancellation(subscription('PAST_DUE'))).toBe(true)
    expect(canScheduleProCancellation(subscription('SUSPENDED'))).toBe(false)
    expect(canScheduleProCancellation(subscription('EXPIRED'))).toBe(false)
    expect(canScheduleProCancellation(subscription('CANCELED'))).toBe(false)
  })

  it('schakelt een al geplande dubbele opzegactie uit', () => {
    expect(canScheduleProCancellation(subscription('ACTIVE', true))).toBe(false)
  })

  it('behoudt Pro-voordelen tot en niet na de geplande einddatum', () => {
    expect(hasActiveProBenefits(subscription('ACTIVE', true), now)).toBe(true)
    expect(hasActiveProBenefits(subscription('ACTIVE', true), future)).toBe(false)
    expect(hasActiveProBenefits(subscription('PAST_DUE', true), now)).toBe(false)
  })

  it('toont een geplande opzegging als actief tot de einddatum en daarna als opgezegd', () => {
    expect(getProSubscriptionStatusLabel(subscription('ACTIVE', true), now)).toContain('Actief tot')
    expect(getProSubscriptionStatusLabel(subscription('ACTIVE', true), future)).toBe('Opgezegd')
  })

  it('geeft ook zonder abonnement en bij uitgeschakelde statussen een toegankelijke toelichting', () => {
    expect(getProCancellationExplanation(null)).toContain('geen actief Pro-abonnement')
    expect(getProCancellationExplanation(subscription('SUSPENDED'))).toContain('opgeschort')
    expect(getProCancellationExplanation(subscription('EXPIRED'))).toContain('verlopen')
    expect(getProCancellationExplanation(subscription('PAST_DUE'))).toContain('achterstallige status blijft ongewijzigd')
  })

  it('maakt uitsluitend een niet-gestarte lokale eerste betaalpoging opnieuw probeerbaar', () => {
    expect(isRetryableProFirstPaymentAttempt({ status: 'CREATED', molliePaymentId: null, mollieCheckoutUrl: null })).toBe(true)
    expect(isRetryableProFirstPaymentAttempt({ status: 'CREATED', molliePaymentId: 'tr_first', mollieCheckoutUrl: null })).toBe(false)
    expect(isRetryableProFirstPaymentAttempt({ status: 'PAYMENT_PENDING', molliePaymentId: 'tr_first', mollieCheckoutUrl: 'https://checkout.example.invalid' })).toBe(false)
  })
})
