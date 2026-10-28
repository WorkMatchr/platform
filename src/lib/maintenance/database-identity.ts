import 'server-only'
import { getPrisma, getPreviewRuntimePool } from '@/lib/prisma'
import { verifiedDatabaseClientTls } from './database-client-tls'

const WINDOW_MS = 15 * 60 * 1000

export function isDatabaseIdentityDiagnosticEnabled(now = Date.now()) {
  const until = Date.parse(process.env.DATABASE_IDENTITY_DIAGNOSTIC_UNTIL ?? '')
  return process.env.DATABASE_IDENTITY_DIAGNOSTIC_ENABLED === 'true'
    && Number.isFinite(until) && until > now && until - now <= WINDOW_MS
}

// Project identity must be corroborated against Neon endpoint/branch metadata.
// NEON_PROJECT_ID and client-supplied identifiers are deliberately not trusted.
export async function readDatabaseIdentity() {
  const url = new URL(process.env.DATABASE_URL ?? '')
  const allowed = new Set(['sslmode', 'schema', 'channel_binding', 'connection_limit', 'pool_timeout', 'connect_timeout', 'pgbouncer'])
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)+\.neon\.tech$/.test(url.hostname)
    || (url.port && url.port !== '5432')
    || [...url.searchParams.keys()].some(key => !allowed.has(key))
    || !['require', 'verify-ca', 'verify-full'].includes(url.searchParams.get('sslmode') ?? '')
    || (url.searchParams.has('schema') && url.searchParams.get('schema') !== 'public')) {
    throw new Error('DATABASE_IDENTITY_UNAVAILABLE')
  }
  const configuredDatabase = decodeURIComponent(url.pathname.slice(1))
  const configuredRole = decodeURIComponent(url.username)
  const configuredEndpoint = url.hostname.split('.')[0].replace(/-pooler$/, '')
  type Identity = {
    database_name: string; database_role: string; endpoint_id: string | null; branch_id: string | null
    ssl: boolean | null; tls_version: string | null; read_only: string
    superuser: boolean; create_database: boolean; create_role: boolean; bypass_rls: boolean
  }
  const previewPool = getPreviewRuntimePool()
  let clientTlsVersion: string | null = null
  const previewIdentity = async (): Promise<Identity> => {
    const client = await previewPool!.connect()
    try {
      clientTlsVersion = verifiedDatabaseClientTls(client, url.hostname)
      await client.query('BEGIN READ ONLY')
      await client.query("SET LOCAL statement_timeout = '5s'")
      const { rows } = await client.query<Identity>({ text: `SELECT
        current_database() AS database_name, current_user::text AS database_role,
        current_setting('neon.endpoint_id', true) AS endpoint_id,
        current_setting('neon.branch_id', true) AS branch_id,
        ssl.ssl, ssl.version AS tls_version,
        current_setting('transaction_read_only') AS read_only,
        role.rolsuper AS superuser, role.rolcreatedb AS create_database,
        role.rolcreaterole AS create_role, role.rolbypassrls AS bypass_rls
        FROM pg_catalog.pg_roles role
        LEFT JOIN pg_catalog.pg_stat_ssl ssl ON ssl.pid=pg_backend_pid()
        WHERE role.rolname=current_user`, query_timeout: 5000 } as { text: string })
      if (rows.length !== 1) throw new Error('DATABASE_IDENTITY_UNAVAILABLE')
      await client.query('ROLLBACK')
      return rows[0]
    } finally { client.release(true) }
  }
  const identity = previewPool ? await previewIdentity() : await getPrisma().$transaction(async transaction => {
    await transaction.$executeRaw`SET TRANSACTION READ ONLY`
    await transaction.$executeRaw`SET LOCAL statement_timeout = '5s'`
    const rows = await transaction.$queryRaw<Identity[]>`
      SELECT current_database() AS database_name, current_user::text AS database_role,
             current_setting('neon.endpoint_id', true) AS endpoint_id,
             current_setting('neon.branch_id', true) AS branch_id,
             ssl.ssl, ssl.version AS tls_version,
             current_setting('transaction_read_only') AS read_only,
             role.rolsuper AS superuser, role.rolcreatedb AS create_database,
             role.rolcreaterole AS create_role, role.rolbypassrls AS bypass_rls
      FROM pg_catalog.pg_roles role
      LEFT JOIN pg_catalog.pg_stat_ssl ssl ON ssl.pid = pg_backend_pid()
      WHERE role.rolname = current_user
    `
    const row = rows[0]
    if (rows.length !== 1 || !row || row.read_only !== 'on' || row.ssl !== true
      || !row.tls_version || row.endpoint_id !== configuredEndpoint
      || !row.branch_id?.startsWith('br-') || row.database_name !== configuredDatabase
      || row.database_role !== configuredRole) throw new Error('DATABASE_IDENTITY_UNAVAILABLE')
    return row
  }, { maxWait: 2000, timeout: 8000 })

  if (!identity || identity.read_only !== 'on'
    || (!clientTlsVersion && (identity.ssl !== true || !identity.tls_version))
    || identity.endpoint_id !== configuredEndpoint || !identity.branch_id?.startsWith('br-')
    || identity.database_name !== configuredDatabase || identity.database_role !== configuredRole) {
    throw new Error('DATABASE_IDENTITY_UNAVAILABLE')
  }

  return {
    observedAt: new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? 'unknown',
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    deployment: process.env.VERCEL_DEPLOYMENT_ID ?? null,
    configuredHostname: url.hostname,
    endpointId: identity.endpoint_id,
    branchId: identity.branch_id,
    database: identity.database_name,
    role: identity.database_role,
    tlsVersion: clientTlsVersion ?? identity.tls_version,
    tlsEvidence: clientTlsVersion ? 'verified-runtime-client-socket' : 'pg_stat_ssl',
    transactionReadOnly: true,
    featureGates: {
      complianceF4: process.env.COMPLIANCE_F4_ENABLED === 'true',
      learningRuntime: process.env.LEARNING_RUNTIME_ENABLED === 'true',
    },
    roleCapabilities: {
      superuser: identity.superuser, createDatabase: identity.create_database,
      createRole: identity.create_role, bypassRls: identity.bypass_rls,
    },
  }
}
