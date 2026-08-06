import { describe, expect, it } from 'vitest'
import { creditTransactionTypeLabels } from './marketplace-presentation'

describe('Marketplace-presentatie', () => {
  it('heeft Nederlandse labels voor iedere nieuwe creditmutatie', () => {
    expect(creditTransactionTypeLabels.PARTICIPATION_PAYMENT).toBe(
      'Deelnameplaats betaald',
    )
    expect(creditTransactionTypeLabels.WITHDRAWAL_REFUND).toBe(
      'Teruggave na intrekking',
    )
    expect(creditTransactionTypeLabels.UNAWARDED_QUOTE_REFUND).toBe(
      'Teruggave na niet-gegunde offerte',
    )
    expect(creditTransactionTypeLabels.REVERSAL).toBe('Tegenboeking')
  })
})
