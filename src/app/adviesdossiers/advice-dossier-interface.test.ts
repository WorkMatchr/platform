import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const read = (path: string) =>
  readFileSync(join(root, path), 'utf8')

describe('Adviesdossier-interface en beveiliging', () => {
  it('biedt overzicht, lege staat, detail en PDF-download', () => {
    const overview = read('src/app/adviesdossiers/page.tsx')
    const detail = read(
      'src/app/adviesdossiers/[dossierId]/page.tsx',
    )
    expect(overview).toContain('Adviesdossiers')
    expect(overview).toContain('Nog geen adviesdossiers')
    expect(overview).toContain('Bekijken')
    expect(detail).toContain('Download als PDF')
    expect(detail).toContain('Terug naar adviesdossiers')
  })

  it('controleert server-side toegang voor pagina en PDF', () => {
    const page = read(
      'src/app/adviesdossiers/[dossierId]/page.tsx',
    )
    const route = read(
      'src/app/adviesdossiers/[dossierId]/pdf/route.ts',
    )
    expect(page).toContain('getAdviceDossierViewer')
    expect(page).toContain('getAdviceDossier')
    expect(route).toContain('getOptionalAdviceDossierViewer')
    expect(route).toContain('getAdviceDossier')
    expect(route).toContain("'Cache-Control': 'private, no-store'")
    expect(route).toContain("'X-Robots-Tag': 'noindex")
  })

  it('activeert geen matching of directe professionalkeuze', () => {
    const all = [
      read('src/app/adviesdossiers/page.tsx'),
      read('src/app/adviesdossiers/[dossierId]/page.tsx'),
      read(
        'src/components/advice-dossiers/advice-dossier-detail.tsx',
      ),
    ].join('\n')
    expect(all).not.toContain('Zoek een specialist')
    expect(all).not.toContain('Bekijk professionals')
    expect(all).not.toContain('Vraag offerte aan')
  })

  it('start vanuit een gereed dossier uitsluitend de bestaande opdrachtintake', () => {
    const detail = read('src/app/adviesdossiers/[dossierId]/page.tsx')
    expect(detail).toContain('Maak hiervan een opdracht')
    expect(detail).toContain('startAdviceDossierIntakeAction')
    expect(detail).not.toContain('/aanvragen/nieuw?dossierId=')
  })
})
