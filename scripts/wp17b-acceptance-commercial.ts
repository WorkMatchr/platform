import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { Client } from 'pg'
import { assertWp17bTarget, WP17B_TARGET as target } from './wp17b-acceptance-target'
import { verifiedDatabaseClientTls } from '../src/lib/maintenance/database-client-tls'
import { fundCommercialFixture } from './fixtures/commercial-payment-database'

// Operator-only synthetic fixture, never imported by the application. Uses the
// already tested fake gateway; no provider call or production target is possible.
registerHooks({ resolve(s, c, next) {
  if (s === 'server-only') return { url: 'data:text/javascript,export default {}', shortCircuit: true }
  return next(s, c)
} })
const secrets = JSON.parse(readFileSync('.local-storage/wp17b/acceptance-secret.json', 'utf8'))
const url = assertWp17bTarget(secrets.runtimeUrl)
assert.equal(url.username, target.runtime)
url.search = ''
const probe = new Client({ connectionString: url.href, ssl: { rejectUnauthorized: true } })
try {
  await probe.connect()
  verifiedDatabaseClientTls(probe, target.host)
  assertWp17bTarget(secrets.runtimeUrl, (await probe.query("SELECT current_database() AS database,current_user AS role,current_setting('neon.branch_id',true) AS branch,current_setting('neon.endpoint_id',true) AS endpoint")).rows[0])
} finally { await probe.end() }

Object.assign(process.env, { DATABASE_URL: secrets.runtimeUrl, VERCEL_ENV: '',
  RESEND_API_KEY: '', MOLLIE_API_KEY: '', JORTT_CLIENT_SECRET: '', JORTT_CLIENT_ID: '',
  OPENAI_API_KEY: '', BLOB_READ_WRITE_TOKEN: '', TRADING_ADMIN_API_TOKEN: '', CONTACT_FORM_ENABLED: 'false' })
globalThis.fetch = async () => { throw new Error('WP17B_EXTERNAL_TRANSPORT_DISABLED') }
const { getPrisma } = await import('../src/lib/prisma')
const db = getPrisma()
try {
  assert.equal(await db.user.count({ where: { email: { not: { endsWith: '@example.invalid' } } } }), 0)
  const provider = await db.user.findUniqueOrThrow({ where: { email: 'wp17b-professional@example.invalid' } })
  const other = await db.user.findUniqueOrThrow({ where: { email: 'wp17b-other-client@example.invalid' } })
  const membership = await db.organizationMembership.findFirstOrThrow({ where: { userId: provider.id, status: 'ACTIVE' } })
  if (!await db.financialPurchase.count({ where: { organizationId: membership.organizationId } })) {
    await fundCommercialFixture(db, provider, membership.organizationId, other.id)
  }
  const profile = await db.providerProfile.findUniqueOrThrow({ where: { organizationId: membership.organizationId } })
  if (!await db.trustedProviderProjection.count({ where: { providerProfileId: profile.id } })) {
    await db.$transaction(async tx => {
      await tx.providerProfile.update({ where: { id: profile.id }, data: { lifecycleStatus: 'QUALIFIED', readinessStatus: 'READY', platformQualificationStatus: 'QUALIFIED', selectabilityStatus: 'SELECTABLE' } })
      const readiness = await tx.providerReadinessAssessment.create({ data: { providerProfileId: profile.id, status: 'READY', reasonCodes: [], sourceVersion: 1, checksum: 'a'.repeat(64) } })
      const selectability = await tx.providerSelectabilityAssessment.create({ data: { providerProfileId: profile.id, readinessAssessmentId: readiness.id, status: 'SELECTABLE', reasonCodes: [], sourceVersion: 1, checksum: 'b'.repeat(64) } })
      await tx.trustedProviderProjection.create({ data: { providerProfileId: profile.id, readinessAssessmentId: readiness.id, selectabilityAssessmentId: selectability.id, schemaVersion: 2, canonicalizationVersion: 'WORKMATCHR-CJ-1', sourceVersion: 1, payload: { capabilities: [{ serviceCode: 'OCCUPATIONAL_PHYSICIAN', specialismCode: 'bedrijfsarts', deliveryModes: ['ON_SITE', 'REMOTE'] }], sectors: [], workAreas: [{ regionCode: 'NATIONWIDE' }] }, sha256: 'c'.repeat(64), validFrom: new Date(Date.now() - 60000), validUntil: new Date(Date.now() + 7 * 86400000) } })
    })
  }
  console.log(JSON.stringify({ syntheticProviderReady: true, realProviderCalls: 0, credits: (await db.creditAccount.findUniqueOrThrow({ where: { organizationId: membership.organizationId } })).availableBalance }))
} catch (error) {
  console.log(JSON.stringify({ failed: true, code: (error as { code?: string }).code ?? 'WP17B_COMMERCIAL_FIXTURE_FAILED' }))
  process.exitCode = 1
} finally { await db.$disconnect() }
