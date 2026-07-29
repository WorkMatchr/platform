import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { PUBLIC_INTAKE_TOKEN_BYTES } from './public-intake-config'

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const HASH_PATTERN = /^[a-f0-9]{64}$/

export function generatePublicIntakeToken(): string {
  return randomBytes(PUBLIC_INTAKE_TOKEN_BYTES).toString('base64url')
}

export function isValidPublicIntakeToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_PATTERN.test(token)
}

export function hashPublicIntakeToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function publicIntakeTokenMatches(token: string, storedHash: string): boolean {
  if (!isValidPublicIntakeToken(token) || !HASH_PATTERN.test(storedHash)) return false
  const actual = Buffer.from(hashPublicIntakeToken(token), 'hex')
  const expected = Buffer.from(storedHash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
