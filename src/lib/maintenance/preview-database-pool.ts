import { Pool, type PoolClient } from 'pg'
import { PREVIEW_ISOLATION_ERROR, previewDatabasePolicy } from './preview-isolation'
import { verifiedDatabaseClientTls } from './database-client-tls'

export const PREVIEW_IDENTITY_SQL = `SELECT
  current_database() AS database, current_user::text AS role,
  session_user::text AS login,
  current_setting('neon.endpoint_id', true) AS endpoint,
  current_setting('neon.branch_id', true) AS branch,
  ssl.ssl, ssl.version AS tls,
  r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls AS privileged,
  EXISTS (SELECT 1 FROM pg_catalog.pg_roles parent WHERE parent.oid <> r.oid
    AND pg_has_role(current_user, parent.oid, 'MEMBER')) AS memberships,
  has_database_privilege(current_database(), 'CREATE') AS database_create,
  EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspname !~ '^pg_'
    AND n.nspname <> 'information_schema' AND has_schema_privilege(n.oid, 'CREATE')) AS schema_create,
  EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relowner=r.oid) AS owns_objects,
  has_table_privilege('public._prisma_migrations', 'INSERT,UPDATE,DELETE,TRUNCATE') AS registry_write
FROM pg_catalog.pg_roles r
LEFT JOIN pg_catalog.pg_stat_ssl ssl ON ssl.pid=pg_backend_pid()
WHERE r.rolname=current_user`

type Policy = NonNullable<ReturnType<typeof previewDatabasePolicy>>
type Callback = (error: Error | undefined, client: PoolClient | undefined, done: (release?: boolean) => void) => void

// Guard BOTH callback and Promise acquisition (Pool.query and Prisma transactions).
// A client is never handed to the adapter until its own live identity is checked.
export class PreviewDatabasePool extends Pool {
  constructor(private readonly policy: Policy) {
    super({ connectionString: policy.connectionString, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 5000 })
  }

  private async verifiedClient() {
    let client: PoolClient | undefined
    try {
      client = await super.connect()
      verifiedDatabaseClientTls(client, new URL(this.policy.connectionString).hostname)
      // pg supports per-query query_timeout; its published QueryConfig type omits it.
      const query = { text: PREVIEW_IDENTITY_SQL, query_timeout: 5000 }
      const { rows } = await client.query(query)
      const row = rows[0]
      if (rows.length !== 1 || !row || row.database !== this.policy.database
        || row.role !== this.policy.role || row.login !== this.policy.role
        || row.endpoint !== this.policy.endpoint || row.branch !== this.policy.branch
        || ['privileged', 'memberships', 'database_create', 'schema_create', 'owns_objects', 'registry_write']
          .some(key => row[key] !== false)) throw new Error(PREVIEW_ISOLATION_ERROR)
      return client
    } catch {
      client?.release(true)
      throw new Error(PREVIEW_ISOLATION_ERROR)
    }
  }

  override connect(): Promise<PoolClient>
  override connect(callback: Callback): void
  override connect(callback?: Callback): Promise<PoolClient> | void {
    const pending = this.verifiedClient()
    if (!callback) return pending
    void pending.then(client => callback(undefined, client, client.release.bind(client)),
      () => callback(new Error(PREVIEW_ISOLATION_ERROR), undefined, () => {}))
  }
}
