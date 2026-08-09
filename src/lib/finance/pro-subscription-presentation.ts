import { hasEffectiveProEntitlement } from './pro-entitlement-service'

export type ProSubscriptionStatus =
  | 'PENDING_MANDATE'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'EXPIRED'
  | 'CANCELED'

export type ProSubscriptionSummary = Readonly<{
  status: ProSubscriptionStatus
  cancelAtPeriodEnd: boolean
  cancellationEffectiveAt: Date | null
}>

export const proSubscriptionStatusLabels: Readonly<Record<ProSubscriptionStatus, string>> = Object.freeze({
  PENDING_MANDATE: 'Activering wordt afgerond',
  ACTIVE: 'Actief',
  PAST_DUE: 'Betaling achterstallig',
  SUSPENDED: 'Opgeschort',
  EXPIRED: 'Verlopen',
  CANCELED: 'Opgezegd',
})

export function canScheduleProCancellation(subscription: ProSubscriptionSummary | null) {
  return Boolean(
    subscription
    && ['ACTIVE', 'PAST_DUE'].includes(subscription.status)
    && !subscription.cancelAtPeriodEnd,
  )
}

export function hasActiveProBenefits(subscription: ProSubscriptionSummary | null, at = new Date()) {
  return hasEffectiveProEntitlement(subscription, at)
}

export function getProCancellationExplanation(subscription: ProSubscriptionSummary | null) {
  if (!subscription) return 'Uw organisatie heeft geen actief Pro-abonnement.'
  if (subscription.cancelAtPeriodEnd && subscription.cancellationEffectiveAt) {
    const verb = subscription.cancellationEffectiveAt <= new Date() ? 'is geëindigd' : 'eindigt'
    return `Uw Pro-abonnement ${verb} op ${formatProEndDate(subscription.cancellationEffectiveAt)}.`
  }
  if (subscription.status === 'ACTIVE') return 'U behoudt uw Pro-voordelen tot het einde van de huidige betaalperiode.'
  if (subscription.status === 'PAST_DUE') return 'Opzeggen voorkomt een volgende verlenging. De achterstallige status blijft ongewijzigd.'
  if (subscription.status === 'SUSPENDED') return 'Een opgeschort Pro-abonnement kan hier niet worden opgezegd.'
  if (subscription.status === 'EXPIRED') return 'Een verlopen Pro-abonnement kan niet meer worden opgezegd.'
  if (subscription.status === 'CANCELED') return 'Dit Pro-abonnement is al opgezegd.'
  return 'Pro kan worden opgezegd zodra het abonnement actief is.'
}

export function getProSubscriptionStatusLabel(subscription: ProSubscriptionSummary | null, at = new Date()) {
  if (!subscription) return 'Niet actief'
  if (subscription.cancelAtPeriodEnd && subscription.cancellationEffectiveAt) {
    if (subscription.cancellationEffectiveAt <= at) return 'Opgezegd'
    if (subscription.status === 'ACTIVE') return `Actief tot ${formatProEndDate(subscription.cancellationEffectiveAt)}`
  }
  return proSubscriptionStatusLabels[subscription.status]
}

export function formatProEndDate(value: Date) {
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'Europe/Amsterdam' }).format(value)
}
