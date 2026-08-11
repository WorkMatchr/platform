import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProSubscriptionCheckoutSubmitButton } from './pro-subscription-checkout'

describe('Pro-abonnement checkoutactie', () => {
  it('blokkeert dubbel verzenden en toont een toegankelijke laadstatus', () => {
    const markup = renderToStaticMarkup(<ProSubscriptionCheckoutSubmitButton isPending retryAvailable />)

    expect(markup).toContain('disabled=""')
    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('Beveiligde betaling voorbereiden…')
    expect(markup).toContain('U wordt doorgestuurd naar Mollie.')
    expect(markup).toContain('motion-reduce:animate-none')
  })

  it('herstelt na een serverfout naar de normale retryactie', () => {
    const markup = renderToStaticMarkup(<ProSubscriptionCheckoutSubmitButton isPending={false} retryAvailable />)

    expect(markup).not.toContain('disabled=""')
    expect(markup).not.toContain('aria-busy="true"')
    expect(markup).toContain('Betaling opnieuw proberen')
  })
})
