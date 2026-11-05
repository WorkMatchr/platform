import 'server-only'
import type { PrismaClient } from '@/generated/prisma/client'
import migrations from './academy-import-migrations.json'

/** The pinned local acceptance chain is checked before any import writes. */
export async function verifyLocalImportMigrations(db: PrismaClient) {
  const rows = await db.$queryRaw<Array<{ migration_name: string; checksum: string; finished_at: Date | null; rolled_back_at: Date | null }>>`
    SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name`
  if (rows.length !== migrations.length || rows.some((r, i) => r.migration_name !== migrations[i].name
    || !r.finished_at || r.rolled_back_at || !migrations[i].checksums.includes(r.checksum))) throw new Error('ACADEMY_IMPORT_MIGRATION_MISMATCH')
}

/** The import operator is distinct from the migration owner. */
export async function verifyLocalImportRole(db: PrismaClient) {
  const [role] = await db.$queryRaw<Array<{ name: string; elevated: boolean; creates_schema: boolean; owns_table: boolean; can_read: boolean; can_write: boolean }>>`
    SELECT current_user AS name,
      (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR rolreplication) AS elevated,
      has_schema_privilege(current_user,'public','CREATE') AS creates_schema,
      EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='public'::regnamespace AND relowner=(SELECT oid FROM pg_roles WHERE rolname=current_user)) AS owns_table,
      has_table_privilege(current_user,'public."LearningCourse"','SELECT') AS can_read,
      has_table_privilege(current_user,'public."LearningCourse"','INSERT') AS can_write
    FROM pg_roles WHERE rolname=current_user`
  if (!role || role.name !== 'academy_content_editor' || role.elevated || role.creates_schema || role.owns_table || !role.can_read || !role.can_write) throw Error('ACADEMY_IMPORT_ROLE_REFUSED')
}
