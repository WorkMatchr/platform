import { describe, expect, it } from 'vitest'
import {
  assertFirstPlatformOwnerBootstrapEnvironment,
  FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET,
  ACADEMY_FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET,
  assertFirstPlatformOwnerDatabaseIdentity,
  FirstPlatformOwnerBootstrapPolicyError,
  type FirstPlatformOwnerBootstrapEnvironment,
} from './first-platform-owner-bootstrap-policy'

const validEnvironment: FirstPlatformOwnerBootstrapEnvironment = {
  NODE_ENV: 'development',
  DATABASE_URL: `postgresql://operator:placeholder@${FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.databaseHost}/neondb?sslmode=require`,
  WL001_TEST_NEON_PROJECT_ID: FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.projectId,
  WL001_TEST_NEON_BRANCH_ID: FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.branchId,
}

describe('first-platform-owner bootstrap environment policy', () => {
  it('staat alleen de expliciet bevestigde WL-001 Neon-testendpoint toe', () => {
    expect(() => assertFirstPlatformOwnerBootstrapEnvironment(validEnvironment)).not.toThrow()
  })

  it.each([
    [{ ...validEnvironment, NODE_ENV: 'production' }, 'productieomgeving'],
    [{ ...validEnvironment, VERCEL_ENV: 'production' }, 'Vercel Production'],
    [{ ...validEnvironment, VERCEL: '1' }, 'Vercel-runtime'],
    [{ ...validEnvironment, DATABASE_URL: undefined }, 'ontbrekende database-URL'],
    [{ ...validEnvironment, DATABASE_URL: 'not-a-url' }, 'ongeldige database-URL'],
    [{ ...validEnvironment, WL001_TEST_NEON_PROJECT_ID: 'other-project' }, 'ander Neon-project'],
    [{ ...validEnvironment, WL001_TEST_NEON_BRANCH_ID: 'other-branch' }, 'andere Neon-branch'],
    [{ ...validEnvironment, DATABASE_URL: 'postgresql://u:p@localhost:5432/neondb?sslmode=require' }, 'lokale database'],
    [{ ...validEnvironment, DATABASE_URL: `postgresql://u:p@${FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.databaseHost}/other?sslmode=require` }, 'andere database'],
    [{ ...validEnvironment, DATABASE_URL: `postgresql://u:p@${FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.databaseHost}:6543/neondb?sslmode=require` }, 'onverwachte databasepoort'],
    [{ ...validEnvironment, DATABASE_URL: `postgresql://u:p@${FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.databaseHost}/neondb` }, 'verbinding zonder verplichte TLS-modus'],
  ] as Array<[FirstPlatformOwnerBootstrapEnvironment, string]>)('weigert %s (%s)', (environment) => {
    expect(() => assertFirstPlatformOwnerBootstrapEnvironment(environment)).toThrow(FirstPlatformOwnerBootstrapPolicyError)
  })
})

const academyEnvironment: FirstPlatformOwnerBootstrapEnvironment = {
  NODE_ENV:'test',
  DATABASE_URL:`postgresql://test:placeholder@${ACADEMY_FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.databaseHost}/neondb?sslmode=verify-full`,
  ACADEMY_TEST_PROJECT_ID:ACADEMY_FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.projectId,
  ACADEMY_TEST_BRANCH_ID:ACADEMY_FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.branchId,
}
describe('Academy first owner exact environment binding',()=>{
  it('accepts only the explicitly selected Academy tuple and preserves the original WL-001 tuple',()=>{
    expect(assertFirstPlatformOwnerBootstrapEnvironment(academyEnvironment)).toEqual(ACADEMY_FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET)
    expect(assertFirstPlatformOwnerBootstrapEnvironment(validEnvironment)).toEqual(FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET)
  })
  it.each([
    {...academyEnvironment,NODE_ENV:'production'}, {...academyEnvironment,NODE_ENV:undefined},
    {...academyEnvironment,VERCEL_ENV:'production'}, {...academyEnvironment,VERCEL:'1'},
    {...academyEnvironment,DATABASE_URL:undefined}, {...academyEnvironment,DATABASE_URL:'invalid'},
    {...academyEnvironment,ACADEMY_TEST_PROJECT_ID:'unknown'}, {...academyEnvironment,ACADEMY_TEST_BRANCH_ID:'other'},
    {...academyEnvironment,DATABASE_URL:validEnvironment.DATABASE_URL},
    {...academyEnvironment,DATABASE_URL:'postgresql://test:placeholder@localhost/neondb?sslmode=verify-full'},
    {...academyEnvironment,DATABASE_URL:academyEnvironment.DATABASE_URL!.replace('/neondb','/other')},
    {...academyEnvironment,DATABASE_URL:academyEnvironment.DATABASE_URL!.replace('verify-full','require')},
    {...academyEnvironment,DATABASE_URL:academyEnvironment.DATABASE_URL!.replace('test:placeholder@','')},
    {...academyEnvironment,DATABASE_URL:academyEnvironment.DATABASE_URL!.replace('.example.invalid','-pooler.example.invalid')},
    {...academyEnvironment,DATABASE_URL:academyEnvironment.DATABASE_URL!.replace('/neondb',':6543/neondb')},
    {...academyEnvironment,WL001_TEST_NEON_PROJECT_ID:FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET.projectId},
    {...validEnvironment,DATABASE_URL:academyEnvironment.DATABASE_URL},
  ])('refuses unapproved or mismatched identity (%#)',environment=>{
    expect(()=>assertFirstPlatformOwnerBootstrapEnvironment(environment)).toThrow(FirstPlatformOwnerBootstrapPolicyError)
  })
  it('requires an actual PostgreSQL 17 database identity',()=>{
    expect(()=>assertFirstPlatformOwnerDatabaseIdentity({databaseName:'neondb',serverVersionNum:170011})).not.toThrow()
    for(const identity of [undefined,{databaseName:'other',serverVersionNum:170011},{databaseName:'neondb',serverVersionNum:160011}]) {
      expect(()=>assertFirstPlatformOwnerDatabaseIdentity(identity)).toThrow(FirstPlatformOwnerBootstrapPolicyError)
    }
  })
})
