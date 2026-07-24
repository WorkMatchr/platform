import { describe, expect, it } from 'vitest'
import { runAuthClientRequest, runRegistrationRequest } from '@/lib/auth-form-request'

describe('authformulieraanvragen', () => {
  it('accepteert alleen een foutloze Better Auth-response', async () => {
    await expect(runAuthClientRequest(async () => ({ error: null }))).resolves.toBe('accepted')
  })

  it.each([404, 500])('behandelt HTTP %i niet als een succesvolle aanvraag', async (status) => {
    await expect(runAuthClientRequest(async () => ({ error: { status } }))).resolves.toBe('technical_error')
  })

  it('behandelt een netwerkfout niet als een succesvolle aanvraag', async () => {
    await expect(runAuthClientRequest(async () => {
      throw new TypeError('Netwerk niet bereikbaar')
    })).resolves.toBe('technical_error')
  })

  it('onderscheidt rate limiting zonder accountinformatie prijs te geven', async () => {
    await expect(runAuthClientRequest(async () => ({ error: { status: 429 } }))).resolves.toBe('rate_limited')
  })

  it('behandelt een mislukte registratie en netwerkfout veilig', async () => {
    await expect(runRegistrationRequest(async () => ({ ok: false, status: 500 }))).resolves.toBe('technical_error')
    await expect(runRegistrationRequest(async () => {
      throw new TypeError('Netwerk niet bereikbaar')
    })).resolves.toBe('technical_error')
  })
})
