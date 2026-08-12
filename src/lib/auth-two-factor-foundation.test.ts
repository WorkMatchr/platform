import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('Better Auth two-factor foundation', () => {
  it('registers the native server plugin with encrypted recovery codes and no usable trusted devices', () => {
    const source = read('src/lib/auth.ts')

    expect(source).toContain("import { twoFactor } from 'better-auth/plugins'")
    expect(source).toContain('twoFactor({')
    expect(source).toContain("issuer: 'WorkMatchr'")
    expect(source).toContain('trustDeviceMaxAge: 0')
    expect(source).toContain("storeBackupCodes: 'encrypted'")
    expect(source).toContain('minPasswordLength: 12')
    expect(source).toContain('maxPasswordLength: 128')
  })

  it('registers the matching client plugin without adding a WorkMatchr two-factor UI', () => {
    const source = read('src/lib/auth-client.ts')

    expect(source).toContain("import { twoFactorClient } from 'better-auth/client/plugins'")
    expect(source).toContain('plugins: [twoFactorClient()]')
    expect(source).not.toContain('twoFactorPage')
  })

  it('models precisely the Better Auth 1.6.23 two-factor persistence requirements', () => {
    const schema = read('prisma/schema.prisma')
    const migration = read('prisma/migrations/20260811100000_add_better_auth_two_factor_foundation/migration.sql')

    expect(schema).toContain('twoFactorEnabled                   Boolean                                @default(false)')
    expect(schema).toContain('twoFactors                         TwoFactor[]')
    expect(schema).toContain('model TwoFactor {')
    expect(schema).toContain('secret                  String')
    expect(schema).toContain('backupCodes             String')
    expect(schema).toContain('userId                  String    @db.Uuid')
    expect(schema).toContain('verified                Boolean   @default(true)')
    expect(schema).toContain('failedVerificationCount Int       @default(0)')
    expect(schema).toContain('lockedUntil             DateTime? @db.Timestamptz(3)')
    expect(schema).toContain('@@index([secret])')
    expect(schema).toContain('@@index([userId])')
    expect(schema).not.toContain('userId                  String    @unique')

    expect(migration).toContain('ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false')
    expect(migration).toContain('CREATE TABLE "TwoFactor"')
    expect(migration).toContain('"TwoFactor_userId_fkey"')
    expect(migration).toContain("'TWO_FACTOR_ENROLLED'")
    expect(migration).toContain("'TWO_FACTOR_RESET'")
  })
})
