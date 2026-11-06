import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertAcademyCommerceSandbox } from './academy-commerce-environment'
// Deliberately synthetic credentials, never used to connect.
const target='postgresql://fixture:fixture@fixture-6e93ad508d.example.invalid/neondb?sslmode=verify-full'
function setup(){vi.stubEnv('NODE_ENV','test');vi.stubEnv('VERCEL_ENV','');vi.stubEnv('DATABASE_URL',target);vi.stubEnv('ACADEMY_TEST_PROJECT_ID','academy-synthetic-project');vi.stubEnv('ACADEMY_TEST_BRANCH_ID','branch-fixture-little-hill');vi.stubEnv('ACADEMY_COMMERCE_SANDBOX','1');vi.stubEnv('MOLLIE_API_KEY','test_fixture_never_a_real_key');vi.stubEnv('RESEND_API_KEY','')}
afterEach(()=>vi.unstubAllEnvs())
describe('Academy commerce weigert live providers en andere databases',()=>{
 it('accepteert uitsluitend de exact gepinde sandboxconfiguratie',()=>{setup();expect(()=>assertAcademyCommerceSandbox()).not.toThrow()})
 it.each([['NODE_ENV','production'],['VERCEL_ENV','production'],['DATABASE_URL',''],['DATABASE_URL','not-a-url'],['DATABASE_URL','postgresql://fixture:fixture@127.0.0.1/neondb'],['DATABASE_URL',target.replace('fixture-6e93ad508d.example.invalid','fixture-2bd8368622')],['ACADEMY_TEST_PROJECT_ID','fixture-842b0f40ee'],['ACADEMY_TEST_BRANCH_ID','other'],['ACADEMY_COMMERCE_SANDBOX','0'],['MOLLIE_API_KEY','live_fixture_never_a_real_key'],['MOLLIE_API_KEY',''],['RESEND_API_KEY','fixture_never_a_real_key']])('weigert %s=%s',(key,value)=>{setup();vi.stubEnv(key,value);expect(()=>assertAcademyCommerceSandbox()).toThrow()})
})

describe('exact isolated decision-acceptance target',()=>{
 it('allows the reviewed child branch but not an arbitrary endpoint',()=>{
  setup();vi.stubEnv('ACADEMY_TEST_BRANCH_ID','branch-fixture-small-frost');vi.stubEnv('DATABASE_URL',target.replace('fixture-6e93ad508d.example.invalid','fixture-161a49ea0e.example.invalid'))
  expect(()=>assertAcademyCommerceSandbox()).not.toThrow()
  vi.stubEnv('ACADEMY_TEST_BRANCH_ID','branch-fixture-mute-credit');expect(()=>assertAcademyCommerceSandbox()).toThrow()
 })
})

describe('final acceptance database stays strictly isolated',()=>{
 function finalSetup(){setup();vi.stubEnv('ACADEMY_TEST_BRANCH_ID','branch-fixture-blue-morning');vi.stubEnv('DATABASE_URL',target.replace('fixture-6e93ad508d.example.invalid','fixture-301797460c.example.invalid'))}
 it('allows the exact final acceptance pair only',()=>{finalSetup();expect(()=>assertAcademyCommerceSandbox()).not.toThrow()})
 it.each([['NODE_ENV','production'],['VERCEL_ENV','production'],['ACADEMY_TEST_PROJECT_ID','other'],['ACADEMY_TEST_BRANCH_ID','branch-fixture-small-frost'],['DATABASE_URL',target],['DATABASE_URL',target.replace('neondb','other')],['DATABASE_URL',''],['RESEND_API_KEY','fixture_no_delivery'],['MOLLIE_API_KEY','live_fixture']])('refuses mismatched final target %s', (key,value)=>{finalSetup();vi.stubEnv(key,value);expect(()=>assertAcademyCommerceSandbox()).toThrow()})
})

// pg-connection-string lets query parameters override authority fields.
// Both legacy and final acceptance targets must reject those before any connection.
describe.each([
 ['branch-fixture-little-hill', 'fixture-6e93ad508d.example.invalid'],
 ['branch-fixture-blue-morning', 'fixture-301797460c.example.invalid'],
])('connection overrides fail closed on %s', (branchId, hostname) => {
 it.each(['&host=other.example.invalid', '&port=5433', '&user=other', '&password=synthetic', '&database=other', '&sslmode=disable', '&ssl=false', '&options=synthetic', '#fragment'])('rejects %s', suffix => {
  setup()
  vi.stubEnv('ACADEMY_TEST_BRANCH_ID', branchId)
  vi.stubEnv('DATABASE_URL', target.replace('fixture-6e93ad508d.example.invalid', hostname) + suffix)
  expect(() => assertAcademyCommerceSandbox()).toThrow('ACADEMY_IMPORT_DATABASE_REFUSED')
 })
})
