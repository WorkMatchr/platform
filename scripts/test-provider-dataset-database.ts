import 'dotenv/config'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { PrismaPg } from '@prisma/adapter-pg'
import { Client } from 'pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { expectedProvidersForScenario, testFilterScenarios } from './test-provider-dataset'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const sourceUrl = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(sourceUrl.hostname)) {
  throw new Error('De providerdatasettest mag uitsluitend tegen lokale PostgreSQL draaien.')
}

const databaseName = `workmatchr_test_providers_${process.pid}_${Date.now()}`
const targetUrl = new URL(sourceUrl)
targetUrl.pathname = `/${databaseName}`
targetUrl.searchParams.set('schema', 'public')
const npmExecPath = process.env.npm_execpath
if (!npmExecPath) throw new Error('Het pad naar de actieve npm-CLI ontbreekt.')
const resolvedNpmExecPath: string = npmExecPath

function runDataset(command: 'seed' | 'remove', nodeEnv: 'test' | 'development' | 'production' = 'test') {
  return spawnSync(process.execPath, [resolvedNpmExecPath, 'run', command === 'seed' ? 'seed:test-providers' : 'seed:test-providers:remove'], {
    cwd: process.cwd(),
    env: { ...process.env, NODE_ENV: nodeEnv, WORKMATCHR_TEST_PROVIDER_DATABASE: databaseName },
    encoding: 'utf8',
    stdio: 'pipe',
  })
}

async function verifyScenarios() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: targetUrl.toString() }) })
  try {
    const providers = await prisma.providerProfile.findMany({
      where: { organization: { name: { startsWith: 'TEST-WM-' } } },
      select: {
        organization: { select: { name: true } },
        selectabilityStatus: true,
        trustedProjections: { where: { invalidation: null }, orderBy: { createdAt: 'desc' }, take: 1, select: { payload: true } },
        professionals: { where: { status: 'ACTIVE' }, select: { qualifications: { where: { status: 'ACTIVE' }, select: {
          capabilities: { select: { capability: { select: { revisions: { orderBy: { version: 'desc' }, take: 1, select: { serviceTerm: { select: { code: true } } } } } } } },
          revisions: { orderBy: { version: 'desc' }, take: 1, select: {
            qualificationTerm: { select: { code: true } },
            verificationReviews: { where: { resultingLevel: 'VERIFIED' }, take: 1, select: { id: true } },
          } },
        } } } },
      },
    })
    assert.equal(providers.length, 50)
    for (const scenario of testFilterScenarios) {
      const actual = providers.flatMap((provider) => {
        if (provider.selectabilityStatus !== 'SELECTABLE') return []
        const payload = provider.trustedProjections[0]?.payload as {
          capabilities?: Array<{ serviceCode: string }>
          workAreas?: Array<{ regionCode: string }>
        } | undefined
        if (!payload?.capabilities?.some((item) => item.serviceCode === scenario.serviceCode)) return []
        const hasRequiredQualification = provider.professionals.some((professional) => professional.qualifications.some((qualification) =>
          qualification.revisions[0]?.qualificationTerm.code === scenario.requiredQualificationCode &&
          qualification.revisions[0].verificationReviews.length > 0 &&
          qualification.capabilities.some((link) => link.capability.revisions[0]?.serviceTerm?.code === scenario.serviceCode)))
        if (!hasRequiredQualification) return []
        const regions = payload.workAreas?.map((item) => item.regionCode) ?? []
        const regionMatches = scenario.remoteOnly
          ? regions.includes('REMOTE')
          : scenario.regionCode === 'NATIONWIDE'
            ? regions.includes('NATIONWIDE')
            : regions.includes(scenario.regionCode) || regions.includes('NATIONWIDE')
        if (!regionMatches) return []
        return [provider.organization.name.replace('TEST-WM-Dienstverlener ', 'TEST-WM-')]
      }).sort()
      assert.deepEqual(actual, expectedProvidersForScenario(scenario), `${scenario.code} wijkt af.`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function databaseStillExists(): Promise<boolean> {
  const adminUrl = new URL(sourceUrl)
  adminUrl.pathname = '/postgres'
  adminUrl.searchParams.delete('schema')
  const client = new Client({ connectionString: adminUrl.toString() })
  await client.connect()
  try {
    const result = await client.query<{ exists: boolean }>('SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1) AS exists', [databaseName])
    return result.rows[0]?.exists ?? false
  } finally {
    await client.end()
  }
}

async function main() {
  const productionAttempt = runDataset('seed', 'production')
  assert.notEqual(productionAttempt.status, 0, 'Productie-uitvoering had geweigerd moeten worden.')
  assert.match(productionAttempt.stderr, /mag niet in productie/)

  try {
    const first = runDataset('seed')
    assert.equal(first.status, 0, `Eerste seedrun mislukt:\n${first.stdout}\n${first.stderr}`)
    const second = runDataset('seed')
    assert.equal(second.status, 0, `Tweede seedrun mislukt:\n${second.stdout}\n${second.stderr}`)
    assert.match(second.stdout, /al compleet en ongewijzigd/)
    await verifyScenarios()
  } finally {
    const removal = runDataset('remove')
    assert.equal(removal.status, 0, `Opruimen mislukt:\n${removal.stdout}\n${removal.stderr}`)
  }
  assert.equal(await databaseStillExists(), false, 'De tijdelijke providerdatasetdatabase is niet verwijderd.')
  console.log('Providerdataset-integriteit: 50 fictieve dienstverleners, idempotentie en 10 scenario’s geslaagd.')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
