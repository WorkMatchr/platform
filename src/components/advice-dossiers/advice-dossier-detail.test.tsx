import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { adviceDossierSnapshotFixture } from '@/lib/advice-dossiers/advice-dossier-contract.test'
import { AdviceDossierDetail } from './advice-dossier-detail'

describe('WorkMatchr Adviesdossier-detail', () => {
  it('toont de immutable snapshot in de verplichte volgorde', () => {
    const html = renderToStaticMarkup(
      <AdviceDossierDetail
        dossierCode="WM-2026-000001"
        createdAt={new Date('2026-07-29T12:00:00Z')}
        versionNumber={1}
        status="ADVICE_READY"
        snapshot={adviceDossierSnapshotFixture}
      />,
    )
    const labels = [
      'WorkMatchr Adviesdossier',
      'WM-2026-000001',
      'Adviesversie',
      'Oorspronkelijke hulpvraag',
      'Dit begrijpen wij van uw situatie',
      'Ons advies',
      'Waarom adviseren wij dit?',
      'Wat kunt u zelf al doen?',
      'Aanbevolen deskundigheid',
      'Relevante kennis en bronnen',
      'Mogelijke vervolgstappen',
      'Dit WorkMatchr Adviesdossier is gebaseerd',
    ]
    const positions = labels.map((label) => html.indexOf(label))

    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual(
      [...positions].sort((left, right) => left - right),
    )
    expect(html).toContain('BHV-adviseur')
    expect(html).toContain(
      adviceDossierSnapshotFixture.originalHelpRequest,
    )
    expect(html).toContain(adviceDossierSnapshotFixture.situationSummary)
    expect(adviceDossierSnapshotFixture.originalHelpRequest).not.toBe(
      adviceDossierSnapshotFixture.situationSummary,
    )
    expect(html).not.toContain('Zoek een specialist')
    expect(html).not.toContain('Start opdracht')
    expect(html).not.toContain('Vraag offerte aan')
  })

  it('toont alle opgeslagen deskundigheidsprioriteiten zonder horizontale tabel', () => {
    const html = renderToStaticMarkup(
      <AdviceDossierDetail
        dossierCode="WM-2026-000002"
        createdAt={new Date('2026-07-29T12:00:00Z')}
        versionNumber={1}
        status="ADVICE_READY"
        snapshot={{
          ...adviceDossierSnapshotFixture,
          additionalProfessionalRequirements: [
            {
              label: 'Arbeidshygiënist',
              priority: 'ADDITIONAL',
              reason: 'Aanvullend voor blootstelling.',
              expertise: ['Blootstellingsbeoordeling'],
              capabilityCodes: ['SAFETY_ADVICE'],
            },
          ],
          possibleProfessionalRequirements: [
            {
              label: 'Milieudeskundige',
              priority: 'POSSIBLE',
              reason: 'Mogelijk voor vergunningen.',
              expertise: ['Omgevingswet'],
              capabilityCodes: ['SAFETY_ADVICE'],
            },
          ],
        }}
      />,
    )

    expect(html).toContain('Primair')
    expect(html).toContain('Aanvullend')
    expect(html).toContain('Mogelijk')
    expect(html).toContain('Arbeidshygi')
    expect(html).toContain('Milieudeskundige')
    expect(html).not.toContain('<table')
  })

  it('plaatst de opdrachtstart als rustige vervolgstap wanneer die beschikbaar is', () => {
    const html = renderToStaticMarkup(
      <AdviceDossierDetail
        dossierCode="WM-2026-000003"
        createdAt={new Date('2026-07-29T12:00:00Z')}
        versionNumber={1}
        status="ADVICE_READY"
        snapshot={adviceDossierSnapshotFixture}
        assignmentIntakeAction={<button type="submit">Maak hiervan een opdracht</button>}
      />,
    )

    expect(html).toContain('Professionele ondersteuning nodig?')
    expect(html).toContain('Maak hiervan een opdracht')
    expect(html.indexOf('Mogelijke vervolgstappen')).toBeLessThan(
      html.indexOf('Professionele ondersteuning nodig?'),
    )
  })
})
