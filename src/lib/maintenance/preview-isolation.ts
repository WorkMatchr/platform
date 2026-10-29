type Environment = Record<string, string | undefined>

export const PREVIEW_ISOLATION_ERROR = 'PREVIEW_DATABASE_ISOLATION_REQUIRED'
const productionEndpoint = 'ep-royal-sound-agegzj34'
const productionBranch = 'br-odd-smoke-agf0wj9j'

// Initial acceptance uses fake providers only. Inherited branch overrides are
// deliberately refused, including alternate database connection credentials.
export const PREVIEW_FORBIDDEN_VARIABLES = [
  'RESEND_API_KEY', 'MOLLIE_API_KEY', 'JORTT_CLIENT_SECRET', 'JORTT_CLIENT_ID',
  'OPENAI_API_KEY', 'BLOB_READ_WRITE_TOKEN', 'TRADING_ADMIN_API_TOKEN',
  'DATABASE_URL_UNPOOLED', 'POSTGRES_URL', 'POSTGRES_URL_NON_POOLING',
  'POSTGRES_PRISMA_URL', 'POSTGRES_URL_NO_SSL', 'PGHOST', 'PGHOST_UNPOOLED',
  'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'POSTGRES_HOST', 'POSTGRES_USER',
  'POSTGRES_PASSWORD', 'POSTGRES_DATABASE',
] as const

export function previewDatabasePolicy(env: Environment = process.env) {
  if (env.VERCEL_ENV !== 'preview') return null
  try {
    const endpoint = env.PREVIEW_DATABASE_ENDPOINT_ID ?? ''
    const branch = env.PREVIEW_DATABASE_BRANCH_ID ?? ''
    const database = env.PREVIEW_DATABASE_NAME ?? ''
    const role = env.PREVIEW_DATABASE_ROLE ?? ''
    const url = new URL(env.DATABASE_URL ?? '')
    if (env.PREVIEW_INFRASTRUCTURE_APPROVED !== 'true'
      || !/^ep-[a-z0-9-]+$/.test(endpoint) || endpoint === productionEndpoint
      || !/^br-[a-z0-9-]+$/.test(branch) || branch === productionBranch
      || !/^[a-z][a-z0-9_]{0,62}$/.test(database)
      || !/^workmatchr_preview_[a-z0-9_]{1,40}$/.test(role)
      || PREVIEW_FORBIDDEN_VARIABLES.some(key => Boolean(env[key]))
      || !['postgres:', 'postgresql:'].includes(url.protocol)
      || !/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)+\.neon\.tech$/.test(url.hostname)
      || url.hostname.split('.')[0].replace(/-pooler$/, '') !== endpoint
      || (url.port && url.port !== '5432') || url.hash
      || decodeURIComponent(url.pathname.slice(1)) !== database
      || decodeURIComponent(url.username) !== role || !url.password
      || [...url.searchParams.keys()].some(key => !['sslmode', 'schema'].includes(key))
      || !['require', 'verify-full'].includes(url.searchParams.get('sslmode') ?? '')
      || (url.searchParams.has('schema') && url.searchParams.get('schema') !== 'public')) {
      throw new Error(PREVIEW_ISOLATION_ERROR)
    }
    // pg-connection-string must not weaken certificate verification via sslmode.
    url.search = ''
    return { endpoint, branch, database, role, connectionString: url.href }
  } catch {
    // Never expose URL-parser errors, credentials or provider settings.
    throw new Error(PREVIEW_ISOLATION_ERROR)
  }
}

export function isPreviewInfrastructureAccepted(env: Environment = process.env) {
  try { previewDatabasePolicy(env); return true } catch { return false }
}
