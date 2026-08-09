import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculateCreditPurchasePrice } from '@/lib/finance/financial-contract'
import { calculateAuthoritativeMollieCreditPrice } from '@/lib/finance/mollie-test-pricing'
import { CreditCheckoutSubmitButton, CreditPriceBreakdown } from './credit-purchase-checkout'

vi.mock('server-only', () => ({}))

function visibleText(markup: string) {
  return markup
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('−', '-')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('creditcheckout', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('toont voor 50 credits 50 euro exclusief, 10,50 btw en 60,50 totaal', () => {
    const markup = renderToStaticMarkup(
      <CreditPriceBreakdown
        normalPackagePriceCents={5_000}
        price={calculateCreditPurchasePrice({ packageSku: 'CREDITS_50', hasActivePro: false })}
      />,
    )
    const text = visibleText(markup)
    expect(text).toContain('50 credits')
    expect(text).toContain('Pakketprijs € 50,00')
    expect(text).toContain('Subtotaal excl. btw € 50,00')
    expect(text).toContain('Btw 21% € 10,50')
    expect(text).toContain('Te betalen € 60,50')
  })

  it('maakt pakketkorting en Pro-korting afzonderlijk zichtbaar', () => {
    const markup = renderToStaticMarkup(
      <CreditPriceBreakdown
        normalPackagePriceCents={10_000}
        price={calculateCreditPurchasePrice({ packageSku: 'CREDITS_100', hasActivePro: true })}
      />,
    )
    const text = visibleText(markup)
    expect(text).toContain('Pakketkorting - € 5,00')
    expect(text).toContain('Pro-korting - € 9,50')
    expect(text).toContain('Subtotaal excl. btw € 85,50')
  })

  it('toont de sandbox-testprijs en werkelijk te betalen bedragen', () => {
    vi.stubEnv('MOLLIE_API_KEY', 'test_fictieveacceptatiesleutel')
    const markup = renderToStaticMarkup(
      <CreditPriceBreakdown
        normalPackagePriceCents={2_500}
        price={calculateAuthoritativeMollieCreditPrice({ packageSku: 'CREDITS_25', hasActivePro: true })}
      />,
    )
    const text = visibleText(markup)
    expect(text).toContain('Normale pakketprijs € 25,00')
    expect(text).toContain('Sandbox-testprijs € 1,00')
    expect(text).toContain('Btw 21% € 0,21')
    expect(text).toContain('Te betalen € 1,21')
    expect(text).not.toContain('Pro-korting')
  })

  it('blokkeert dubbel verzenden en toont een toegankelijke laadstatus', () => {
    const markup = renderToStaticMarkup(<CreditCheckoutSubmitButton disabled={false} pending />)
    expect(markup).toContain('disabled=""')
    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('Beveiligde betaling voorbereiden…')
    expect(markup).toContain('U wordt doorgestuurd naar Mollie.')
    expect(markup).toContain('motion-reduce:animate-none')
  })

  it('herstelt na een fout naar een actieve betaalactie', () => {
    const markup = renderToStaticMarkup(<CreditCheckoutSubmitButton disabled={false} pending={false} />)
    expect(markup).not.toContain('disabled=""')
    expect(markup).not.toContain('aria-busy="true"')
    expect(markup).toContain('Ga veilig naar Mollie')
  })

  it('bevat een stapelende en breedteveilige responsive checkoutindeling', () => {
    const source = readFileSync('src/components/finance/credit-purchase-checkout.tsx', 'utf8')
    expect(source).toContain('lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]')
    expect(source).toContain('sm:grid-cols-[minmax(0,1fr)_auto]')
    expect(source).toContain('w-full sm:w-auto')
  })
})
