import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Pool } from 'pg'
import {
  buildPreflightReport,
  collectPreflightSnapshot,
  databaseEnvironmentFromUrl,
  renderMarkdown,
  runInReadOnlyTransaction,
  scanStaticTenantAssumptions,
  stableJson,
  type ReportMetadata,
} from './account-architecture-preflight'

const rootDirectory = process.cwd()
const outputDirectory = path.join(rootDirectory, 'reports')
const markdownPath = path.join(outputDirectory, 'account-architecture-preflight.md')
const jsonPath = path.join(outputDirectory, 'account-architecture-preflight.json')
const redacted = process.argv.includes('--redacted')

function gitMetadata(): ReportMetadata['git'] {
  try {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: rootDirectory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    const status = execFileSync('git', ['status', '--porcelain'], { cwd: rootDirectory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    const changedPathCount = status.split(/\r?\n/).filter(Boolean).length
    return { commit: commit || null, dirty: changedPathCount > 0, changedPathCount }
  } catch {
    return { commit: null, dirty: true, changedPathCount: 0 }
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('PREFLIGHT_CONFIGURATION_ERROR: DATABASE_URL ontbreekt.')

  const metadata: ReportMetadata = {
    generatedAt: new Date().toISOString(),
    databaseEnvironment: databaseEnvironmentFromUrl(connectionString),
    git: gitMetadata(),
    redacted,
  }
  const staticIndicators = await scanStaticTenantAssumptions(rootDirectory)
  const pool = new Pool({ connectionString, max: 1, application_name: 'workmatchr-account-architecture-preflight' })

  try {
    const snapshot = await runInReadOnlyTransaction(pool, (client) => collectPreflightSnapshot(client, staticIndicators))
    const report = buildPreflightReport(snapshot, metadata)
    await mkdir(outputDirectory, { recursive: true })
    await writeFile(markdownPath, renderMarkdown(report), { encoding: 'utf8', flag: 'w' })
    await writeFile(jsonPath, stableJson(report), { encoding: 'utf8', flag: 'w' })

    console.info('ADR-013 accountarchitectuur-preflight voltooid.')
    console.info(`Gebruikers: ${report.summary.totalUsers}; organisaties: ${report.summary.totalOrganizations}; memberships: ${report.summary.totalMemberships}.`)
    console.info(`Blockers: ${report.summary.blockerCount}; waarschuwingen: ${report.summary.warningCount}; handmatige beoordelingen: ${report.summary.manualReviewCount}.`)
    console.info(`Rapporten: ${path.relative(rootDirectory, markdownPath)} en ${path.relative(rootDirectory, jsonPath)}.`)
    console.info(`Modus: ${redacted ? 'redacted' : 'volledig lokaal en door Git genegeerd'}.`)
    if (report.blockers.length > 0) process.exitCode = 2
  } finally {
    await pool.end()
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Onbekende preflightfout.'
  console.error(`Preflight afgebroken zonder datamutaties: ${message}`)
  process.exitCode = 1
})
