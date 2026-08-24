import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (file: string) => readFileSync(file, 'utf8')

describe('Knowledge Source Upload beheerinterface', () => {
  it('beveiligt pagina en acties server-side voor platformbeheer', () => {
    expect(source('src/app/platformbeheer/kennisbank/bronnen/uploaden/page.tsx')).toContain('requirePlatformAdministrator')
    expect(source('src/app/platformbeheer/kennisbank/bronnen/uploaden/actions.ts').match(/requirePlatformAdministrator/gu)).toHaveLength(6)
    expect(source('src/app/api/knowledge-source-uploads/presign/route.ts')).toContain('requirePlatformAdministrator')
  })

  it('communiceert PDF-limiet, expliciete bevestiging en geen automatische publicatie', () => {
    const page = source('src/app/platformbeheer/kennisbank/bronnen/uploaden/page.tsx')
    const form = source('src/components/platform-admin/knowledge-source-upload-form.tsx')
    expect(page).toContain('Maximaal 10 PDF-bestanden')
    expect(page).toContain('menselijke controle')
    expect(form).toContain('Gecontroleerd importeren als concept')
    expect(form).toContain("accept=\"application/pdf,.pdf\"")
    expect(form).toContain('50 MB per batch')
    expect(form).toContain('KNOWLEDGE_SOURCE_UPLOAD_CONCURRENCY')
    expect(form).toContain('Gezamenlijke analyse')
    expect(form).toContain('Geavanceerde brongegevens')
    expect(form).toContain('Geen openbare URL beschikbaar')
    expect(form).toContain('Koppelen als achtergronddocument')
    expect(form).toContain('Toch als zelfstandige bron')
  })

  it('blijft zonder duurzame object storage fail-closed', () => {
    expect(source('src/lib/knowledge/knowledge-source-upload-storage.ts')).toContain('KnowledgeSourceUploadStorageUnavailableError')
    expect(source('src/app/platformbeheer/kennisbank/bronnen/uploaden/page.tsx')).toContain('Upload nog niet geactiveerd')
  })

  it('levert private broninhoud alleen via een geautoriseerde serverroute', () => {
    const route = source('src/app/platformbeheer/kennisbank/bronnen/[sourceVersionId]/origineel/route.ts')
    expect(route).toContain('requirePlatformAdministrator')
    expect(route).toContain("'Cache-Control': 'private, no-store'")
    expect(route).not.toContain('downloadUrl')
  })
})
