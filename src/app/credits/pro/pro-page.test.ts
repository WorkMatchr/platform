import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(process.cwd(), 'src/app/credits/pro/page.tsx'), 'utf8')

describe('WorkMatchr Pro-interface', () => {
  it('toont prijs, status en de bestaande Mollie-startactie', () => {
    expect(source).toContain("formatEuro(WORKMATCHR_PRO_PLAN.amountExclVatCents).replace(/\\s/g, '')")
    expect(source).toContain('excl. btw per maand')
    expect(source).toContain('Start Pro via Mollie')
    expect(source).toContain('getProSubscriptionStatusLabel(subscription)')
    expect(source).toContain('U betaalt de eerste maand via iDEAL of kaart.')
    expect(source).toContain('daaropvolgende maandelijkse betaling')
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
    expect(source).toContain('lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]')
    expect(source).toContain('>Uw gegevens</legend>')
    expect(source).toContain('aria-labelledby="pro-payment-heading"')
    expect(source).toContain('>Betaling</p>')
    expect(source).toContain('Prijsopbouw WorkMatchr Pro')
    expect(source).toContain('>Te betalen</dt>')
  })

  it('toont een herstelactie uitsluitend voor een terminale eerste betaalpoging zonder mandate of actief abonnement', () => {
    expect(source).toContain("['FAILED', 'CANCELED', 'EXPIRED'].includes(latestFirstPayment.status)")
    expect(source).toContain("retryAvailable ? 'Betaling opnieuw proberen' : 'Start Pro via Mollie'")
    expect(source).toContain("subscription.mollieMandateId === null")
    expect(source).toContain("subscription.mollieSubscriptionId === null")
  })
})
