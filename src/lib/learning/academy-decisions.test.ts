import { describe, expect, it } from 'vitest'
import { addAcademyCalendarYear, academyAccessExpired, academyUnusedSeatAvailable, ACADEMY_ACCESS_POLICY_VERSION } from './academy-access-policy'
import { registrationLegalEvidence } from '@/lib/registration-legal-evidence'
import { REGISTRATION_LEGAL_VERSION } from '@/content/legal-documents'
import { withdrawalInput, WITHDRAWAL_DECLARATION_VERSION } from './academy-withdrawal-policy'

describe('D02 actual document evidence', () => {
 it('records actually displayed placeholders and distinguishes information from acceptance', () => {
  const result=registrationLegalEvidence({acceptedTerms:true,legalVersion:REGISTRATION_LEGAL_VERSION})
  expect(result.status).toBe('PLACEHOLDER_NOT_APPROVED')
  expect(result.documents.map(d=>d.kind)).toEqual(['CONTRACT_ACCEPTANCE','INFORMATION_PRESENTED'])
  expect(result.documents.every(d=>/^[a-f0-9]{64}$/.test(d.sha256))).toBe(true)
  expect(JSON.stringify(result)).not.toMatch(/password|@|consentedAt/)
 })
 it.each([false,undefined,'true'])('never fabricates agreement for %s', acceptedTerms=>expect(()=>registrationLegalEvidence({acceptedTerms,legalVersion:REGISTRATION_LEGAL_VERSION})).toThrow())
 it('rejects stale offered versions',()=>expect(()=>registrationLegalEvidence({acceptedTerms:true,legalVersion:'old'})).toThrow())
})
describe('D08 prospective access',()=>{
 it('uses calendar arithmetic with leap-year clamping and preserves UTC time',()=>expect(addAcademyCalendarYear(new Date('2024-02-29T12:34:56Z')).toISOString()).toBe('2025-02-28T12:34:56.000Z'))
 it('does not retroactively expire legacy records',()=>expect(academyAccessExpired({accessExpiresAt:null},new Date('2040-01-01'))).toBe(false))
 it('expires exactly on the boundary',()=>{const d=new Date('2027-10-30');expect(academyAccessExpired({accessExpiresAt:d},d)).toBe(true);expect(academyAccessExpired({accessExpiresAt:d},new Date(d.getTime()-1))).toBe(false)})
 it('blocks unused packs after twelve months and missing payment provenance',()=>{
  const order={accessPolicyVersion:ACADEMY_ACCESS_POLICY_VERSION,purchase:{paidAt:new Date('2026-10-30')}}
  expect(academyUnusedSeatAvailable(order,new Date('2027-10-29'))).toBe(true)
  expect(academyUnusedSeatAvailable(order,new Date('2027-10-30'))).toBe(false)
  expect(academyUnusedSeatAvailable({...order,purchase:{}},new Date())).toBe(false)
  expect(academyUnusedSeatAvailable({purchase:{}},new Date())).toBe(true)
 })
})
describe('D15 explicit account-independent declaration',()=>{
 const input={requestKey:'10000000-0000-4000-8000-000000000001',orderReference:'test-order',email:'person@example.invalid',confirmed:true,declarationVersion:WITHDRAWAL_DECLARATION_VERSION}
 it('requires no account, reason or waiver',()=>expect(withdrawalInput.parse(input)).toEqual(input))
 it.each([false,undefined,'true'])('requires an actual confirmation %s',confirmed=>expect(withdrawalInput.safeParse({...input,confirmed}).success).toBe(false))
 it('rejects overlong, malformed and client-authoritative input',()=>{
  expect(withdrawalInput.safeParse({...input,email:'bad'}).success).toBe(false)
  expect(withdrawalInput.safeParse({...input,orderReference:'x'.repeat(121)}).success).toBe(false)
  expect(withdrawalInput.safeParse({...input,refundApproved:true}).success).toBe(false)
 })
})
