import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('platformbeheeracties en communicatie', () => {
  it('biedt een centraal actiecentrum met alle afgesproken statussen en een deeplink', () => {
    const page = read('src/app/platformbeheer/actiecentrum/page.tsx')
    const navigation = read('src/lib/platform-admin/platform-admin-navigation.ts')

    expect(navigation).toContain("label: 'Actiecentrum'")
    expect(page).toContain('Open beheeracties')
    expect(page).toContain('Verantwoordelijke:')
    expect(page).toContain('action.href')
    expect(page).toContain('PlatformSignalStatusForm')
  })

  it('biedt gebruikers afzonderlijke communicatie- en lifecycleacties', () => {
    const page = read('src/app/platformbeheer/gebruikers/[userId]/page.tsx')
    const actions = read('src/components/platform-admin/platform-admin-actions.tsx')

    expect(page).toContain('PlatformAdminEmailForm')
    expect(page).toContain('PlatformUserAccessActions')
    expect(page).toContain('PlatformAdminNoteForm')
    expect(actions).toContain('Activatiemail opnieuw versturen')
    expect(actions).toContain('Verificatiemail opnieuw versturen')
    expect(actions).toContain('Wachtwoordreset versturen')
    expect(actions).toContain('Interne beheernotitie')
    expect(page).not.toContain('Tweestapsverificatie')
    expect(actions).not.toContain('Tweestapsverificatie')
  })

  it('biedt organisatie-, opdracht-, reviewer- en approveracties zonder vier-ogenregel te wijzigen', () => {
    const organization = read('src/app/platformbeheer/organisaties/[organizationId]/page.tsx')
    const organizationUsers = read('src/components/platform-admin/platform-organization-users.tsx')
    const assignment = read('src/app/platformbeheer/opdrachten/[assignmentId]/page.tsx')
    const workload = read('src/components/platform-admin/platform-role-workload.tsx')

    expect(organization).toContain('Organisatie mailen')
    expect(organizationUsers).toContain('Eigenaar aanwijzen')
    expect(assignment).toContain('Opdrachtgever mailen')
    expect(assignment).toContain('Dienstverlener mailen')
    expect(assignment).toContain('Signaal markeren als onderzocht')
    expect(workload).toContain('mailen')
    expect(workload).toContain('Open dossier')
    expect(workload).toContain('vier-ogenregel blijft ongewijzigd')
  })

  it('laat UI-componenten alle mutaties via Server Actions uitvoeren', () => {
    const component = read('src/components/platform-admin/platform-admin-actions.tsx')
    const pages = [
      'src/app/platformbeheer/actiecentrum/page.tsx',
      'src/app/platformbeheer/gebruikers/[userId]/page.tsx',
      'src/app/platformbeheer/organisaties/[organizationId]/page.tsx',
      'src/app/platformbeheer/opdrachten/[assignmentId]/page.tsx',
    ].map(read).join('\n')

    expect(component).not.toContain('@/lib/prisma')
    expect(pages).not.toContain('@/lib/prisma')
    expect(component).toContain('action={sendPlatformAdminEmailAction}')
    expect(component).toContain('action={addPlatformAdminNoteAction}')
  })
})
