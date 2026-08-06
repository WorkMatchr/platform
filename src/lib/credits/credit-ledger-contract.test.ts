import { describe, expect, it } from 'vitest'
import { deriveCreditBalance, getCreditLedgerDelta } from './credit-ledger-contract'

describe('credit-ledger-contract', () => {
  it('berekent totaal, gereserveerd en beschikbaar uitsluitend uit ledgerdelta’s', () => {
    const entries = [
      getCreditLedgerDelta('PURCHASE', 100),
      getCreditLedgerDelta('RESERVATION', 30),
      getCreditLedgerDelta('CONTRIBUTION_BONUS', 10),
    ]
    expect(deriveCreditBalance(entries)).toEqual({
      totalBalance: 110,
      reservedBalance: 30,
      availableBalance: 80,
    })
  })

  it('modelleert vrijgave en definitieve afschrijving afzonderlijk', () => {
    expect(getCreditLedgerDelta('RESERVATION_RELEASE', 20)).toEqual({
      totalDelta: 0,
      reservedDelta: -20,
      ledgerAmount: 20,
    })
    expect(getCreditLedgerDelta('CONSUMPTION', 20)).toEqual({
      totalDelta: -20,
      reservedDelta: -20,
      ledgerAmount: -20,
    })
  })

  it('weigert een negatief beschikbaar saldo', () => {
    expect(() => deriveCreditBalance([
      { totalDelta: 10, reservedDelta: 0 },
      { totalDelta: 0, reservedDelta: 20 },
    ])).toThrow('INVALID_CREDIT_LEDGER_BALANCE')
  })
})
