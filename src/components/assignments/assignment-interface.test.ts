import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const interfaceFiles = [
  'src/app/hulpvragen/[intakeId]/indienen/page.tsx',
  'src/app/opdrachten/page.tsx',
  'src/app/opdrachten/[assignmentId]/page.tsx',
  'src/app/opdrachten/[assignmentId]/aangemaakt/page.tsx',
  'src/app/opdrachten/[assignmentId]/publiceren/page.tsx',
  'src/components/assignments/assignment-list.tsx',
  'src/components/assignments/assignment-detail.tsx',
  'src/components/assignments/assignment-edit-form.tsx',
  'src/components/assignments/assignment-status-actions.tsx',
  'src/components/assignments/assignment-publication-actions.tsx',
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

  it('maakt publicatie expliciet en activeert geen toekomstige domeinen', async () => {
    const [page, form, detail] = await Promise.all([
      readFile('src/app/opdrachten/[assignmentId]/publiceren/page.tsx', 'utf8'),
      readFile('src/components/assignments/assignment-publication-actions.tsx', 'utf8'),
      readFile('src/components/assignments/assignment-detail.tsx', 'utf8'),
    ])
    expect(page).toContain('Publicatie controleren')
    expect(page).toContain('De opdracht wordt nog niet aan aanbieders getoond.')
    expect(page).toContain('Matching, credits en betalingen starten niet.')
    expect(form).toContain('Opdracht publiceren')
    expect(form).toContain('Publicatie intrekken')
    expect(form).toContain('loading={pending}')
    expect(form).toContain('[aria-invalid="true"]')
    expect(form).not.toContain('name="organizationId"')
    expect(detail).toContain('Gereed voor marktverwerking')

    const combined = `${page}\n${form}`
    expect(combined).not.toContain('AssignmentProviderSelection')
    expect(combined).not.toContain('CreditTransaction')
    expect(combined).not.toContain('Mollie')
  })

  it('publiceert vanaf het controleoverzicht in één gebruikershandeling zonder concepttussenpagina', async () => {
    const [page, controlPage, form, review, actions] = await Promise.all([
      readFile('src/app/hulpvragen/[intakeId]/indienen/page.tsx', 'utf8'),
      readFile('src/app/hulpvragen/[intakeId]/controle/page.tsx', 'utf8'),
      readFile('src/components/assignments/submit-intake-form.tsx', 'utf8'),
      readFile('src/components/intakes/intake-review.tsx', 'utf8'),
      readFile('src/app/opdrachten/actions.ts', 'utf8'),
    ])
    expect(page).toContain('redirect(`/hulpvragen/${intakeId}/controle`)')
    expect(page).not.toContain('Controleer uw bevestiging')
    expect(controlPage).toContain('Opdracht controleren')
    expect(controlPage).toContain('publishIntakeAction')
    expect(form).toContain('Opdracht publiceren')
    expect(form).not.toContain('Hulpvraag indienen')
    expect(form).not.toContain('name="confirmed"')
    expect(form).toContain('loading={pending}')
    expect(form).toContain('disabled={!readiness.isReady}')
    expect(review).toContain('Na publicatie kan WorkMatchr passende professionals selecteren.')
    expect(review).toContain('Uw opdracht kan nog niet worden gepubliceerd')
    expect(review).toContain('issue.editHref')
    expect(review).toContain('?wijzig=1')
    expect(review).not.toContain('Conceptopdracht')
    expect(review).not.toContain('Concept bewerken')
    expect(actions).toContain('publishIntakeAsAssignment')
    expect(actions).toContain('?status=gepubliceerd')
    expect(review).not.toContain('Intake gereedmelden')
    expect(review).not.toContain('Gereed voor controle')
  })

  it('toont een passende lege staat en conceptstatus op de succesroute', async () => {
    const [list, success] = await Promise.all([
      readFile('src/components/assignments/assignment-list.tsx', 'utf8'),
      readFile('src/app/opdrachten/[assignmentId]/aangemaakt/page.tsx', 'utf8'),
    ])
    expect(list).toContain('Uw organisatie heeft nog geen opdrachten.')
    expect(list).toContain('Start een nieuwe opdracht')
    expect(success).toContain('Uw opdracht is aangemaakt')
    expect(success).not.toContain('Conceptopdracht')
    expect(success).not.toContain('aanbieders geselecteerd')
  })

  it('blokkeert indienen bij ontbrekende velden en toont rolafhankelijke controle-informatie', async () => {
    const review = await readFile('src/components/intakes/intake-review.tsx', 'utf8')
    expect(review).toContain('readiness.isReady')
    expect(review).toContain('Opdracht publiceren')
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
    expect(statusActions).toContain('Concept bewerken')
    expect(statusActions).toContain('Opdracht publiceren')
    expect(statusActions).toContain('Opdracht annuleren')
    expect(statusActions).not.toContain('Gereed voor controle')
  })

  it('laat een concept direct via de afzonderlijke bewuste publicatiestap publiceren', async () => {
    const page = await readFile('src/app/opdrachten/[assignmentId]/publiceren/page.tsx', 'utf8')
    expect(page).toContain("assignment.status !== 'DRAFT' && assignment.status !== 'READY_FOR_REVIEW'")
    expect(page).toContain('Na publicatie kan WorkMatchr passende professionals selecteren.')
  })
})
