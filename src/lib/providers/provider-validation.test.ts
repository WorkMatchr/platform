import { describe, expect, it } from 'vitest'
import { createCapabilitySchema, uuidSchema } from './provider-validation'

describe('Nederlandse providervalidatie', () => {
  it('toont geen technische Invalid UUID-melding', () => {
    const result = uuidSchema.safeParse('geen-uuid')

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Selecteer een geldige waarde.')
      expect(result.error.issues[0]?.message).not.toMatch(/invalid uuid/i)
    }
  })

  it('valideert een dienst zonder competentie als volledig invoercontract', () => {
    const result = createCapabilitySchema.safeParse({
      expectedProfileVersion: 1,
      serviceTermId: '00000000-0000-4000-8000-000000000001',
      deliveryModes: ['ON_SITE'],
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data).not.toHaveProperty('competencyTermId')
  })
})
