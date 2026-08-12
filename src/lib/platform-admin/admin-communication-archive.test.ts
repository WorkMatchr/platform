import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('immutable beheercommunicatiearchief', () => {
  it('beschermt communicatie en bezorgpogingen database-side tegen wijzigen en verwijderen', () => {
    const migration = read('prisma/migrations/20260812100000_add_admin_communication_archive/migration.sql')

    expect(migration).toContain('CREATE TABLE "AdminCommunication"')
    expect(migration).toContain('CREATE TABLE "AdminCommunicationDeliveryAttempt"')
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON "AdminCommunication"')
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON "AdminCommunicationDeliveryAttempt"')
    expect(migration).toContain('"AdminCommunicationDeliveryAttempt_communicationId_attemptNumber_key"')
  })

  it('houdt securitymails buiten het inhoudsarchief en archiveert alleen gewone beheercommunicatie', () => {
    const service = read('src/lib/platform-admin/platform-admin-action-service.ts')
    const securityFlow = service.slice(service.indexOf('export async function sendPlatformUserAccessEmail'))

    expect(service).toContain('createAdministrativeCommunication')
    expect(service).toContain("kind: 'ADMINISTRATIVE'")
    expect(securityFlow).not.toContain('createAdministrativeCommunication')
    expect(securityFlow).not.toContain('textSnapshot')
    expect(securityFlow).not.toContain('htmlSnapshot')
  })

  it('presenteert provideracceptatie niet als aflevering en beschermt historische auditregels', () => {
    const detail = read('src/app/platformbeheer/communicatie/[communicationId]/page.tsx')
    const auditRow = read('src/components/platform-admin/platform-admin-audit-row.tsx')

    expect(detail).toContain('Door e-mailprovider geaccepteerd')
    expect(detail).not.toContain('Afgeleverd')
    expect(auditRow).toContain('Berichtinhoud is voor deze historische verzending niet opgeslagen.')
  })
})
