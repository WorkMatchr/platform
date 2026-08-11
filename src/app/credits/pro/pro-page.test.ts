import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(process.cwd(), 'src/app/credits/pro/page.tsx'), 'utf8')
const checkoutSource = readFileSync(join(process.cwd(), 'src/components/finance/pro-subscription-checkout.tsx'), 'utf8')
const actionsSource = readFileSync(join(process.cwd(), 'src/app/credits/actions.ts'), 'utf8')

describe('WorkMatchr Pro-interface', () => {
  it('toont prijs, status en de bestaande Mollie-startactie', () => {
    expect(source).toContain("formatEuro(WORKMATCHR_PRO_PLAN.amountExclVatCents).replace(/\\s/g, '')")
    expect(source).toContain('excl. btw per maand')
    expect(checkoutSource).toContain('Start Pro via Mollie')
    expect(source).toContain('getProSubscriptionStatusLabel(subscription)')
    expect(checkoutSource).toContain('U betaalt de eerste maand via iDEAL of kaart.')
    expect(checkoutSource).toContain('daaropvolgende maandelijkse betaling')
  })

  it('toont de opzegknop altijd en koppelt disabled aan het centrale beleid', () => {
    expect(source).toContain('>Pro opzeggen</Button>')
    expect(source).toContain('disabled={!cancellationAvailable}')
    expect(source).toContain('aria-describedby="pro-cancellation-explanation"')
    expect(source).toContain('id="pro-cancellation-explanation"')
  })

  it('toont na een succesvolle opzegging de berekende einddatum', () => {
    expect(source).toContain("opgezegd && subscription?.cancellationEffectiveAt")
    expect(source).toContain('role="status"')
  })

  it('verdeelt de betaalstap in responsieve gegevens- en betalingsblokken', () => {
    expect(source).toContain('return <Section spacing="compact">')
    expect(checkoutSource).toContain('lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]')
    expect(checkoutSource).toContain('grid items-stretch gap-6')
    expect(checkoutSource).toContain('>Uw gegevens</legend>')
    expect(checkoutSource).toContain('aria-labelledby="pro-payment-heading"')
    expect(checkoutSource).toContain('>Betaling</p>')
    expect(checkoutSource).toContain('Prijsopbouw WorkMatchr Pro')
    expect(checkoutSource).toContain('>Te betalen</dt>')
    expect(checkoutSource).toContain('mt-auto grid gap-2 pt-6')
  })

  it('toont een herstelactie voor een terminale of nooit extern gestarte eerste betaalpoging zonder mandate of actief abonnement', () => {
    expect(source).toContain('isRetryableProFirstPaymentAttempt(latestFirstPayment)')
    expect(checkoutSource).toContain("retryAvailable ? 'Betaling opnieuw proberen' : 'Start Pro via Mollie'")
    expect(source).toContain("subscription.mollieMandateId === null")
    expect(source).toContain("subscription.mollieSubscriptionId === null")
  })

  it('toont een herbruikbare laadactie en nette melding wanneer Mollie geen betaalmethode aanbiedt', () => {
    expect(checkoutSource).toContain('loadingLabel="Beveiligde betaling voorbereiden…"')
    expect(checkoutSource).toContain('aria-busy={isPending || undefined}')
    expect(actionsSource).toContain('MOLLIE_PRO_FIRST_PAYMENT_METHOD_UNAVAILABLE')
    expect(actionsSource).toContain('Er is momenteel geen geschikte betaalmethode beschikbaar voor de eerste abonnementsbetaling. Pro is nog niet geactiveerd.')
  })

  it('behoudt de permanente foutdiagnostiek maar verwijdert de tijdelijke runtime-route', () => {
    expect(existsSync(join(process.cwd(), 'src/app/api/maintenance/finance/mollie-runtime-diagnostic/route.ts'))).toBe(false)
    expect(existsSync(join(process.cwd(), 'src/app/api/maintenance/finance/mollie-runtime-diagnostic/route.test.ts'))).toBe(false)
  })
})
