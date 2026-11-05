import { PREVIEW_FORBIDDEN_VARIABLES } from '@/lib/maintenance/preview-isolation'
export const ACADEMY_TEST_DATABASE = {
  projectId: 'academy-synthetic-project', branchId: 'branch-fixture-little-hill',
  hostname: 'fixture-6e93ad508d.example.invalid', database: 'neondb',
} as const

/** Exact, expiring-purpose acceptance target. No arbitrary endpoint/branch input is trusted. */
export const WL003_ACCEPTANCE_DATABASE = {
  projectId: 'academy-synthetic-project', branchId: 'branch-fixture-spring-brook',
  hostname: 'fixture-49e76b25f8.example.invalid', database: 'neondb',
} as const

/** Exact isolated RC endpoint; this does not authorize production or arbitrary branches. */
export const ACADEMY_RC_ACCEPTANCE_DATABASE = {
  projectId: 'academy-synthetic-project', branchId: 'branch-fixture-long-wind',
  hostname: 'fixture-d8ec942b5e.example.invalid', database: 'neondb',
} as const

/** Isolated decision-acceptance branch; never a production target. */
export const ACADEMY_DECISIONS_DATABASE = {
  projectId: 'academy-synthetic-project', branchId: 'branch-fixture-small-frost',
  hostname: 'fixture-161a49ea0e.example.invalid', database: 'neondb',
} as const

/** Final acceptance only: exact isolated child, never production. */
export const ACADEMY_FINAL_ACCEPTANCE_DATABASE = {
  projectId: 'academy-synthetic-project', branchId: 'branch-fixture-blue-morning',
  hostname: 'fixture-301797460c.example.invalid', database: 'neondb',
} as const

/** The initial importer is intentionally not a production publishing tool. */
export function assertAcademyDatabaseTarget(input: { databaseUrl?: string; projectId?: string; branchId?: string; nodeEnv?: string; vercelEnv?: string }, expectedDatabase: 'neondb' | 'academy_upgrade' = 'neondb') {
  if (!['development', 'test'].includes(input.nodeEnv ?? '') || input.vercelEnv === 'production') throw new Error('ACADEMY_IMPORT_ENVIRONMENT_REFUSED')
  let url: URL
  try { url = new URL(input.databaseUrl ?? '') } catch { throw new Error('ACADEMY_IMPORT_DATABASE_REFUSED') }
  if (process.env.ACADEMY_LOCAL_ACCEPTANCE === 'true' && !process.env.VERCEL && input.projectId === 'local-synthetic' && input.branchId === 'lms20-isolated'
    && url.protocol === 'postgresql:' && url.hostname === '127.0.0.1' && url.port === '5449' && url.pathname === '/workmatchr_lms20_synthetic'
    && ['postgres', 'academy_content_editor'].includes(url.username) && url.password && !url.search && !url.hash && !PREVIEW_FORBIDDEN_VARIABLES.some(key => Boolean(process.env[key])) && !process.env.CRON_SECRET && !process.env.FINANCIAL_MAINTENANCE_SECRET)
    return {projectId:input.projectId,branchId:input.branchId,hostname:url.hostname,database:'workmatchr_lms20_synthetic'}
  const target = input.branchId === ACADEMY_FINAL_ACCEPTANCE_DATABASE.branchId ? ACADEMY_FINAL_ACCEPTANCE_DATABASE
    : input.branchId === ACADEMY_DECISIONS_DATABASE.branchId ? ACADEMY_DECISIONS_DATABASE
    : input.branchId === ACADEMY_RC_ACCEPTANCE_DATABASE.branchId ? ACADEMY_RC_ACCEPTANCE_DATABASE
    : input.branchId === WL003_ACCEPTANCE_DATABASE.branchId ? WL003_ACCEPTANCE_DATABASE : ACADEMY_TEST_DATABASE
  if (target !== ACADEMY_TEST_DATABASE && expectedDatabase !== 'neondb') throw new Error('ACADEMY_IMPORT_DATABASE_REFUSED')
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.hostname !== target.hostname
    || url.pathname !== `/${expectedDatabase}` || !['', '5432'].includes(url.port)
    || url.searchParams.get('sslmode') !== 'verify-full'
    // pg accepts query-string connection overrides: never let them replace the pinned identity or TLS.
    || [...url.searchParams].length !== 1 || url.hash || !url.username || !url.password
    || input.projectId !== target.projectId || input.branchId !== target.branchId) throw new Error('ACADEMY_IMPORT_DATABASE_REFUSED')
  return { projectId: input.projectId, branchId: input.branchId, hostname: url.hostname, database: expectedDatabase }
}
