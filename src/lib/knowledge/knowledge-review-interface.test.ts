import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8')
}

describe('Knowledge Control-beheerinterface', () => {
  it('gebruikt begrijpelijke Nederlandse beheerterminologie', () => {
    const dashboard = source('src/app/platformbeheer/kennisbank/page.tsx')
    expect(dashboard).toContain('Conceptkennis')
    expect(dashboard).toContain('Uitzonderingen')
    expect(dashboard).toContain('Inhoudelijke meldingen')
    expect(dashboard).toContain('Bronconflicten')
    expect(dashboard).toContain('Historische interne kennis')
    expect(dashboard).not.toContain('label="Te controleren"')
    expect(dashboard).not.toContain('Kandidaat-claims')
    expect(dashboard).not.toContain('Open reviews')
  })

  it('beveiligt overzicht en detail met bestaande platformbeheerautorisatie', () => {
    const overview = source('src/app/platformbeheer/kennisbank/beoordelingen/page.tsx')
    const detail = source('src/app/platformbeheer/kennisbank/beoordelingen/[reviewTaskId]/page.tsx')
    expect(overview).toContain('requirePlatformAdministrator')
    expect(detail).toContain('requirePlatformAdministrator')
  })

  it('biedt filters, sortering en een duidelijke controleactie', () => {
    const overview = source('src/app/platformbeheer/kennisbank/beoordelingen/page.tsx')
    for (const label of ['Bron', 'Onderwerp', 'Soort kennis', 'Prioriteit', 'Controlestatus', 'Validatiestatus', 'Publicatiestatus', 'Sortering']) {
      expect(overview).toContain(label)
    }
    expect(overview).toContain('>Beoordelen</Link>')
  })

  it('legt de scheiding tussen broncontrole, situatieadvies en publicatie expliciet uit', () => {
    const detail = source('src/app/platformbeheer/kennisbank/beoordelingen/[reviewTaskId]/page.tsx')
    const form = source('src/components/platform-admin/knowledge-review-forms.tsx')
    expect(detail).toContain('Waarom uw aandacht nodig is')
    expect(detail).toContain('Geen enkele afhandeling publiceert dit kennisitem automatisch.')
    expect(form).toContain('Uitzondering afhandelen')
    expect(form).toContain('Dit publiceert niets automatisch.')
    expect(form).not.toContain('Inhoudelijk goedkeuren')
    expect(form).not.toContain('Voorgestelde WorkMatchr-formulering')
    expect(form).not.toContain('Voorgestelde doelgroep')
  })

  it('begrensd bronweergave en gebruikt toegankelijke formulieren en bevestigingen', () => {
    const detail = source('src/app/platformbeheer/kennisbank/beoordelingen/[reviewTaskId]/page.tsx')
    const form = source('src/components/platform-admin/knowledge-review-forms.tsx')
    expect(detail).toContain('formatKnowledgeInternalExcerpt')
    expect(detail).not.toContain('<iframe')
    expect(form).toContain('htmlFor=')
    expect(form).toContain('aria-live="polite"')
    expect(form).toContain('window.confirm')
    expect(form).not.toContain('tabIndex={-1}')
  })
})
