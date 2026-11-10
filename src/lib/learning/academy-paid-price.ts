import { chooseAcademyPrice, type AcademyPrices, type AcademyPromotion } from './academy-pricing-policy'

export const PILOT_GROSS_CENTS = 14900
export const KOR_NOTICE = 'Feenstra Safety Consulting past de kleineondernemersregeling (KOR) toe.'

// The effective date and confirmation reference are configured together after receipt of the decision.
export function pilotTax(at: Date) {
  if (!Number.isFinite(at.getTime()) || process.env.ACADEMY_PILOT_TAX !== 'NL_KOR_CONFIRMED')
    throw Error('PILOT_TAX_REVIEW_REQUIRED')
  const end = process.env.ACADEMY_CONFIRMED_KOR_END_DATE
  const reference = process.env.ACADEMY_KOR_END_DECISION_REF?.trim()
  if (!end && !reference) return 'NL_KOR'
  if (
    !end ||
    !reference ||
    !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
    !Number.isFinite(Date.parse(end)) ||
    new Date(end).toISOString().slice(0, 10) !== end
  )
    throw Error('PILOT_TAX_REVIEW_REQUIRED')
  const localDay = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at)
  return localDay < end ? 'NL_KOR' : 'NL_STANDARD'
}

export function pilotQuote(gross: number, at: Date) {
  const treatment = pilotTax(at)
  if (gross !== PILOT_GROSS_CENTS) throw Error('PILOT_TAX_REVIEW_REQUIRED')
  const prices: AcademyPrices = {
    id: null,
    revision: 1,
    scopeKey: 'PILOT',
    individualCents: gross,
    fiveCents: gross,
    followUpIndividualCents: gross,
    followUpFiveCents: gross,
    vatRateBps: treatment === 'NL_KOR' ? 0 : 2100,
    vatTreatment: treatment === 'NL_KOR' ? 'EXEMPT' : 'TAXABLE',
    taxStatus: 'APPROVED',
    taxReference: 'Feenstra Safety Consulting / ' + treatment,
  }
  const promotion: AcademyPromotion = {
    id: 'personal-pilot',
    revision: 1,
    kind: 'CODE',
    percentage: 99,
    label: 'Persoonlijke pilotkorting',
    code: null,
    userId: null,
    organizationId: null,
    courseIds: [],
    active: true,
    validFrom: null,
    validUntil: null,
    maximumUses: 1,
    maximumPerAccount: 1,
    quantity: 1,
  }
  const { financial } = chooseAcademyPrice(prices, 1, [promotion], null)
  if (financial.amountInclVatCents !== 149) throw Error('PILOT_PRICE_INVALID')
  return { ...financial, discountCodeDiscountCents: financial.packageDiscountCents, packageDiscountCents: 0 }
}

// If all candidate events have the same treatment, the amounts are unambiguous.
// At a transition use only the documented invoice, receipt or supply instant.
export function pilotAssessment(purchase: { id: string; createdAt: Date; vatRateBps: number }, paidAt: Date, fulfilledAt: Date) {
  const regimes = [purchase.createdAt, paidAt, fulfilledAt].map(pilotTax)
  if (regimes.every(regime => regime === regimes[0]) && purchase.vatRateBps === (regimes[0] === 'NL_KOR' ? 0 : 2100)) {
    return { at: paidAt, basis: 'SAME_REGIME' }
  }
  const [id, event, instant, reference] = (process.env.ACADEMY_PILOT_TAX_DECISION ?? '').split('|')
  const at = new Date(instant)
  if (id !== purchase.id || !['INVOICE', 'RECEIPT', 'SUPPLY'].includes(event) || !reference?.trim()
    || !Number.isFinite(at.getTime()) || at.toISOString() !== instant || at > fulfilledAt
    || (event === 'RECEIPT' && at.getTime() !== paidAt.getTime())) throw Error('PILOT_TAX_POINT_REVIEW_REQUIRED')
  return { at, basis: event + ':' + reference }
}
