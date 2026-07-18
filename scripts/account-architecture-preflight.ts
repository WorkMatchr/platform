import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { Pool, PoolClient, QueryResultRow } from 'pg'

export const REPORT_VERSION = '3.0'
const ADR013_LEGACY_MULTI_MEMBERSHIP_USER_ID = '202fc2db-cb99-489e-a6f0-2ad1e05dcf75'

export type Severity = 'INFO' | 'WARNING' | 'BLOCKER'
export type PhaseStatus = 'RESOLVED_PHASE_2A' | 'RESOLVED_PHASE_2B' | 'OPEN_PHASE_2B' | 'LATER_MIGRATION_BLOCKER' | 'INFORMATIONAL'

export type Finding = {
  code: string
  severity: Severity
  category: string
  entityType: string
  entityId: string | null
  description: string
  evidence: Record<string, unknown>
  adr013Impact: string
  recommendedAction: string
  manualReview: boolean
  phaseStatus: PhaseStatus
}

export type UserRecord = {
  id: string
  email: string
  displayName: string | null
  emailVerified: boolean
  platformRole: 'USER' | 'ADMIN'
  status: 'INVITED' | 'ACTIVE' | 'BLOCKED' | 'ARCHIVED' | 'DELETION_PENDING' | 'ANONYMIZED'
  createdByUserId: string | null
  migrationClassification: 'MIGRATION_TEMP' | null
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type OrganizationRecord = {
  id: string
  name: string
  organizationType: 'CLIENT' | 'PROVIDER' | 'BOTH' | 'PLATFORM_OPERATOR'
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
  systemKey: string | null
  archivedAt: string | null
  createdAt: string
}

export type MembershipRecord = {
  id: string
  userId: string
  organizationId: string
  organizationName: string
  organizationStatus: OrganizationRecord['status']
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  status: 'INVITED' | 'ACTIVE' | 'SUSPENDED' | 'REMOVED'
  createdAt: string
  updatedAt: string
}

export type AuthSummary = {
  userId: string
  accountCount: number
  passwordCredentialCount: number
  activeSessionCount: number
  expiredSessionCount: number
  lastSessionActivityAt: string | null
  verificationCount: number
  activeVerificationCount: number
}

export type PermissionRecord = {
  grantId: string
  userId: string
  permission: 'PROVIDER_REVIEWER' | 'PROVIDER_APPROVER' | 'PROVIDER_AUDITOR'
  validFrom: string
  validUntil: string | null
  revokedAt: string | null
  grantedByUserId: string
}

export type DependencyRecord = {
  userId: string
  tableName: string
  columnName: string
  recordCount: number
}

export type IntegrityCounts = {
  orphanMembershipUsers: number
  orphanMembershipOrganizations: number
  orphanAccounts: number
  orphanSessions: number
  orphanPermissionSubjects: number
  orphanPermissionGranters: number
  orphanPermissionRevokers: number
  orphanAdminActionActors: number
  unmatchedVerificationRecords: number
  assignmentTenantMismatches: number
  assignmentLocationTenantMismatches: number
  providerProfileTypeMismatches: number
  providerDossierCandidateMismatches: number
  providerDossierReviewCaseMismatches: number
  providerDossierFindingMismatches: number
  providerVerificationBindingMismatches: number
  providerQualificationBindingMismatches: number
}

export type ProvisioningCandidate = {
  userId: string
  actorUserId: string
  action: string
  createdAt: string
}

export type AccountProvisioningRecord = {
  id: string
  eventType:
    | 'ACCOUNT_INVITED'
    | 'ACCOUNT_CREATED'
    | 'INVITATION_ACCEPTED'
    | 'ORGANIZATION_LINKED'
    | 'ROLE_GRANTED'
    | 'ROLE_CHANGED'
    | 'ACCOUNT_BLOCKED'
    | 'ACCOUNT_UNBLOCKED'
    | 'DELETION_REQUESTED'
    | 'ACCOUNT_DELETED'
    | 'ACCOUNT_ANONYMIZED'
    | 'MEMBERSHIP_TERMINATED'
    | 'MIGRATED_UNKNOWN'
  subjectUserId: string
  actorUserId: string | null
  reasonCode: string | null
  correlationId: string | null
  idempotencyKey: string | null
  occurredAt?: string
}

export type OrganizationProvisioningRecord = {
  id: string
  eventType: 'ORGANIZATION_BOOTSTRAPPED' | 'SYSTEM_IDENTITY_ASSIGNED' | 'GOVERNANCE_ACTIVATED'
  organizationId: string
  actorType: 'SYSTEM' | 'USER'
  actorUserId: string | null
  reasonCode: string
  correlationId: string | null
  idempotencyKey: string
}

export type StaticIndicator = {
  code: string
  file: string
  matches: number
  description: string
}

export type PreflightSnapshot = {
  users: UserRecord[]
  organizations: OrganizationRecord[]
  memberships: MembershipRecord[]
  auth: AuthSummary[]
  permissions: PermissionRecord[]
  dependencies: DependencyRecord[]
  provisioningCandidates: ProvisioningCandidate[]
  accountProvisioningEvents: AccountProvisioningRecord[]
  organizationProvisioningEvents: OrganizationProvisioningRecord[]
  integrity: IntegrityCounts
  staticIndicators: StaticIndicator[]
}

export type ReportMetadata = {
  generatedAt: string
  databaseEnvironment: {
    hostType: 'LOCAL' | 'REMOTE' | 'UNKNOWN'
    databaseFingerprint: string
    schema: string
  }
  git: {
    commit: string | null
    dirty: boolean
    changedPathCount: number
  }
  redacted: boolean
}

export type PreflightSummary = {
  totalUsers: number
  activeUsers: number
  blockedUsers: number
  archivedUsers: number
  invitedUsers: number
  totalOrganizations: number
  activeOrganizations: number
  totalMemberships: number
  membershipsByStatus: Record<string, number>
  usersWithZeroMemberships: number
  usersWithExactlyOneMembership: number
  usersWithMultipleMemberships: number
  organizationsWithoutActiveOwner: number
  organizationsWithExactlyOneActiveOwner: number
  organizationsWithMultipleActiveOwners: number
  platformPermissionAccounts: number
  blockerCount: number
  warningCount: number
  infoCount: number
  manualReviewCount: number
}

export type PreflightReport = {
  reportVersion: typeof REPORT_VERSION
  generatedAt: string
  metadata: Omit<ReportMetadata, 'generatedAt'>
  summary: PreflightSummary
  findings: Finding[]
  blockers: Finding[]
  warnings: Finding[]
  manualReview: Finding[]
  architectureDeviations: string[]
  declaration: string
}

type SqlClient = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, values?: readonly unknown[]): Promise<{ rows: T[] }>
}

export function assertReadOnlySql(sql: string): void {
  const normalized = sql.replace(/--.*$/gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').trim()
  const keywordSurface = normalized
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"(?:""|[^"])*"/g, '""')
  if (!/^(SELECT|WITH)\b/i.test(normalized)) {
    throw new Error('PREFLIGHT_WRITE_GUARD: uitsluitend SELECT- en WITH-query’s zijn toegestaan.')
  }
  if (/;\s*\S/.test(normalized)) {
    throw new Error('PREFLIGHT_WRITE_GUARD: meerdere SQL-statements zijn niet toegestaan.')
  }
  if (/\b(INSERT|UPDATE|DELETE|UPSERT|MERGE|ALTER|DROP|CREATE|TRUNCATE|GRANT|REVOKE|COPY|CALL|DO|VACUUM|REFRESH|REINDEX|CLUSTER|COMMENT)\b/i.test(keywordSurface)) {
    throw new Error('PREFLIGHT_WRITE_GUARD: muterende SQL is niet toegestaan.')
  }
  if (/\bFOR\s+(UPDATE|NO\s+KEY\s+UPDATE|SHARE|KEY\s+SHARE)\b/i.test(keywordSurface) || /\bSELECT\s+INTO\b/i.test(keywordSurface)) {
    throw new Error('PREFLIGHT_WRITE_GUARD: vergrendelende of schrijvende SELECT is niet toegestaan.')
  }
  if (/\b(nextval|setval|pg_advisory_lock|pg_try_advisory_lock)\s*\(/i.test(keywordSurface)) {
    throw new Error('PREFLIGHT_WRITE_GUARD: functies met statewijziging zijn niet toegestaan.')
  }
}

export function createReadOnlyQueryExecutor(client: SqlClient): SqlClient {
  return {
    query: async <T extends QueryResultRow>(text: string, values?: readonly unknown[]) => {
      assertReadOnlySql(text)
      return client.query<T>(text, values)
    },
  }
}

export async function runInReadOnlyTransaction<T>(pool: Pool, callback: (client: SqlClient) => Promise<T>): Promise<T> {
  const client: PoolClient = await pool.connect()
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
    await client.query("SET LOCAL statement_timeout = '30s'")
    await client.query("SET LOCAL lock_timeout = '5s'")
    const result = await callback(createReadOnlyQueryExecutor(client))
    await client.query('ROLLBACK')
    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // De oorspronkelijke fout blijft leidend; ook bij rollbackfalen wordt niets verder uitgevoerd.
    }
    throw error
  } finally {
    client.release()
  }
}

function asIso(value: Date | string | null): string | null {
  if (value === null) return null
  return new Date(value).toISOString()
}

function asNumber(value: number | string | bigint): number {
  return Number(value)
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

async function rows<T extends QueryResultRow>(client: SqlClient, sql: string, values?: readonly unknown[]): Promise<T[]> {
  return (await client.query<T>(sql, values)).rows
}

export async function collectPreflightSnapshot(client: SqlClient, staticIndicators: StaticIndicator[]): Promise<PreflightSnapshot> {
  const userRows = await rows<{
    id: string
    email: string
    display_name: string | null
    email_verified: boolean
    platform_role: UserRecord['platformRole']
    status: UserRecord['status']
    created_by_user_id: string | null
    migration_classification: UserRecord['migrationClassification']
    created_at: Date
    updated_at: Date
    archived_at: Date | null
  }>(client, `
    SELECT id, email, "displayName" AS display_name, "emailVerified" AS email_verified,
           "platformRole" AS platform_role, status, "createdByUserId" AS created_by_user_id,
           "migrationClassification" AS migration_classification, "createdAt" AS created_at,
           "updatedAt" AS updated_at, "archivedAt" AS archived_at
    FROM "User"
    ORDER BY id
  `)

  const organizationRows = await rows<{
    id: string
    name: string
    organization_type: OrganizationRecord['organizationType']
    status: OrganizationRecord['status']
    system_key: string | null
    archived_at: Date | null
    created_at: Date
  }>(client, `
    SELECT id, name, "organizationType" AS organization_type, status,
           "systemKey" AS system_key, "archivedAt" AS archived_at, "createdAt" AS created_at
    FROM "Organization"
    ORDER BY id
  `)

  const membershipRows = await rows<{
    id: string
    user_id: string
    organization_id: string
    organization_name: string
    organization_status: OrganizationRecord['status']
    role: MembershipRecord['role']
    status: MembershipRecord['status']
    created_at: Date
    updated_at: Date
  }>(client, `
    SELECT m.id, m."userId" AS user_id, m."organizationId" AS organization_id,
           o.name AS organization_name, o.status AS organization_status,
           m.role, m.status, m."createdAt" AS created_at, m."updatedAt" AS updated_at
    FROM "OrganizationMembership" m
    JOIN "Organization" o ON o.id = m."organizationId"
    ORDER BY m."userId", m."createdAt", m.id
  `)

  const authRows = await rows<{
    user_id: string
    account_count: string
    password_credential_count: string
    active_session_count: string
    expired_session_count: string
    last_session_activity_at: Date | null
    verification_count: string
    active_verification_count: string
  }>(client, `
    SELECT u.id AS user_id,
      (SELECT count(*) FROM "Account" a WHERE a."userId" = u.id) AS account_count,
      (SELECT count(*) FROM "Account" a WHERE a."userId" = u.id AND a.password IS NOT NULL) AS password_credential_count,
      (SELECT count(*) FROM "Session" s WHERE s."userId" = u.id AND s."expiresAt" > now()) AS active_session_count,
      (SELECT count(*) FROM "Session" s WHERE s."userId" = u.id AND s."expiresAt" <= now()) AS expired_session_count,
      (SELECT max(s."updatedAt") FROM "Session" s WHERE s."userId" = u.id) AS last_session_activity_at,
      (SELECT count(*) FROM "Verification" v WHERE lower(trim(v.identifier)) = lower(trim(u.email)) OR v.value = u.id::text) AS verification_count,
      (SELECT count(*) FROM "Verification" v WHERE (lower(trim(v.identifier)) = lower(trim(u.email)) OR v.value = u.id::text) AND v."expiresAt" > now()) AS active_verification_count
    FROM "User" u
    ORDER BY u.id
  `)

  const permissionRows = await rows<{
    grant_id: string
    user_id: string
    permission: PermissionRecord['permission']
    valid_from: Date
    valid_until: Date | null
    revoked_at: Date | null
    granted_by_user_id: string
  }>(client, `
    SELECT g.id AS grant_id, g."userId" AS user_id, g.permission,
           g."validFrom" AS valid_from, g."validUntil" AS valid_until,
           r."revokedAt" AS revoked_at, g."grantedByUserId" AS granted_by_user_id
    FROM "ProviderPlatformPermissionGrant" g
    LEFT JOIN "ProviderPlatformPermissionRevocation" r ON r."grantId" = g.id
    ORDER BY g."userId", g.permission, g."validFrom", g.id
  `)

  const provisioningRows = await rows<{
    user_id: string
    actor_user_id: string
    action: string
    created_at: Date
  }>(client, `
    SELECT u.id AS user_id, a."actorUserId" AS actor_user_id, a.action, a."createdAt" AS created_at
    FROM "User" u
    JOIN "AdminActionLog" a ON a."entityType" = 'User' AND a."entityId" = u.id
    WHERE a.action ILIKE ANY (ARRAY['%CREATE%', '%INVITE%', '%PROVISION%'])
    ORDER BY u.id, a."createdAt", a.id
  `)

  const accountProvisioningRows = await rows<{
    id: string
    event_type: AccountProvisioningRecord['eventType']
    subject_user_id: string
    actor_user_id: string | null
    reason_code: string | null
    correlation_id: string | null
    idempotency_key: string | null
    occurred_at: Date
  }>(client, `
    SELECT id, "eventType" AS event_type, "subjectUserId" AS subject_user_id,
           "actorUserId" AS actor_user_id, "reasonCode" AS reason_code,
           "correlationId" AS correlation_id, "idempotencyKey" AS idempotency_key,
           "occurredAt" AS occurred_at
    FROM "AccountProvisioningEvent"
    ORDER BY "subjectUserId", "occurredAt", id
  `)

  const organizationProvisioningRows = await rows<{
    id: string
    event_type: OrganizationProvisioningRecord['eventType']
    organization_id: string
    actor_type: OrganizationProvisioningRecord['actorType']
    actor_user_id: string | null
    reason_code: string
    correlation_id: string | null
    idempotency_key: string
  }>(client, `
    SELECT id, "eventType" AS event_type, "organizationId" AS organization_id,
           "actorType" AS actor_type, "actorUserId" AS actor_user_id,
           "reasonCode" AS reason_code, "correlationId" AS correlation_id,
           "idempotencyKey" AS idempotency_key
    FROM "OrganizationProvisioningEvent"
    ORDER BY "organizationId", "occurredAt", id
  `)

  const integrityRows = await rows<{
    orphan_membership_users: string
    orphan_membership_organizations: string
    orphan_accounts: string
    orphan_sessions: string
    orphan_permission_subjects: string
    orphan_permission_granters: string
    orphan_permission_revokers: string
    orphan_admin_action_actors: string
    unmatched_verification_records: string
    assignment_tenant_mismatches: string
    assignment_location_tenant_mismatches: string
    provider_profile_type_mismatches: string
    provider_dossier_candidate_mismatches: string
    provider_dossier_review_case_mismatches: string
    provider_dossier_finding_mismatches: string
    provider_verification_binding_mismatches: string
    provider_qualification_binding_mismatches: string
  }>(client, `
    SELECT
      (SELECT count(*) FROM "OrganizationMembership" m LEFT JOIN "User" u ON u.id = m."userId" WHERE u.id IS NULL) AS orphan_membership_users,
      (SELECT count(*) FROM "OrganizationMembership" m LEFT JOIN "Organization" o ON o.id = m."organizationId" WHERE o.id IS NULL) AS orphan_membership_organizations,
      (SELECT count(*) FROM "Account" a LEFT JOIN "User" u ON u.id = a."userId" WHERE u.id IS NULL) AS orphan_accounts,
      (SELECT count(*) FROM "Session" s LEFT JOIN "User" u ON u.id = s."userId" WHERE u.id IS NULL) AS orphan_sessions,
      (SELECT count(*) FROM "ProviderPlatformPermissionGrant" g LEFT JOIN "User" u ON u.id = g."userId" WHERE u.id IS NULL) AS orphan_permission_subjects,
      (SELECT count(*) FROM "ProviderPlatformPermissionGrant" g LEFT JOIN "User" u ON u.id = g."grantedByUserId" WHERE u.id IS NULL) AS orphan_permission_granters,
      (SELECT count(*) FROM "ProviderPlatformPermissionRevocation" r LEFT JOIN "User" u ON u.id = r."revokedByUserId" WHERE u.id IS NULL) AS orphan_permission_revokers,
      (SELECT count(*) FROM "AdminActionLog" a LEFT JOIN "User" u ON u.id = a."actorUserId" WHERE u.id IS NULL) AS orphan_admin_action_actors,
      (SELECT count(*) FROM "Verification" v LEFT JOIN "User" u ON lower(trim(u.email)) = lower(trim(v.identifier)) OR v.value = u.id::text WHERE u.id IS NULL) AS unmatched_verification_records,
      (SELECT count(*) FROM "Assignment" a JOIN "Intake" i ON i.id = a."intakeId" WHERE a."clientOrganizationId" <> i."clientOrganizationId") AS assignment_tenant_mismatches,
      (SELECT count(*) FROM "Assignment" a JOIN "OrganizationLocation" l ON l.id = a."locationId" WHERE l."organizationId" <> a."clientOrganizationId") AS assignment_location_tenant_mismatches,
      (SELECT count(*) FROM "ProviderProfile" p JOIN "Organization" o ON o.id = p."organizationId" WHERE o."organizationType" NOT IN ('PROVIDER', 'BOTH')) AS provider_profile_type_mismatches,
      (SELECT count(*) FROM "ProviderDossierCandidate" c JOIN "ProviderDossierSubmission" s ON s.id = c."submissionId" WHERE c."providerProfileId" <> s."providerProfileId") AS provider_dossier_candidate_mismatches,
      (SELECT count(*) FROM "ProviderDossierReviewCase" r JOIN "ProviderDossierSubmission" s ON s.id = r."submissionId" JOIN "ProviderDossierCandidate" c ON c.id = r."candidateId" WHERE r."providerProfileId" <> s."providerProfileId" OR r."providerProfileId" <> c."providerProfileId" OR c."submissionId" <> r."submissionId") AS provider_dossier_review_case_mismatches,
      (SELECT count(*) FROM "ProviderDossierFinding" f JOIN "ProviderDossierReviewCase" r ON r.id = f."reviewCaseId" JOIN "ProviderDossierCandidate" c ON c.id = f."candidateId" WHERE f."candidateId" <> r."candidateId" OR c."providerProfileId" <> r."providerProfileId") AS provider_dossier_finding_mismatches,
      (SELECT count(*) FROM "ProviderVerificationReview" v LEFT JOIN "ProviderDossierCandidate" c ON c.id = v."dossierCandidateId" LEFT JOIN "ProviderDossierSubmission" s ON s.id = v."dossierSubmissionId" LEFT JOIN "ProviderDossierReviewCase" r ON r.id = v."dossierReviewCaseId" WHERE (c.id IS NOT NULL AND c."providerProfileId" <> v."providerProfileId") OR (s.id IS NOT NULL AND s."providerProfileId" <> v."providerProfileId") OR (r.id IS NOT NULL AND r."providerProfileId" <> v."providerProfileId")) AS provider_verification_binding_mismatches,
      (SELECT count(*) FROM "ProviderQualificationDecision" q LEFT JOIN "ProviderDossierCandidate" c ON c.id = q."dossierCandidateId" LEFT JOIN "ProviderDossierSubmission" s ON s.id = q."dossierSubmissionId" LEFT JOIN "ProviderDossierReviewCase" r ON r.id = q."dossierReviewCaseId" WHERE (c.id IS NOT NULL AND c."providerProfileId" <> q."providerProfileId") OR (s.id IS NOT NULL AND s."providerProfileId" <> q."providerProfileId") OR (r.id IS NOT NULL AND r."providerProfileId" <> q."providerProfileId")) AS provider_qualification_binding_mismatches
  `)

  const fkRows = await rows<{ table_name: string; column_name: string }>(client, `
    SELECT DISTINCT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.constraint_schema = kcu.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
      AND ccu.table_name = 'User'
      AND ccu.column_name = 'id'
    ORDER BY tc.table_name, kcu.column_name
  `)

  const dependencies: DependencyRecord[] = []
  for (const fk of fkRows) {
    const dependencyRows = await rows<{ user_id: string; record_count: string }>(client, `
      SELECT ${quoteIdentifier(fk.column_name)} AS user_id, count(*) AS record_count
      FROM ${quoteIdentifier(fk.table_name)}
      WHERE ${quoteIdentifier(fk.column_name)} IS NOT NULL
      GROUP BY ${quoteIdentifier(fk.column_name)}
      ORDER BY ${quoteIdentifier(fk.column_name)}
    `)
    dependencies.push(...dependencyRows.map((row) => ({
      userId: row.user_id,
      tableName: fk.table_name,
      columnName: fk.column_name,
      recordCount: asNumber(row.record_count),
    })))
  }

  const integrityRow = integrityRows[0]
  if (!integrityRow) throw new Error('PREFLIGHT_SCHEMA_UNEXPECTED: integriteitsquery leverde geen resultaat.')

  return {
    users: userRows.map((row) => ({
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      emailVerified: row.email_verified,
      platformRole: row.platform_role,
      status: row.status,
      createdByUserId: row.created_by_user_id,
      migrationClassification: row.migration_classification,
      createdAt: asIso(row.created_at)!,
      updatedAt: asIso(row.updated_at)!,
      archivedAt: asIso(row.archived_at),
    })),
    organizations: organizationRows.map((row) => ({
      id: row.id,
      name: row.name,
      organizationType: row.organization_type,
      status: row.status,
      systemKey: row.system_key,
      archivedAt: asIso(row.archived_at),
      createdAt: asIso(row.created_at)!,
    })),
    memberships: membershipRows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      organizationId: row.organization_id,
      organizationName: row.organization_name,
      organizationStatus: row.organization_status,
      role: row.role,
      status: row.status,
      createdAt: asIso(row.created_at)!,
      updatedAt: asIso(row.updated_at)!,
    })),
    auth: authRows.map((row) => ({
      userId: row.user_id,
      accountCount: asNumber(row.account_count),
      passwordCredentialCount: asNumber(row.password_credential_count),
      activeSessionCount: asNumber(row.active_session_count),
      expiredSessionCount: asNumber(row.expired_session_count),
      lastSessionActivityAt: asIso(row.last_session_activity_at),
      verificationCount: asNumber(row.verification_count),
      activeVerificationCount: asNumber(row.active_verification_count),
    })),
    permissions: permissionRows.map((row) => ({
      grantId: row.grant_id,
      userId: row.user_id,
      permission: row.permission,
      validFrom: asIso(row.valid_from)!,
      validUntil: asIso(row.valid_until),
      revokedAt: asIso(row.revoked_at),
      grantedByUserId: row.granted_by_user_id,
    })),
    dependencies: dependencies.sort((a, b) => `${a.userId}:${a.tableName}:${a.columnName}`.localeCompare(`${b.userId}:${b.tableName}:${b.columnName}`)),
    provisioningCandidates: provisioningRows.map((row) => ({
      userId: row.user_id,
      actorUserId: row.actor_user_id,
      action: row.action,
      createdAt: asIso(row.created_at)!,
    })),
    accountProvisioningEvents: accountProvisioningRows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      subjectUserId: row.subject_user_id,
      actorUserId: row.actor_user_id,
      reasonCode: row.reason_code,
      correlationId: row.correlation_id,
      idempotencyKey: row.idempotency_key,
      occurredAt: asIso(row.occurred_at)!,
    })),
    organizationProvisioningEvents: organizationProvisioningRows.map((row) => ({
      id: row.id,
      eventType: row.event_type,
      organizationId: row.organization_id,
      actorType: row.actor_type,
      actorUserId: row.actor_user_id,
      reasonCode: row.reason_code,
      correlationId: row.correlation_id,
      idempotencyKey: row.idempotency_key,
    })),
    integrity: {
      orphanMembershipUsers: asNumber(integrityRow.orphan_membership_users),
      orphanMembershipOrganizations: asNumber(integrityRow.orphan_membership_organizations),
      orphanAccounts: asNumber(integrityRow.orphan_accounts),
      orphanSessions: asNumber(integrityRow.orphan_sessions),
      orphanPermissionSubjects: asNumber(integrityRow.orphan_permission_subjects),
      orphanPermissionGranters: asNumber(integrityRow.orphan_permission_granters),
      orphanPermissionRevokers: asNumber(integrityRow.orphan_permission_revokers),
      orphanAdminActionActors: asNumber(integrityRow.orphan_admin_action_actors),
      unmatchedVerificationRecords: asNumber(integrityRow.unmatched_verification_records),
      assignmentTenantMismatches: asNumber(integrityRow.assignment_tenant_mismatches),
      assignmentLocationTenantMismatches: asNumber(integrityRow.assignment_location_tenant_mismatches),
      providerProfileTypeMismatches: asNumber(integrityRow.provider_profile_type_mismatches),
      providerDossierCandidateMismatches: asNumber(integrityRow.provider_dossier_candidate_mismatches),
      providerDossierReviewCaseMismatches: asNumber(integrityRow.provider_dossier_review_case_mismatches),
      providerDossierFindingMismatches: asNumber(integrityRow.provider_dossier_finding_mismatches),
      providerVerificationBindingMismatches: asNumber(integrityRow.provider_verification_binding_mismatches),
      providerQualificationBindingMismatches: asNumber(integrityRow.provider_qualification_binding_mismatches),
    },
    staticIndicators: [...staticIndicators].sort((a, b) => `${a.file}:${a.code}`.localeCompare(`${b.file}:${b.code}`)),
  }
}

function activePermission(permission: PermissionRecord, generatedAt: string): boolean {
  return permission.revokedAt === null && permission.validFrom <= generatedAt && (permission.validUntil === null || permission.validUntil > generatedAt)
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function addFinding(findings: Finding[], finding: Omit<Finding, 'phaseStatus'> & { phaseStatus?: PhaseStatus }): void {
  findings.push({
    ...finding,
    phaseStatus: finding.phaseStatus ?? (finding.severity === 'BLOCKER'
      ? 'LATER_MIGRATION_BLOCKER'
      : finding.severity === 'INFO'
        ? 'INFORMATIONAL'
        : 'OPEN_PHASE_2B'),
  })
}

function dependenciesFor(snapshot: PreflightSnapshot, userId: string): Array<{ table: string; column: string; count: number }> {
  return snapshot.dependencies
    .filter((item) => item.userId === userId)
    .map((item) => ({ table: item.tableName, column: item.columnName, count: item.recordCount }))
}

export function buildPreflightReport(snapshot: PreflightSnapshot, metadata: ReportMetadata): PreflightReport {
  const findings: Finding[] = []
  const membershipsByUser = new Map<string, MembershipRecord[]>()
  const authByUser = new Map(snapshot.auth.map((item) => [item.userId, item]))
  const usersById = new Map(snapshot.users.map((user) => [user.id, user]))

  for (const membership of snapshot.memberships) {
    const current = membershipsByUser.get(membership.userId) ?? []
    current.push(membership)
    membershipsByUser.set(membership.userId, current)
  }

  for (const user of snapshot.users) {
    const memberships = membershipsByUser.get(user.id) ?? []
    const currentPermissions = snapshot.permissions.filter((permission) => permission.userId === user.id && activePermission(permission, metadata.generatedAt))
    const auth = authByUser.get(user.id)
    const isAuditorOnly = currentPermissions.some((permission) => permission.permission === 'PROVIDER_AUDITOR')
      && !currentPermissions.some((permission) => permission.permission !== 'PROVIDER_AUDITOR')

    if (memberships.length > 1) {
      const approvedLegacy = user.id === ADR013_LEGACY_MULTI_MEMBERSHIP_USER_ID
      addFinding(findings, {
        code: approvedLegacy ? 'ADR013_LEGACY_MULTI_MEMBERSHIP' : 'ADR013_NEW_MULTI_MEMBERSHIP', severity: 'BLOCKER', category: 'MULTI_MEMBERSHIP', entityType: 'User', entityId: user.id,
        description: approvedLegacy ? 'De expliciet goedgekeurde legacygebruiker heeft tijdelijk twee tenantmemberships.' : 'Een niet-goedgekeurde gebruiker heeft meer dan één organisatiemembership.',
        evidence: { displayName: user.displayName, email: user.email, membershipCount: memberships.length, memberships, platformRole: user.platformRole, permissions: currentPermissions.map((item) => item.permission), lastKnownAuthActivity: auth?.lastSessionActivityAt ?? null, historicalDependencies: dependenciesFor(snapshot, user.id) },
        adr013Impact: approvedLegacy ? 'De unieke membershipregel blijft geblokkeerd tot Fase 2C deze concrete uitzondering handmatig oplost.' : 'De Fase 2B-servicelaagregel is geschonden; stop verdere migratie.',
        recommendedAction: approvedLegacy ? 'Behoud beide memberships ongewijzigd tot de goedgekeurde Fase 2C-recordbeslissing.' : 'Onderzoek de nieuwe koppeling en herstel uitsluitend handmatig via een afzonderlijk geautoriseerd plan.',
        manualReview: true,
        phaseStatus: 'LATER_MIGRATION_BLOCKER',
      })
    }

    if (memberships.length === 0) {
      const allowedAuditor = user.status === 'ACTIVE' && isAuditorOnly
      const migrationTemp = user.status === 'INVITED' && user.migrationClassification === 'MIGRATION_TEMP'
      addFinding(findings, {
        code: allowedAuditor ? 'ADR013_AUDITOR_WITHOUT_MEMBERSHIP' : migrationTemp ? 'ADR013_MIGRATION_TEMP_WITHOUT_MEMBERSHIP' : user.status === 'ACTIVE' ? 'ADR013_ACTIVE_USER_WITHOUT_MEMBERSHIP' : 'ADR013_INACTIVE_USER_WITHOUT_MEMBERSHIP',
        severity: allowedAuditor || migrationTemp ? 'INFO' : user.status === 'ACTIVE' ? 'BLOCKER' : 'WARNING',
        category: 'ZERO_MEMBERSHIP', entityType: 'User', entityId: user.id,
        description: allowedAuditor ? 'Actieve auditor zonder organisatie sluit aan op ADR-013.' : migrationTemp ? 'De uitgenodigde gebruiker is expliciet als tijdelijk migratierecord geclassificeerd.' : 'De gebruiker heeft geen organisatiemembership en vereist classificatie.',
        evidence: { displayName: user.displayName, email: user.email, status: user.status, migrationClassification: user.migrationClassification, platformRole: user.platformRole, permissions: currentPermissions.map((item) => item.permission), auth },
        adr013Impact: allowedAuditor ? 'Auditors mogen expliciet zonder organisatie bestaan.' : migrationTemp ? 'De Fase 2A-classificatie geeft geen tenant- of platformtoegang.' : 'Een normale actieve tenantgebruiker moet exact één geldige membership hebben.',
        recommendedAction: allowedAuditor ? 'Bevestig handmatig dat het account uitsluitend read-only auditorrechten heeft.' : migrationTemp ? 'Behoud fail-closed tot de afzonderlijke migratiecleanup.' : 'Classificeer als onvoltooide onboarding, platformaccount, blokkade- of archiveringsgeval.',
        manualReview: !migrationTemp,
        phaseStatus: migrationTemp ? 'RESOLVED_PHASE_2A' : undefined,
      })
    }

    if (memberships.length === 1) {
      const membership = memberships[0]!
      if (user.status === 'ACTIVE' && (membership.status !== 'ACTIVE' || membership.organizationStatus !== 'ACTIVE')) {
        addFinding(findings, {
          code: 'ADR013_ACTIVE_USER_WITHOUT_VALID_MEMBERSHIP', severity: 'BLOCKER', category: 'MEMBERSHIP_STATUS', entityType: 'User', entityId: user.id,
          description: 'De actieve gebruiker heeft geen volledig actieve tenantbinding.',
          evidence: { userStatus: user.status, membershipStatus: membership.status, organizationStatus: membership.organizationStatus, organizationId: membership.organizationId },
          adr013Impact: 'De enkelvoudige tenantcontext zou fail-closed geen geldige organisatie kunnen leveren.',
          recommendedAction: 'Beoordeel account-, membership- en organisatiestatus handmatig vóór migratie.', manualReview: true,
        })
      }
    }

    if (!auth || auth.accountCount === 0) {
      addFinding(findings, {
        code: 'BETTER_AUTH_USER_WITHOUT_ACCOUNT', severity: user.status === 'ACTIVE' ? 'BLOCKER' : 'WARNING', category: 'BETTER_AUTH', entityType: 'User', entityId: user.id,
        description: 'Domeingebruiker heeft geen gekoppelde Better Auth Account-identiteit.',
        evidence: { status: user.status, emailVerified: user.emailVerified },
        adr013Impact: 'Accountstatus, credentialintrekking en e-mailvrijgave kunnen niet betrouwbaar worden gemigreerd zonder classificatie.',
        recommendedAction: 'Bepaal of dit een geldige invitation/platformidentity of een onvoltooide authregistratie is.', manualReview: true,
      })
    }

    if (user.status === 'INVITED' && auth && (auth.passwordCredentialCount > 0 || auth.activeVerificationCount > 0)) {
      addFinding(findings, {
        code: 'BETTER_AUTH_INVITED_AUTH_PENDING', severity: 'WARNING', category: 'BETTER_AUTH', entityType: 'User', entityId: user.id,
        description: 'Uitgenodigd account heeft authmetadata die bij een lopende registratie kan passen.',
        evidence: { status: user.status, passwordCredentialCount: auth.passwordCredentialCount, activeSessionCount: auth.activeSessionCount, activeVerificationCount: auth.activeVerificationCount },
        adr013Impact: 'Het account moet als geldige invitation of onvoltooide onboarding worden geclassificeerd.',
        recommendedAction: 'Controleer handmatig de onboardingstatus; trek in deze preflight niets in.', manualReview: true,
      })
    }

    if (user.status === 'BLOCKED' && auth && (auth.activeSessionCount > 0 || auth.activeVerificationCount > 0)) {
      addFinding(findings, {
        code: 'ADR013_BLOCKED_ACCOUNT_WITH_ACTIVE_ACCESS', severity: 'BLOCKER', category: 'BETTER_AUTH', entityType: 'User', entityId: user.id,
        description: 'Een geblokkeerd account heeft nog actieve sessies of accountgebonden resetrecords.',
        evidence: { status: user.status, passwordCredentialCount: auth.passwordCredentialCount, activeSessionCount: auth.activeSessionCount, activeVerificationCount: auth.activeVerificationCount },
        adr013Impact: 'De herstelbare blokkering is niet effectief zolang actieve toegang of resetmiddelen bestaan.',
        recommendedAction: 'Stop en onderzoek de lifecyclemutatie; de preflight zelf trekt niets in.', manualReview: true,
        phaseStatus: 'OPEN_PHASE_2B',
      })
    } else if (user.status === 'BLOCKED' && auth) {
      const blockEvents = snapshot.accountProvisioningEvents.filter((event) => event.subjectUserId === user.id && event.eventType === 'ACCOUNT_BLOCKED')
      addFinding(findings, {
        code: blockEvents.length > 0 ? 'ADR013_BLOCKED_ACCOUNT_ACCESS_REVOKED' : 'ADR013_BLOCKED_ACCOUNT_EVENT_MISSING',
        severity: blockEvents.length > 0 ? 'INFO' : 'BLOCKER', category: 'ACCOUNT_LIFECYCLE', entityType: 'User', entityId: user.id,
        description: blockEvents.length > 0 ? 'Het geblokkeerde account heeft geen actieve sessies of resetrecords en heeft append-only blokkadehistorie.' : 'Het geblokkeerde account mist een append-only blokkade-event.',
        evidence: { activeSessionCount: auth.activeSessionCount, activeVerificationCount: auth.activeVerificationCount, blockEventCount: blockEvents.length, credentialsRetained: auth.passwordCredentialCount > 0 },
        adr013Impact: blockEvents.length > 0 ? 'De Fase 2B-blokkadesemantiek is aantoonbaar actief.' : 'De actuele status is niet volledig auditbaar.',
        recommendedAction: blockEvents.length > 0 ? 'Behoud credentials en membership; deblokkering vereist een nieuw event en nieuwe login.' : 'Onderzoek de statuswijziging zonder historie te reconstrueren.',
        manualReview: blockEvents.length === 0,
        phaseStatus: blockEvents.length > 0 ? 'RESOLVED_PHASE_2B' : 'OPEN_PHASE_2B',
      })
    }

    if (user.status === 'ARCHIVED' && auth && (auth.passwordCredentialCount > 0 || auth.activeSessionCount > 0 || auth.activeVerificationCount > 0)) {
      addFinding(findings, {
        code: 'BETTER_AUTH_ARCHIVED_USER_WITH_AUTH', severity: 'BLOCKER', category: 'BETTER_AUTH', entityType: 'User', entityId: user.id,
        description: 'Een gearchiveerd legacyaccount heeft nog authmiddelen.',
        evidence: { passwordCredentialCount: auth.passwordCredentialCount, activeSessionCount: auth.activeSessionCount, activeVerificationCount: auth.activeVerificationCount },
        adr013Impact: 'ARCHIVED blijft een terminale, handmatig te classificeren legacystatus.',
        recommendedAction: 'Onderzoek de Better Auth-lifecycle handmatig; trek in deze preflight niets in.', manualReview: true,
      })
    }

    if (user.status === 'BLOCKED' && memberships.some((membership) => membership.status === 'ACTIVE')) {
      addFinding(findings, {
        code: 'ADR013_BLOCKED_ACCOUNT_ACTIVE_MEMBERSHIP_RETAINED', severity: 'INFO', category: 'MEMBERSHIP_STATUS', entityType: 'User', entityId: user.id,
        description: 'Het geblokkeerde account behoudt bewust een actief membership zonder tenanttoegang.',
        evidence: { activeMembershipCount: memberships.filter((membership) => membership.status === 'ACTIVE').length },
        adr013Impact: 'Accountstatus blijft de centrale toegangsblokkade; membership en historie blijven behouden.',
        recommendedAction: 'Geen actie; controleer bij deblokkering opnieuw de actuele tenantbinding.', manualReview: false,
        phaseStatus: 'RESOLVED_PHASE_2B',
      })
    }

    if (user.createdByUserId) {
      const creator = usersById.get(user.createdByUserId)
      const creatorOrganizations = new Set((membershipsByUser.get(user.createdByUserId) ?? []).filter((item) => item.status === 'ACTIVE').map((item) => item.organizationId))
      const sharedActiveTenant = memberships.some((item) => item.status === 'ACTIVE' && creatorOrganizations.has(item.organizationId))
      if (!creator || creator.status !== 'ACTIVE' || !sharedActiveTenant) {
        addFinding(findings, {
          code: 'ADR013_CREATOR_SCOPE_INCONSISTENT', severity: 'BLOCKER', category: 'PROVISIONING', entityType: 'User', entityId: user.id,
          description: 'De creatorprojectie heeft geen actuele actieve actor in dezelfde tenant.',
          evidence: { createdByUserId: user.createdByUserId, creatorStatus: creator?.status ?? null, sharedActiveTenant },
          adr013Impact: 'Creatorbeheer moet fail-closed blijven en verleent nooit zelfstandig rechten.',
          recommendedAction: 'Onderzoek de projectie en provisioninghistorie; wijzig geen actorhistorie.', manualReview: true,
          phaseStatus: 'OPEN_PHASE_2B',
        })
      }
    }

    if (auth && auth.expiredSessionCount > 0) {
      addFinding(findings, {
        code: 'BETTER_AUTH_EXPIRED_SESSIONS_PRESENT', severity: 'WARNING', category: 'BETTER_AUTH', entityType: 'User', entityId: user.id,
        description: 'Er zijn verlopen sessierecords aanwezig.', evidence: { expiredSessionCount: auth.expiredSessionCount },
        adr013Impact: 'Een toekomstige intrekkings- en retentieflow moet ook verlopen sessies eenduidig behandelen.',
        recommendedAction: 'Neem cleanup- en retentiegedrag op in het Better Auth-contractbesluit.', manualReview: false,
      })
    }

    if (user.status === 'ARCHIVED') {
      addFinding(findings, {
        code: 'ADR013_ARCHIVED_STATUS_AMBIGUOUS', severity: 'BLOCKER', category: 'ARCHIVED_ACCOUNT', entityType: 'User', entityId: user.id,
        description: 'ARCHIVED heeft zonder aanvullende historie geen ondubbelzinnige mapping naar BLOCKED, DELETION_PENDING of ANONYMIZED.',
        evidence: { displayName: user.displayName, email: user.email, status: user.status, archivedAt: user.archivedAt, updatedAt: user.updatedAt, memberships, auth, personalDataPresent: { email: Boolean(user.email), displayName: Boolean(user.displayName) }, historicalDependencies: dependenciesFor(snapshot, user.id) },
        adr013Impact: 'Fase 1 vereist een expliciet geaccepteerde mapping van bestaande ARCHIVED-accounts.',
        recommendedAction: 'Classificeer handmatig; leid geen definitieve verwijderstatus af zonder bewijs.', manualReview: true,
      })
    }

    const provisioning = snapshot.provisioningCandidates.filter((item) => item.userId === user.id)
    const unknownEvents = snapshot.accountProvisioningEvents.filter((event) =>
      event.subjectUserId === user.id && event.eventType === 'MIGRATED_UNKNOWN' && event.actorUserId === null)
    if (unknownEvents.length === 1 && user.createdByUserId === null) {
      addFinding(findings, {
        code: 'PROVISIONING_MIGRATED_UNKNOWN_RECORDED', severity: 'INFO', category: 'PROVISIONING', entityType: 'User', entityId: user.id,
        description: 'De onbekende historische provisioningactor is expliciet en append-only vastgelegd.',
        evidence: { createdByUserId: null, eventId: unknownEvents[0]!.id, reasonCode: unknownEvents[0]!.reasonCode, correlationId: unknownEvents[0]!.correlationId },
        adr013Impact: 'createdByUserId mag aantoonbaar null blijven zonder een actor te verzinnen.',
        recommendedAction: 'Behoud het event immutable; toekomstige flows schrijven actor en event atomair.', manualReview: false,
        phaseStatus: 'RESOLVED_PHASE_2A',
      })
    } else {
      addFinding(findings, {
        code: unknownEvents.length > 1 ? 'PROVISIONING_UNKNOWN_EVENT_DUPLICATE' : provisioning.length === 1 ? 'PROVISIONING_ACTOR_DERIVABLE_NOT_IMMUTABLE' : provisioning.length > 1 ? 'PROVISIONING_ACTOR_AMBIGUOUS' : 'PROVISIONING_ACTOR_NOT_RECONSTRUCTABLE',
        severity: unknownEvents.length > 1 ? 'BLOCKER' : provisioning.length === 1 ? 'WARNING' : 'BLOCKER', category: 'PROVISIONING', entityType: 'User', entityId: user.id,
        description: unknownEvents.length > 1 ? 'Er bestaan meerdere UNKNOWN-provisioningevents voor dezelfde gebruiker.' : provisioning.length === 1 ? 'Een mogelijke aanmaker is afleidbaar uit AdminActionLog, maar niet als immutable provisioningfeit opgeslagen.' : provisioning.length > 1 ? 'Meerdere mogelijke provisioningacties maken de aanmaker ambigu.' : 'Er is geen opgeslagen of betrouwbaar afleidbare accountaanmaker.',
        evidence: { factuallyStoredCreatedBy: user.createdByUserId !== null, unknownEventCount: unknownEvents.length, derivableCandidates: provisioning.map((item) => ({ actorUserId: item.actorUserId, action: item.action, createdAt: item.createdAt })) },
        adr013Impact: 'Creatorbevoegdheden mogen pas na betrouwbare provisioninghistorie worden geactiveerd.',
        recommendedAction: 'Onderzoek de historie fail-closed en verzin geen backfillactor.', manualReview: true,
      })
    }
  }

  const emailGroups = new Map<string, UserRecord[]>()
  for (const user of snapshot.users) {
    const normalized = normalizeEmail(user.email)
    const group = emailGroups.get(normalized) ?? []
    group.push(user)
    emailGroups.set(normalized, group)
    if (user.email !== normalized || !validEmail(normalized)) {
      addFinding(findings, {
        code: !validEmail(normalized) ? 'EMAIL_INVALID' : 'EMAIL_NORMALIZATION_DIFFERENCE', severity: !validEmail(normalized) ? 'BLOCKER' : 'WARNING', category: 'EMAIL', entityType: 'User', entityId: user.id,
        description: !validEmail(normalized) ? 'Het login-e-mailadres voldoet niet aan de minimale syntactische controle.' : 'Het opgeslagen e-mailadres wijkt af van trim/lowercase-normalisatie.',
        evidence: { email: user.email, normalizedEmail: normalized }, adr013Impact: 'Case-insensitive uniciteit en directe vrijgave vereisen één canonieke loginidentiteit.',
        recommendedAction: 'Laat de identity handmatig beoordelen vóór een unieke lower(email)-regel.', manualReview: true,
      })
    }
  }
  for (const [normalizedEmail, users] of emailGroups) {
    if (users.length > 1) {
      addFinding(findings, {
        code: 'EMAIL_CASE_INSENSITIVE_DUPLICATE', severity: 'BLOCKER', category: 'EMAIL', entityType: 'NormalizedEmail', entityId: null,
        description: 'Meerdere Users delen hetzelfde genormaliseerde e-mailadres.',
        evidence: { normalizedEmail, users: users.map((user) => ({ id: user.id, status: user.status, email: user.email })) },
        adr013Impact: 'De toekomstige case-insensitive unieke loginidentiteit en onmiddellijke e-mailvrijgave zijn geblokkeerd.',
        recommendedAction: 'Los het identityconflict handmatig op; merge of relink historische Users nooit automatisch.', manualReview: true,
      })
    }
  }

  for (const organization of snapshot.organizations) {
    if (organization.organizationType === 'PLATFORM_OPERATOR' || organization.systemKey !== null) continue
    const ownerMemberships = snapshot.memberships.filter((membership) => membership.organizationId === organization.id && membership.role === 'OWNER')
    const activeOwners = ownerMemberships.filter((membership) => membership.status === 'ACTIVE' && usersById.get(membership.userId)?.status === 'ACTIVE')
    if (activeOwners.length === 0 && organization.status === 'ACTIVE') {
      addFinding(findings, {
        code: 'ORGANIZATION_WITHOUT_ACTIVE_OWNER', severity: 'BLOCKER', category: 'OWNER_RISK', entityType: 'Organization', entityId: organization.id,
        description: 'Actieve organisatie heeft geen actieve OWNER met een actief account.',
        evidence: { organizationName: organization.name, organizationStatus: organization.status, ownerMemberships },
        adr013Impact: 'Tenantbeheer en last-OWNER-bescherming kunnen niet veilig worden gemigreerd.',
        recommendedAction: 'Wijs na handmatige validatie een actieve OWNER aan vóór Fase 1.', manualReview: true,
      })
    } else if (activeOwners.length === 1) {
      addFinding(findings, {
        code: 'LAST_OWNER_RISK', severity: 'WARNING', category: 'OWNER_RISK', entityType: 'Organization', entityId: organization.id,
        description: 'Organisatie heeft precies één actieve OWNER.', evidence: { organizationName: organization.name, ownerUserId: activeOwners[0]!.userId },
        adr013Impact: 'Blokkeren, verwijderen of offboarden moet deze laatste OWNER beschermen.',
        recommendedAction: 'Bevestig de eigenaar en plan een tweede OWNER of een expliciete centrale overrideprocedure.', manualReview: true,
      })
    }
    for (const owner of ownerMemberships) {
      const user = usersById.get(owner.userId)
      if (!user || user.status !== 'ACTIVE' || owner.status !== 'ACTIVE') {
        addFinding(findings, {
          code: 'OWNER_ACCOUNT_INCONSISTENT', severity: 'BLOCKER', category: 'OWNER_RISK', entityType: 'OrganizationMembership', entityId: owner.id,
          description: 'OWNER-membership verwijst naar een ontbrekend of niet-actief account of is zelf niet actief.',
          evidence: { organizationId: organization.id, userId: owner.userId, membershipStatus: owner.status, userStatus: user?.status ?? null },
          adr013Impact: 'De beheer- en last-OWNER-invariant is niet betrouwbaar.', recommendedAction: 'Classificeer en herstel uitsluitend na handmatige beoordeling.', manualReview: true,
        })
      }
    }
  }

  const permissionUsers = new Set<string>()
  for (const permission of snapshot.permissions) {
    if (!activePermission(permission, metadata.generatedAt)) continue
    permissionUsers.add(permission.userId)
    const user = usersById.get(permission.userId)
    const memberships = membershipsByUser.get(permission.userId) ?? []
    const isAuditor = permission.permission === 'PROVIDER_AUDITOR'
    const aligned = isAuditor ? memberships.length === 0 : false
    addFinding(findings, {
      code: isAuditor && memberships.length > 0 ? 'PLATFORM_AUDITOR_HAS_MEMBERSHIP' : !isAuditor ? 'PLATFORM_REVIEW_ACTOR_MANAGEMENT_ORG_UNVERIFIABLE' : 'PLATFORM_AUDITOR_ALIGNED',
      severity: aligned ? 'INFO' : 'BLOCKER', category: 'PLATFORM_ROLE', entityType: 'ProviderPlatformPermissionGrant', entityId: permission.grantId,
      description: aligned ? 'Auditorpermission is gekoppeld aan een account zonder membership.' : isAuditor ? 'Auditor heeft een organisatiemembership, in strijd met ADR-013.' : 'Reviewer/approver kan niet aan een technisch gemarkeerde WorkMatchr-beheerorganisatie worden getoetst omdat die markering ontbreekt.',
      evidence: { userId: permission.userId, email: user?.email ?? null, userStatus: user?.status ?? null, permission: permission.permission, platformRole: user?.platformRole ?? null, memberships },
      adr013Impact: isAuditor ? 'AUDITOR moet expliciet read-only en tenantloos zijn.' : 'REVIEWER/APPROVER vereisen beheerorganisatiemembership én permission.',
      recommendedAction: aligned ? 'Bevestig centrale toekenning en read-only scope.' : isAuditor ? 'Verwijder niets automatisch; classificeer membership en permission handmatig.' : 'Besluit en bootstrap eerst de technische WorkMatchr-beheerorganisatie; map daarna handmatig.',
      manualReview: true,
    })
  }

  const integrityEntries: Array<[keyof IntegrityCounts, string]> = [
    ['orphanMembershipUsers', 'OrganizationMembership zonder User'],
    ['orphanMembershipOrganizations', 'OrganizationMembership zonder Organization'],
    ['orphanAccounts', 'Account zonder User'],
    ['orphanSessions', 'Session zonder User'],
    ['orphanPermissionSubjects', 'Permissiongrant zonder subject-User'],
    ['orphanPermissionGranters', 'Permissiongrant zonder grantor-User'],
    ['orphanPermissionRevokers', 'Permissionrevocation zonder actor-User'],
    ['orphanAdminActionActors', 'AdminActionLog zonder actor-User'],
    ['assignmentTenantMismatches', 'Assignment en bronintake verwijzen naar verschillende organisaties'],
    ['assignmentLocationTenantMismatches', 'Assignmentlocatie behoort niet tot de opdrachtgeverorganisatie'],
    ['providerProfileTypeMismatches', 'ProviderProfile behoort niet tot een PROVIDER- of BOTH-organisatie'],
    ['providerDossierCandidateMismatches', 'Dossiercandidate en submission behoren tot verschillende providers'],
    ['providerDossierReviewCaseMismatches', 'Reviewcase, candidate en submission hebben inconsistente providerbinding'],
    ['providerDossierFindingMismatches', 'Finding, reviewcase en candidate hebben inconsistente binding'],
    ['providerVerificationBindingMismatches', 'Verification review heeft een inconsistente candidate-, submission- of casebinding'],
    ['providerQualificationBindingMismatches', 'Qualification decision heeft een inconsistente candidate-, submission- of casebinding'],
  ]
  for (const [key, description] of integrityEntries) {
    const count = snapshot.integrity[key]
    if (count > 0) {
      addFinding(findings, {
        code: `REFERENTIAL_${String(key).replace(/([A-Z])/g, '_$1').toUpperCase()}`, severity: 'BLOCKER', category: 'REFERENTIAL_INTEGRITY', entityType: 'Database', entityId: null,
        description, evidence: { count }, adr013Impact: 'Historische actor- en tenantrelaties kunnen niet betrouwbaar worden gemigreerd.',
        recommendedAction: 'Stop Fase 1 en onderzoek de referentiële afwijking read-only voordat herstel wordt ontworpen.', manualReview: true,
      })
    }
  }
  if (snapshot.integrity.unmatchedVerificationRecords > 0) {
    addFinding(findings, {
      code: 'BETTER_AUTH_UNMATCHED_VERIFICATION', severity: 'WARNING', category: 'BETTER_AUTH', entityType: 'Verification', entityId: null,
      description: 'Verificatie- of resetrecords kunnen niet via genormaliseerd e-mailadres aan een User worden gekoppeld.',
      evidence: { count: snapshot.integrity.unmatchedVerificationRecords }, adr013Impact: 'Toekomstige tokenintrekking en e-mailvrijgave vereisen een aantoonbaar accountgebonden contract.',
      recommendedAction: 'Onderzoek Better Auth-identifiers zonder tokenwaarden te loggen.', manualReview: true,
    })
  }

  for (const indicator of snapshot.staticIndicators) {
    addFinding(findings, {
      code: indicator.code, severity: 'WARNING', category: 'TENANT_ISOLATION_STATIC', entityType: 'SourceFile', entityId: indicator.file,
      description: indicator.description, evidence: { file: indicator.file, matches: indicator.matches },
      adr013Impact: 'De huidige code neemt nog multi-membership of een actieve organisatiekeuze aan.',
      recommendedAction: 'Neem dit bestand op in Fase 3; wijzig het niet tijdens de read-only preflight.', manualReview: false,
    })
  }

  const platformOrganizations = snapshot.organizations.filter((organization) => organization.systemKey === 'WORKMATCHR_PLATFORM')
  const platformOrganization = platformOrganizations[0]
  const platformEvents = platformOrganization
    ? snapshot.organizationProvisioningEvents.filter((event) => event.organizationId === platformOrganization.id)
    : []
  const platformValid = platformOrganizations.length === 1
    && platformOrganization?.organizationType === 'PLATFORM_OPERATOR'
    && platformOrganization.status === 'ACTIVE'
    && platformOrganization.archivedAt === null
    && platformEvents.length === 3
    && platformEvents.every((event) => event.actorType === 'SYSTEM' && event.actorUserId === null)
  addFinding(findings, {
    code: platformValid ? 'ADR013_MANAGEMENT_ORGANIZATION_ACTIVE' : 'ADR013_MANAGEMENT_ORGANIZATION_INVALID',
    severity: platformValid ? 'INFO' : 'BLOCKER', category: 'PLATFORM_ROLE', entityType: 'Organization', entityId: platformOrganization?.id ?? null,
    description: platformValid ? 'De technisch gemarkeerde WorkMatchr-platformorganisatie en systeemprovisioninghistorie zijn actief.' : 'De WorkMatchr-platformorganisatie ontbreekt of voldoet niet aan de Fase 2A-invarianten.',
    evidence: { platformOrganizationCount: platformOrganizations.length, organizationType: platformOrganization?.organizationType ?? null, status: platformOrganization?.status ?? null, archivedAt: platformOrganization?.archivedAt ?? null, provisioningEventCount: platformEvents.length },
    adr013Impact: platformValid ? 'Fase 2A heeft de centrale platformidentiteit fail-closed geactiveerd.' : 'Platformrollen kunnen niet betrouwbaar aan de beheerorganisatie worden gekoppeld.',
    recommendedAction: platformValid ? 'Gebruik uitsluitend de centrale lookup op systemKey.' : 'Stop en herstel uitsluitend via de gecontroleerde Fase 2A-bootstrap.',
    manualReview: !platformValid,
    phaseStatus: platformValid ? 'RESOLVED_PHASE_2A' : 'LATER_MIGRATION_BLOCKER',
  })

  const sortedFindings = findings.sort((a, b) => `${a.severity}:${a.category}:${a.code}:${a.entityId ?? ''}`.localeCompare(`${b.severity}:${b.category}:${b.code}:${b.entityId ?? ''}`))
  const membershipCounts = snapshot.users.map((user) => (membershipsByUser.get(user.id) ?? []).length)
  const tenantOrganizations = snapshot.organizations.filter((organization) => organization.organizationType !== 'PLATFORM_OPERATOR' && organization.systemKey === null)
  const ownerCounts = tenantOrganizations.map((organization) => snapshot.memberships.filter((membership) => membership.organizationId === organization.id && membership.role === 'OWNER' && membership.status === 'ACTIVE' && usersById.get(membership.userId)?.status === 'ACTIVE').length)
  const membershipsByStatus = Object.fromEntries(['ACTIVE', 'INVITED', 'REMOVED', 'SUSPENDED'].map((status) => [status, snapshot.memberships.filter((membership) => membership.status === status).length]))

  const summary: PreflightSummary = {
    totalUsers: snapshot.users.length,
    activeUsers: snapshot.users.filter((user) => user.status === 'ACTIVE').length,
    blockedUsers: snapshot.users.filter((user) => user.status === 'BLOCKED').length,
    archivedUsers: snapshot.users.filter((user) => user.status === 'ARCHIVED').length,
    invitedUsers: snapshot.users.filter((user) => user.status === 'INVITED').length,
    totalOrganizations: snapshot.organizations.length,
    activeOrganizations: snapshot.organizations.filter((organization) => organization.status === 'ACTIVE').length,
    totalMemberships: snapshot.memberships.length,
    membershipsByStatus,
    usersWithZeroMemberships: membershipCounts.filter((count) => count === 0).length,
    usersWithExactlyOneMembership: membershipCounts.filter((count) => count === 1).length,
    usersWithMultipleMemberships: membershipCounts.filter((count) => count > 1).length,
    organizationsWithoutActiveOwner: ownerCounts.filter((count) => count === 0).length,
    organizationsWithExactlyOneActiveOwner: ownerCounts.filter((count) => count === 1).length,
    organizationsWithMultipleActiveOwners: ownerCounts.filter((count) => count > 1).length,
    platformPermissionAccounts: permissionUsers.size,
    blockerCount: sortedFindings.filter((finding) => finding.severity === 'BLOCKER').length,
    warningCount: sortedFindings.filter((finding) => finding.severity === 'WARNING').length,
    infoCount: sortedFindings.filter((finding) => finding.severity === 'INFO').length,
    manualReviewCount: sortedFindings.filter((finding) => finding.manualReview).length,
  }

  const report: PreflightReport = {
    reportVersion: REPORT_VERSION,
    generatedAt: metadata.generatedAt,
    metadata: { databaseEnvironment: metadata.databaseEnvironment, git: metadata.git, redacted: metadata.redacted },
    summary,
    findings: sortedFindings,
    blockers: sortedFindings.filter((finding) => finding.severity === 'BLOCKER'),
    warnings: sortedFindings.filter((finding) => finding.severity === 'WARNING'),
    manualReview: sortedFindings.filter((finding) => finding.manualReview),
    architectureDeviations: [
      'OrganizationMembership is alleen uniek op (userId, organizationId), niet op userId.',
      'De applicatie gebruikt workmatchr.activeOrganization en ondersteunt organisatiewisseling.',
      'User.email is verplicht en databasebreed hoofdlettergevoelig uniek.',
      'Toekomstige registratie- en uitnodigingsflows schrijven createdByUserId en provisioningevents nog niet atomair.',
      'Reviewer en approver hebben nog geen afdwingbare membership bij een technisch gemarkeerde WorkMatchr-beheerorganisatie.',
      'AUDITOR bestaat als providerpermission en nog niet als afzonderlijk volledig uitgewerkt platformaccountmodel.',
      'Better Auth Accounts, Sessions en Verifications bestaan, maar accountbrede intrekkings- en e-mailvrijgavecontracten zijn nog niet vastgelegd.',
    ],
    declaration: 'Deze preflight heeft uitsluitend leesqueries uitgevoerd binnen een PostgreSQL READ ONLY-transactie. Er zijn geen data, schema’s, authrecords of productstatussen gewijzigd.',
  }
  return metadata.redacted ? redactReport(report) : report
}

function redactEmail(value: string): string {
  return `[REDACTED:${createHash('sha256').update(normalizeEmail(value)).digest('hex').slice(0, 12)}]`
}

function redactUnknown(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) return value.map((item) => redactUnknown(item, key))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, redactUnknown(childValue, childKey)]))
  }
  if (typeof value === 'string' && /email/i.test(key)) return redactEmail(value)
  if (typeof value === 'string' && /displayName/i.test(key)) return '[REDACTED]'
  return value
}

export function redactReport(report: PreflightReport): PreflightReport {
  return redactUnknown(report) as PreflightReport
}

export function stableJson(report: PreflightReport): string {
  return `${JSON.stringify(report, null, 2)}\n`
}

function markdownEscape(value: unknown): string {
  return String(value ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ')
}

export function renderMarkdown(report: PreflightReport): string {
  const lines = [
    '# ADR-013 accountarchitectuur-preflight',
    '',
    `- Rapportversie: \`${report.reportVersion}\``,
    `- Uitgevoerd: ${report.generatedAt}`,
    `- Omgeving: ${report.metadata.databaseEnvironment.hostType}, databasefingerprint \`${report.metadata.databaseEnvironment.databaseFingerprint}\`, schema \`${report.metadata.databaseEnvironment.schema}\``,
    `- Git-commit: ${report.metadata.git.commit ?? 'onbekend'}`,
    `- Werkmap gewijzigd: ${report.metadata.git.dirty ? `ja (${report.metadata.git.changedPathCount} paden)` : 'nee'}`,
    `- Redacted: ${report.metadata.redacted ? 'ja' : 'nee'}`,
    '',
    '> Privacywaarschuwing: dit lokale rapport kan interne identifiers en, zonder `--redacted`, persoonsgegevens bevatten. Het rapport wordt door `.gitignore` uitgesloten en mag niet worden gecommit.',
    '',
    '## Verklaring',
    '',
    report.declaration,
    '',
    '## Samenvatting',
    '',
    '| Kengetal | Aantal |',
    '| --- | ---: |',
    ...Object.entries(report.summary).map(([key, value]) => `| ${markdownEscape(key)} | ${markdownEscape(typeof value === 'object' ? JSON.stringify(value) : value)} |`),
    '',
    '## Inventarisatie A–K',
    '',
    '### A. Algemene aantallen',
    '',
    'De volledige tellingen, inclusief membershipstatussen en OWNER-verdeling, staan in de samenvatting hierboven.',
    '',
    '### B. Multi-memberships',
    '',
    ...renderFindingTable(findingsInCategories(report, ['MULTI_MEMBERSHIP'])),
    '',
    '### C. Gebruikers zonder organisatie',
    '',
    ...renderFindingTable(findingsInCategories(report, ['ZERO_MEMBERSHIP', 'MEMBERSHIP_STATUS'])),
    '',
    '### D. Platformrollen',
    '',
    ...renderFindingTable(findingsInCategories(report, ['PLATFORM_ROLE'])),
    '',
    '### E. OWNER-risico’s',
    '',
    ...renderFindingTable(findingsInCategories(report, ['OWNER_RISK'])),
    '',
    '### F. Accountaanmaak en provisioning',
    '',
    ...renderFindingTable(findingsInCategories(report, ['PROVISIONING'])),
    '',
    '### G. ARCHIVED en overige accountstatussen',
    '',
    ...renderFindingTable(findingsInCategories(report, ['ARCHIVED_ACCOUNT'])),
    '',
    '### H. E-mailanalyse',
    '',
    ...renderFindingTable(findingsInCategories(report, ['EMAIL'])),
    '',
    '### I. Better Auth-consistentie',
    '',
    ...renderFindingTable(findingsInCategories(report, ['BETTER_AUTH'])),
    '',
    '### J. Referentiële integriteit',
    '',
    ...renderFindingTable(findingsInCategories(report, ['REFERENTIAL_INTEGRITY'])),
    '',
    '### K. Tenantisolatie-indicatoren',
    '',
    ...renderFindingTable(findingsInCategories(report, ['TENANT_ISOLATION_STATIC', 'MULTI_MEMBERSHIP', 'MEMBERSHIP_STATUS'])),
    '',
    '## Afwijkingen van ADR-013',
    '',
    ...report.architectureDeviations.map((item) => `- ${item}`),
    '',
    '## Blockers',
    '',
    ...renderFindingTable(report.blockers),
    '',
    '## Waarschuwingen',
    '',
    ...renderFindingTable(report.warnings),
    '',
    '## Alle bevindingen per categorie',
    '',
  ]
  const categories = [...new Set(report.findings.map((finding) => finding.category))].sort()
  for (const category of categories) {
    lines.push(`### ${category}`, '', ...renderFindingTable(report.findings.filter((finding) => finding.category === category)), '')
  }
  lines.push(
    '## Handmatige afhandeling',
    '',
    '1. Bevestig iedere BLOCKER en leg een eigenaar vast.',
    '2. Behandel multi-memberships zonder automatische organisatiewinnaar.',
    '3. Classificeer platformactoren, ARCHIVED-accounts en ontbrekende provisioningactoren handmatig.',
    '4. Draai de preflight opnieuw na iedere handmatige correctieronde.',
    '5. Start Fase 1 pas na expliciete acceptatie en nul onbekende conflictklassen.',
    '',
    '## Geen migratie',
    '',
    'Deze preflight voert geen Prisma-migratie, datamutatie, sessie-intrekking, accountmapping of statuswijziging uit.',
    '',
  )
  return `${lines.join('\n')}\n`
}

function findingsInCategories(report: PreflightReport, categories: string[]): Finding[] {
  return report.findings.filter((finding) => categories.includes(finding.category))
}

function renderFindingTable(findings: Finding[]): string[] {
  if (findings.length === 0) return ['Geen bevindingen.']
  return [
    '| Ernst | Code | Entiteit | Beschrijving | Aanbevolen actie |',
    '| --- | --- | --- | --- | --- |',
    ...findings.map((finding) => `| ${finding.severity} | \`${finding.code}\` | ${markdownEscape(`${finding.entityType}:${finding.entityId ?? 'n.v.t.'}`)} | ${markdownEscape(finding.description)} | ${markdownEscape(finding.recommendedAction)} |`),
  ]
}

export function databaseEnvironmentFromUrl(connectionString: string): ReportMetadata['databaseEnvironment'] {
  const url = new URL(connectionString)
  const localHosts = new Set(['localhost', '127.0.0.1', '::1', 'host.docker.internal'])
  return {
    hostType: localHosts.has(url.hostname) ? 'LOCAL' : 'REMOTE',
    databaseFingerprint: createHash('sha256').update(`${url.hostname}:${url.port || '5432'}${url.pathname}`).digest('hex').slice(0, 12),
    schema: url.searchParams.get('schema') ?? 'public',
  }
}

const staticPatterns: Array<{ code: string; expression: RegExp; description: string }> = [
  { code: 'STATIC_ACTIVE_ORGANIZATION_COOKIE', expression: /ACTIVE_ORGANIZATION_COOKIE|workmatchr\.activeOrganization/g, description: 'Bestand gebruikt de actieve-organisatiecookie.' },
  { code: 'STATIC_ORGANIZATION_SWITCH', expression: /switchOrganizationAction|OrganizationSwitcher/g, description: 'Bestand ondersteunt organisatiewisseling.' },
  { code: 'STATIC_MULTI_MEMBERSHIP_QUERY', expression: /organizationMembership\.findMany|memberships\.length|memberships\[0\]/g, description: 'Bestand neemt een collectie memberships of de eerste membership als context aan.' },
  { code: 'STATIC_ADD_ORGANIZATION_ROUTE', expression: /\/organisatie\/nieuw/g, description: 'Bestand verwijst naar de route voor extra organisatieaanmaak.' },
]

export async function scanStaticTenantAssumptions(rootDirectory: string): Promise<StaticIndicator[]> {
  const sourceRoot = path.join(rootDirectory, 'src')
  const files = await listFiles(sourceRoot)
  const indicators: StaticIndicator[] = []
  for (const file of files.filter((item) => /\.(ts|tsx)$/.test(item))) {
    const content = await readFile(file, 'utf8')
    for (const pattern of staticPatterns) {
      const matches = content.match(pattern.expression)?.length ?? 0
      if (matches > 0) {
        indicators.push({ code: pattern.code, file: path.relative(rootDirectory, file).replaceAll('\\', '/'), matches, description: pattern.description })
      }
    }
  }
  return indicators.sort((a, b) => `${a.file}:${a.code}`.localeCompare(`${b.file}:${b.code}`))
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const item = path.join(directory, entry.name)
    return entry.isDirectory() ? listFiles(item) : [item]
  }))
  return nested.flat().sort()
}
