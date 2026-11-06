// Preserve the original WL-001 target and its existing TLS policy.
export const FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET = {
  projectId: 'fixture-842b0f40ee',
  branchId: 'fixture-c9e0f4b4a8',
  databaseName: 'neondb',
  databaseHost: 'fixture-eecfc64afe.example.invalid',
} as const

export const ACADEMY_FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET = {
  projectId: 'academy-synthetic-project',
  branchId: 'branch-fixture-little-hill',
  databaseName: 'neondb',
  databaseHost: 'fixture-6e93ad508d.example.invalid',
} as const

export type FirstPlatformOwnerBootstrapEnvironment = {
  NODE_ENV?: string
  VERCEL?: string
  VERCEL_ENV?: string
  DATABASE_URL?: string
  WL001_TEST_NEON_PROJECT_ID?: string
  WL001_TEST_NEON_BRANCH_ID?: string
  ACADEMY_TEST_PROJECT_ID?: string
  ACADEMY_TEST_BRANCH_ID?: string
}

export class FirstPlatformOwnerBootstrapPolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FirstPlatformOwnerBootstrapPolicyError'
  }
}

/** An explicit project/branch selection AND the pinned TLS endpoint must match. */
export function assertFirstPlatformOwnerBootstrapEnvironment(
  environment: FirstPlatformOwnerBootstrapEnvironment = process.env,
) {
  if (!['development', 'test'].includes(environment.NODE_ENV ?? '')) {
    throw new FirstPlatformOwnerBootstrapPolicyError('Bootstrap is alleen toegestaan in development of test.')
  }
  if (environment.VERCEL || environment.VERCEL_ENV) {
    throw new FirstPlatformOwnerBootstrapPolicyError('Bootstrap is niet toegestaan binnen een Vercel-runtime.')
  }
  const academySelected = Boolean(environment.ACADEMY_TEST_PROJECT_ID || environment.ACADEMY_TEST_BRANCH_ID)
  const wl001Selected = Boolean(environment.WL001_TEST_NEON_PROJECT_ID || environment.WL001_TEST_NEON_BRANCH_ID)
  if (academySelected === wl001Selected) {
    throw new FirstPlatformOwnerBootstrapPolicyError('Selecteer exact één toegestane testomgeving.')
  }
  const target = academySelected ? ACADEMY_FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET : FIRST_PLATFORM_OWNER_BOOTSTRAP_TARGET
  const projectId = academySelected ? environment.ACADEMY_TEST_PROJECT_ID : environment.WL001_TEST_NEON_PROJECT_ID
  const branchId = academySelected ? environment.ACADEMY_TEST_BRANCH_ID : environment.WL001_TEST_NEON_BRANCH_ID
  if (projectId !== target.projectId || branchId !== target.branchId) {
    throw new FirstPlatformOwnerBootstrapPolicyError('De expliciet bevestigde Neon-project- of branchidentiteit klopt niet.')
  }
  let url: URL
  try { url = new URL(environment.DATABASE_URL ?? '') } catch {
    throw new FirstPlatformOwnerBootstrapPolicyError('DATABASE_URL ontbreekt of is ongeldig.')
  }
  const tlsModes = academySelected ? ['verify-full'] : ['require', 'verify-ca', 'verify-full']
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || url.hostname !== target.databaseHost || url.pathname !== `/${target.databaseName}`
    || !['', '5432'].includes(url.port) || !tlsModes.includes(url.searchParams.get('sslmode')?.toLowerCase() ?? '')
    || (academySelected && (!url.username || !url.password))) {
    throw new FirstPlatformOwnerBootstrapPolicyError('DATABASE_URL wijst niet aantoonbaar naar de geselecteerde beveiligde testdatabase.')
  }
  return target
}

export function assertFirstPlatformOwnerDatabaseIdentity(identity: { databaseName: string; serverVersionNum: number } | undefined) {
  if (!identity || identity.databaseName !== 'neondb' || Math.floor(identity.serverVersionNum / 10_000) !== 17) {
    throw new FirstPlatformOwnerBootstrapPolicyError('De actieve database is niet de verwachte PostgreSQL 17-testdatabase.')
  }
}
