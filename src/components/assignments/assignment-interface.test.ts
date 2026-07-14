import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const interfaceFiles = [
  'src/app/hulpvragen/[intakeId]/indienen/page.tsx',
  'src/app/opdrachten/page.tsx',
  'src/app/opdrachten/[assignmentId]/page.tsx',
  'src/app/opdrachten/[assignmentId]/aangemaakt/page.tsx',
  'src/components/assignments/assignment-list.tsx',
  'src/components/assignments/assignment-detail.tsx',
  'src/components/assignments/assignment-edit-form.tsx',
  'src/components/assignments/assignment-status-actions.tsx',
  'src/components/assignments/submit-intake-form.tsx',
]

describe('opdrachtinterfacearchitectuur', () => {
  it('bevat geen directe Prisma- of databasecalls in routes en componenten', async () => {
    const contents = await Promise.all(interfaceFiles.map((file) => readFile(file, 'utf8')))
    for (const content of contents) {
      expect(content).not.toContain('getPrisma')
      expect(content).not.toContain('PrismaClient')
    }
  })

  it('toont waarschuwing, loadingstatus en expliciete bevestiging', async () => {
    const [page, form] = await Promise.all([
      readFile('src/app/hulpvragen/[intakeId]/indienen/page.tsx', 'utf8'),
      readFile('src/components/assignments/submit-intake-form.tsx', 'utf8'),
    ])
    expect(page).toContain('kunnen daarna niet meer worden gewijzigd')
    expect(page).toContain('Terug naar controle')
    expect(form).toContain('Ja, dien mijn hulpvraag in')
    expect(form).toContain('loading={pending}')
  })

  it('toont een passende lege staat en conceptstatus op de succesroute', async () => {
    const [list, success] = await Promise.all([
      readFile('src/components/assignments/assignment-list.tsx', 'utf8'),
      readFile('src/app/opdrachten/[assignmentId]/aangemaakt/page.tsx', 'utf8'),
    ])
    expect(list).toContain('Uw organisatie heeft nog geen opdrachten.')
    expect(list).toContain('Start een nieuwe hulpvraag')
    expect(success).toContain('Conceptopdracht')
    expect(success).not.toContain('aanbieders geselecteerd')
  })

  it('blokkeert indienen bij ontbrekende velden en toont rolafhankelijke controle-informatie', async () => {
    const review = await readFile('src/components/intakes/intake-review.tsx', 'utf8')
    expect(review).toContain('isComplete={intake.progress.isComplete}')
    expect(review).toContain('Hulpvraag indienen')
    expect(review).toContain('eigenaar of beheerder van de organisatie')
  })

  it('behoudt opdrachtformulierwaarden, focust het eerste foutveld en blokkeert latere statussen', async () => {
    const [editForm, statusActions] = await Promise.all([
      readFile('src/components/assignments/assignment-edit-form.tsx', 'utf8'),
      readFile('src/components/assignments/assignment-status-actions.tsx', 'utf8'),
    ])
    expect(editForm).toContain("state.values?.[field]")
    expect(editForm).toContain("[aria-invalid=\"true\"]")
    expect(editForm).not.toContain('name="organizationId"')
    expect(statusActions).toContain("defaultChecked={state.values?.confirmed === 'on'}")
    expect(statusActions).toContain("status !== 'DRAFT' && status !== 'READY_FOR_REVIEW'")
    expect(statusActions).toContain('loading={pending}')
  })
})
