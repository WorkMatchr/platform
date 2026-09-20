// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MarketplacePricingFields } from './marketplace-pricing-fields'
import { pricingExpertises } from '@/lib/marketplace/assignment-pricing'

afterEach(cleanup)
it('shows twenty canonical editable corrections and recomputes prices with the floor', () => {
  render(<MarketplacePricingFields basePrice={25} minimumPrice={5} adjustments={{}} />)
  expect(screen.getAllByRole('spinbutton')).toHaveLength(22)
  expect(screen.getAllByText('Berekende prijs: 25 credits')).toHaveLength(20)
  fireEvent.change(screen.getByLabelText('Prijscorrectie Hogere veiligheidskundige (HVK)'), { target: { value: '5' } })
  expect(screen.getByText('Berekende prijs: 30 credits')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Basisprijs (credits)'), { target: { value: '27' } })
  expect(screen.getByText('Berekende prijs: 32 credits')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Prijscorrectie Hogere veiligheidskundige (HVK)'), { target: { value: '-100' } })
  expect(screen.getByText('Berekende prijs: 5 credits')).toBeTruthy()
  for (const { code } of pricingExpertises) expect(document.querySelector(`[name="adjustment:${code}"]`)).toBeTruthy()
})
