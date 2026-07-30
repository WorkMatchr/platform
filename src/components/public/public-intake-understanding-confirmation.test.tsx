import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock(
  '@/lib/advice-dossiers/public-intake-advice-dossier-handoff',
  () => ({
    attachAdviceDossierForCurrentUser: vi.fn(async (draft) => draft),
  }),
)

import { buildPublicIntakeGuidanceHandoff } from '@/lib/public-intake/public-intake-guidance-handoff'
import type { PublicIntakeDraftView } from '@/lib/public-intake/public-intake-types'
import { PublicIntakeWorkspace } from './public-intake-workspace'

function createDraft(
  overrides: Partial<PublicIntakeDraftView> = {},
): PublicIntakeDraftView {
  const startedAt = new Date('2026-07-29T12:00:00.000Z')
  const base = {
    phase: 'STARTED' as const,
    entryPoint: 'FREE_TEXT' as const,
    originalInput:
      'De stoel van een vrachtwagenchauffeur zit niet goed en veroorzaakt lichamelijke klachten.',
    selectedRequestKey: null,
    flowVersion: 'public-intake/1.0.0',
    currentStep: 'start',
    version: 1,
    startedAt,
    lastInteractionAt: startedAt,
    expiresAt: new Date('2026-10-27T12:00:00.000Z'),
    answers: [],
  }

  return {
    ...base,
    guidance: buildPublicIntakeGuidanceHandoff(
      'fictieve-begripsbevestiging',
      base,
    ),
    aiClassification: {
      summary:
        'U wilt weten welke gevolgen een onvoldoende geveerde chauffeursstoel kan hebben voor de gezondheid en fysieke belasting van een vrachtwagenchauffeur.',
      primarySubject: 'OCCUPATIONAL_HEALTH',
      secondarySubjects: [],
      confidence: 'HIGH',
      alternatives: [],
    },
    ...overrides,
  }
}

describe('begripsbevestiging in de publieke intake', () => {
  it('toont hulpvraag, AI-samenvatting, onderwerp en beide bevestigingsacties', () => {
    const html = renderToStaticMarkup(
      <PublicIntakeWorkspace initialDraft={createDraft()} onRestart={() => undefined} />,
    )

    expect(html).toContain('Uw hulpvraag')
    expect(html).not.toContain('Uw situatie:')
    expect(
      html.match(
        /De stoel van een vrachtwagenchauffeur zit niet goed en veroorzaakt lichamelijke klachten\./g,
      ),
    ).toHaveLength(1)
    expect(html).toContain('Als wij u goed begrijpen...')
    expect(html).toContain(
      'U wilt weten welke gevolgen een onvoldoende geveerde chauffeursstoel kan hebben voor de gezondheid en fysieke belasting van een vrachtwagenchauffeur.',
    )
    expect(html).toContain(
      'Dit lijkt ons het belangrijkste onderwerp van uw vraag:',
    )
    expect(html).toContain('Gezondheid en fysieke belasting')
    expect(html).toContain('Klopt dat?')
    expect(html).toContain('Ja, dat klopt')
    expect(html).toContain('Nee, ik bedoel iets anders')
    expect(html).not.toContain('Waar gaat uw vraag vooral over?')
    expect(html).not.toContain('OCCUPATIONAL_HEALTH')
  })

  it.each([
    {
      label: 'lage confidence',
      aiClassification: {
        summary: 'De ondernemer stelt een vraag over de werksituatie.',
        primarySubject: 'OCCUPATIONAL_HEALTH' as const,
        secondarySubjects: [],
        confidence: 'LOW' as const,
        alternatives: [],
      },
    },
    {
      label: 'onbekend onderwerp',
      aiClassification: {
        summary: 'De ondernemer stelt een vraag over de werksituatie.',
        primarySubject: 'UNKNOWN' as const,
        secondarySubjects: [],
        confidence: 'HIGH' as const,
        alternatives: [],
      },
    },
    {
      label: 'ontbrekende classificatie',
      aiClassification: null,
    },
  ])('valt bij $label rechtstreeks terug op de veilige onderwerpkeuze', ({
    aiClassification,
  }) => {
    const html = renderToStaticMarkup(
      <PublicIntakeWorkspace
        initialDraft={createDraft({ aiClassification })}
        onRestart={() => undefined}
      />,
    )

    expect(html).toContain('Waar gaat uw vraag vooral over?')
    expect(html).not.toContain('Als wij U goed begrijpen...')
  })
})
