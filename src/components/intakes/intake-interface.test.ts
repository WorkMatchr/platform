import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const interfaceFiles = [
  'src/app/hulpvragen/page.tsx',
  'src/app/hulpvragen/nieuw/page.tsx',
  'src/app/hulpvragen/[intakeId]/page.tsx',
  'src/app/hulpvragen/[intakeId]/[category]/page.tsx',
  'src/app/hulpvragen/[intakeId]/controle/page.tsx',
  'src/components/intakes/intake-start-form.tsx',
  'src/components/intakes/intake-step-form.tsx',
  'src/components/intakes/intake-question-field.tsx',
  'src/components/intakes/intake-review.tsx',
]

describe('intake-interfacearchitectuur', () => {
  it('bevat geen directe Prisma- of databasecalls in routes en componenten', async () => {
    const contents = await Promise.all(interfaceFiles.map((file) => readFile(file, 'utf8')))
    for (const content of contents) {
      expect(content).not.toContain('getPrisma')
      expect(content).not.toContain('PrismaClient')
    }
  })

  it('koppelt alle invoervelden toegankelijk aan labels en veldfouten', async () => {
    const content = await readFile('src/components/intakes/intake-question-field.tsx', 'utf8')
    expect(content).toContain('aria-invalid')
    expect(content).toContain('aria-describedby')
    expect(content).toContain('FieldError')
    expect(content).toContain('<legend')
  })

  it('houdt conditionele stapvelden in hetzelfde formulier en schakelt verborgen velden uit', async () => {
    const content = await readFile('src/components/intakes/intake-step-form.tsx', 'utf8')
    expect(content).toContain('isCatalogQuestionVisible')
    expect(content).toContain('initialVisibilityAnswers')
    expect(content).toContain('createIntakeStepAnswerLookup')
    expect(content).toContain('hidden={!visible}')
    expect(content).toContain('disabled={!visible}')
    expect(content).toContain("querySelector<HTMLElement>('[aria-invalid=\"true\"], [data-invalid=\"true\"]')?.focus()")
  })

  it('toont bij een lege of niet-zichtbare vraagset een herstelbare categoriefout', async () => {
    const content = await readFile('src/app/hulpvragen/[intakeId]/[category]/page.tsx', 'utf8')
    expect(content).toContain('De vragen voor deze categorie konden niet worden geladen.')
    expect(content).toContain('Terug naar categoriekeuze')
    expect(content).toContain('visibleQuestions.length === 0')
  })

  it('behoudt de bewerkcontext zodat opslaan terugkeert naar het controleoverzicht', async () => {
    const [page, form, actions] = await Promise.all([
      readFile('src/app/hulpvragen/[intakeId]/[category]/page.tsx', 'utf8'),
      readFile('src/components/intakes/intake-step-form.tsx', 'utf8'),
      readFile('src/app/hulpvragen/actions.ts', 'utf8'),
    ])
    expect(page).toContain("query.wijzig === '1'")
    expect(form).toContain('name="returnToReview"')
    expect(actions).toContain('/controle?opgeslagen=1')
  })
})
