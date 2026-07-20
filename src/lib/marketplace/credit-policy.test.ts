import { describe, expect, it } from 'vitest'
import { consumeBalance, releaseBalance, reserveBalance } from './credit-policy'

describe('creditinvarianten', () => {
  it('reserveert, consumeert en geeft vrij zonder negatieve saldi', () => {
    expect(reserveBalance({ available: 20, reserved: 0, spent: 0 }, 10)).toEqual({ available: 10, reserved: 10, spent: 0 })
    expect(consumeBalance({ available: 10, reserved: 10, spent: 0 }, 10)).toEqual({ available: 10, reserved: 0, spent: 10 })
    expect(releaseBalance({ available: 10, reserved: 10, spent: 0 }, 10)).toEqual({ available: 20, reserved: 0, spent: 0 })
  })

  it('weigert onvoldoende of ongeldige credits', () => {
    expect(reserveBalance({ available: 5, reserved: 0, spent: 0 }, 10)).toBeNull()
    expect(consumeBalance({ available: 5, reserved: 0, spent: 0 }, 10)).toBeNull()
    expect(releaseBalance({ available: 5, reserved: 0, spent: 0 }, 10)).toBeNull()
  })
})
