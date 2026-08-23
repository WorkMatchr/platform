import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = (file: string) => readFileSync(file, 'utf8')

describe('Knowledge Source Upload beheerinterface', () => {
  it('beveiligt pagina en acties server-side voor platformbeheer', () => {
    expect(source('src/app/platformbeheer/kennisbank/bronnen/uploaden/page.tsx')).toContain('requirePlatformAdministrator')
    expect(source('src/app/platformbeheer/kennisbank/bronnen/uploaden/actions.ts').match(/requirePlatformAdministrator/gu)).toHaveLength(3)
  })

  it('communiceert PDF-limiet, expliciete bevestiging en geen automatische publicatie', () => {
    const page = source('src/app/platformbeheer/kennisbank/bronnen/uploaden/page.tsx')
    const form = source('src/components/platform-admin/knowledge-source-upload-form.tsx')
    expect(page).toContain('PDF-bestanden tot 10 MB')
    expect(page).toContain('publiceert nooit automatisch')
    expect(form).toContain('Gecontroleerd importeren als concept')
    expect(form).toContain("accept=\"application/pdf,.pdf\"")
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
