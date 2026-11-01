import { randomBytes, randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'
import { CONTACT_REQUEST_TTL_MS, isFreshContactRequest, issueContactRequest } from './contact-request-token'
import { contactSchema } from './contact-contract'

it('binds a nonce and issuance time to the server key, with an exact 24h expiry', () => {
  const key = randomBytes(32), now = Date.now(), token = issueContactRequest(key, now)
  expect(contactSchema.shape.requestId.safeParse(token).success).toBe(true)
  expect(`contact:${token}`.length).toBeLessThanOrEqual(120)
  expect(isFreshContactRequest(token, key, now)).toBe(true)
  expect(isFreshContactRequest(token, key, now + CONTACT_REQUEST_TTL_MS - 1)).toBe(true)
  expect(isFreshContactRequest(token, key, now + CONTACT_REQUEST_TTL_MS)).toBe(false)
  expect(isFreshContactRequest(token, key, now - 1)).toBe(false)
  expect(isFreshContactRequest(token, randomBytes(32), now)).toBe(false)
  expect(isFreshContactRequest(token.replace(token.split('.')[2], randomUUID()), key, now)).toBe(false)
  expect(isFreshContactRequest(token.replace(token.split('.')[1], (now + 1).toString(36)), key, now + 1)).toBe(false)
  for (const invalid of [randomUUID(), '', 'v1.bad', `${token}x`]) expect(isFreshContactRequest(invalid, key, now)).toBe(false)
})
