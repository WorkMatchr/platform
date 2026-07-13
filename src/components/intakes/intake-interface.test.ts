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
})
