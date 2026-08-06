import 'dotenv/config'
import { Client } from 'pg'

const targetMigration = '20260730170000_add_professional_discipline_taxonomy'
const command = process.argv[2] ?? 'inspect'
const connectionString = process.env.DATABASE_URL

if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
if (process.env.NODE_ENV === 'production') {
  throw new Error('Dit lokale migratieherstel is in productie altijd uitgeschakeld.')
}

const databaseUrl = new URL(connectionString)
if (!['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname)) {
  throw new Error('Dit migratieherstel mag uitsluitend op een lokale PostgreSQL-database worden uitgevoerd.')
}
if (command !== 'inspect' && command !== 'apply') {
  throw new Error('Gebruik inspect of apply.')
}

type TaxonomyVersionRow = {
  id: string
  version: number
  status: 'DRAFT' | 'PUBLISHED' | 'RETIRED'
  checksum: string | null
  publishedAt: Date | null
  retiredAt: Date | null
}

async function loadState(client: Client) {
  const versions = await client.query<TaxonomyVersionRow>(`
    SELECT
      version."id",
      version."version",
      version."status",
      version."checksum",
      version."publishedAt",
      version."retiredAt"
    FROM "ProviderTaxonomyVersion" version
    JOIN "ProviderTaxonomy" taxonomy ON taxonomy."id" = version."taxonomyId"
    WHERE taxonomy."kind" = 'SPECIALISM'
    ORDER BY version."version"
  `)
  const migrationRecords = await client.query<{
    finished: boolean
    rolledBack: boolean
  }>(`
    SELECT
      "finished_at" IS NOT NULL AS finished,
      "rolled_back_at" IS NOT NULL AS "rolledBack"
    FROM "_prisma_migrations"
    WHERE "migration_name" = $1
    ORDER BY "started_at"
  `, [targetMigration])
  return {
    versions: versions.rows,
    migrationRecords: migrationRecords.rows,
  }
}

function assertRecoverable(state: Awaited<ReturnType<typeof loadState>>) {
  if (state.migrationRecords.some((record) => record.finished)) {
    throw new Error('De M7B.2-migratie is al geslaagd geregistreerd; lokaal herstel is niet nodig.')
  }
  if (state.migrationRecords.some((record) => !record.rolledBack)) {
    throw new Error('Markeer de mislukte M7B.2-migratie eerst met Prisma als teruggedraaid.')
  }

  const versionOne = state.versions.find((version) => version.version === 1)
  const versionTwo = state.versions.find((version) => version.version === 2)
  if (
    !versionOne ||
    versionOne.status !== 'PUBLISHED' ||
    !versionOne.checksum ||
    !versionOne.publishedAt ||
    versionOne.retiredAt
  ) {
    throw new Error('SPECIALISM v1 staat niet in de verwachte gepubliceerde begintoestand.')
  }
  if (versionTwo) {
    throw new Error('SPECIALISM v2 bestaat al; automatisch herstel wordt veilig geweigerd.')
  }
  return versionOne
}

async function main() {
  const client = new Client({ connectionString })
  await client.connect()
  try {
    const initialState = await loadState(client)
    if (command === 'inspect') {
      console.log(JSON.stringify({
        database: databaseUrl.pathname.slice(1),
        versions: initialState.versions.map((version) => ({
          version: version.version,
          status: version.status,
          publishedAt: version.publishedAt,
          retiredAt: version.retiredAt,
        })),
        migrationAttempts: initialState.migrationRecords.length,
        failedAttemptsRolledBack: initialState.migrationRecords
          .filter((record) => !record.finished)
          .every((record) => record.rolledBack),
      }, null, 2))
      return
    }

    const versionOne = assertRecoverable(initialState)
    await client.query('BEGIN')
    try {
      await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE')
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        'workmatchr:migration-recovery:m7b2-specialism-v2',
      ])
      await client.query('LOCK TABLE "ProviderTaxonomyVersion" IN EXCLUSIVE MODE')

      const lockedState = await loadState(client)
      const lockedVersionOne = assertRecoverable(lockedState)
      if (lockedVersionOne.id !== versionOne.id) {
        throw new Error('De SPECIALISM-taxonomie is tijdens het herstel gewijzigd.')
      }

      await client.query(
        'ALTER TABLE "ProviderTaxonomyVersion" DISABLE TRIGGER "immutable_published_provider_taxonomy_version"',
      )
      const retired = await client.query(`
        UPDATE "ProviderTaxonomyVersion"
        SET
          "status" = 'RETIRED',
          "retiredAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
          AND "version" = 1
          AND "status" = 'PUBLISHED'
          AND "retiredAt" IS NULL
        RETURNING "id"
      `, [versionOne.id])
      await client.query(
        'ALTER TABLE "ProviderTaxonomyVersion" ENABLE TRIGGER "immutable_published_provider_taxonomy_version"',
      )
      if (retired.rowCount !== 1) {
        throw new Error('SPECIALISM v1 kon niet gecontroleerd worden ingetrokken.')
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }

    const result = await loadState(client)
    console.log(JSON.stringify({
      database: databaseUrl.pathname.slice(1),
      recovered: true,
      versions: result.versions.map((version) => ({
        version: version.version,
        status: version.status,
        publishedAt: version.publishedAt,
        retiredAt: version.retiredAt,
      })),
    }, null, 2))
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
