import { describe, expect, it } from 'vitest'
import { verifiedDatabaseClientTls } from './database-client-tls'

const host = 'ep-test.c-8.eu-central-1.aws.neon.tech'
const stream = { encrypted: true, authorized: true, getProtocol: () => 'TLSv1.3', getPeerCertificate: () => ({ subjectaltname: `DNS:${host}` }) }
describe('database TLS evidence on the actual client', () => {
  it.each(['TLSv1.2', 'TLSv1.3'])('accepts verified %s and matching hostname', protocol => {
    expect(verifiedDatabaseClientTls({ connection: { stream: { ...stream, getProtocol: () => protocol } } }, host)).toBe(protocol)
  })
  it.each([
    { encrypted: false }, { authorized: false }, { authorized: undefined },
    { getProtocol: () => 'TLSv1.1' }, { getProtocol: () => null },
    { getPeerCertificate: () => ({}) },
    { getPeerCertificate: () => ({ subjectaltname: 'DNS:other.invalid' }) },
  ])('rejects unverified transport without disclosing driver data', overrides => {
    expect(() => verifiedDatabaseClientTls({ connection: { stream: { ...stream, ...overrides } } }, host)).toThrow(/^DATABASE_CLIENT_TLS_UNVERIFIED$/)
  })
  it('fails closed without a client socket', () => {
    expect(() => verifiedDatabaseClientTls({}, host)).toThrow(/^DATABASE_CLIENT_TLS_UNVERIFIED$/)
  })
})
