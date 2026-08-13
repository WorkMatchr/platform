import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock(
  '@/lib/advice-dossiers/public-intake-advice-dossier-handoff',
  () => ({
    attachAdviceDossierForCurrentUser: vi.fn(async (draft) => draft),
  }),
)

vi.mock('@/app/adviesdossiers/actions', () => ({
  startAdviceDossierIntakeAction: vi.fn(),
}))

import type { GuidanceOutcome } from '@/lib/guidance/guidance-domain'
import { buildPublicIntakeGuidanceHandoff } from '@/lib/public-intake/public-intake-guidance-handoff'
import { presentPublicIntakeGuidance } from '@/lib/public-intake/public-intake-guidance-presentation'
import {
  AnonymousAdviceSavePanel,
  PublicIntakeGuidanceResult,
} from './public-intake-workspace'

function createOutcome(): GuidanceOutcome {
  const startedAt = new Date('2026-07-27T12:00:00.000Z')
  const handoff = buildPublicIntakeGuidanceHandoff('result-fixture', {
    phase: 'CLARIFYING',
    entryPoint: 'RECOGNIZABLE_REQUEST',
    originalInput: null,
    selectedRequestKey: 'rie_needed',
    flowVersion: 'public-intake/1.0.0',
    currentStep: 'rie_has_employees',
    version: 2,
    startedAt,
    lastInteractionAt: startedAt,
    expiresAt: new Date('2026-10-25T12:00:00.000Z'),
    answers: [
      {
        questionKey: 'rie_has_employees',
        questionVersion: 1,
        answerType: 'BOOLEAN',
        disposition: 'ANSWERED',
        source: 'USER_INPUT',
        version: 1,
        value: true,
      },
    ],
  })

  if (!handoff.outcome) {
    throw new Error('De testfixture moet een complete GuidanceOutcome opleveren.')
  }

  return {
    ...handoff.outcome,
    uncertainties: [
      {
        key: 'EXAMPLE_UNCERTAINTY',
        reason: 'UNCONFIRMED',
        description: 'De gewenste planning is nog niet bevestigd.',
        sourceQuestionKey: null,
        provenance: handoff.outcome.situation.provenance,
      },
    ],
  }
}

describe('GuidanceOutcome-weergave', () => {
  it('toont een complete uitkomst in begrijpelijke producttaal', () => {
    const html = renderToStaticMarkup(
      <PublicIntakeGuidanceResult outcome={createOutcome()} />,
    )

    expect(html).toContain('Uw situatie')
    expect(html).toContain('Wij hebben een RI&amp;E nodig')
    expect(html).toContain('Ons advies')
    expect(html).toContain('Waarom adviseren wij dit?')
    expect(html).toContain('Wat kunt u zelf al doen?')
    expect(html).toContain('Aanbevolen deskundigheid')
    expect(html).toContain('Middelbaar Veiligheidskundige (MVK)')
    expect(html).not.toContain('RI&amp;E-deskundige')
    expect(html).toContain('Relevante kennis en bronnen')
    expect(html).toContain('Moet ik een RI&amp;E hebben?')
    expect(html).toContain('Mogelijke vervolgstappen')
    expect(html).toContain('Nog niet volledig duidelijk')
    expect(html).toContain('De gewenste planning is nog niet bevestigd.')
    expect(html).toContain('Dit WorkMatchr Adviesdossier is gebaseerd')
    expect(html).not.toContain('U moet')
  })

  it('toont anonieme gebruikers een werkend en eerlijk bewaarblok', () => {
    const html = renderToStaticMarkup(<AnonymousAdviceSavePanel />)

    expect(html).toContain('Wilt u dit advies bewaren?')
    expect(html).toContain(
      'Log in met een opdrachtgeveraccount om dit advies op te slaan in Mijn adviesdossiers.',
    )
    expect(html).toContain(
      'href="/inloggen?returnTo=%2Fadvieswijzer"',
    )
    expect(html).toContain('>Inloggen<')
    expect(html).toContain('href="/registreren"')
    expect(html).toContain('>Account aanmaken<')
    expect(html).not.toContain('automatisch')
    expect(html).not.toMatch(/matching|opdracht plaatsen|offerte/i)
  })

  it('toont het anonieme bewaarblok uitsluitend zonder opgeslagen dossier', () => {
    const source = readFileSync(
      join(
        process.cwd(),
        'src/components/public/public-intake-workspace.tsx',
      ),
      'utf8',
    )

    expect(source).toContain(
      'isReadyForSummary && draft.adviceDossier === null',
    )
    expect(source).toContain('isReadyForSummary && draft.adviceDossier &&')
    expect(source).toContain('<AnonymousAdviceSavePanel />')
    expect(source).toContain('<AdviceDossierReadyActions dossierId={draft.adviceDossier.id} />')
  })

  it('toont geen technische codes, versies of provenance', () => {
    const html = renderToStaticMarkup(
      <PublicIntakeGuidanceResult outcome={createOutcome()} />,
    )

    expect(html).not.toContain('KNOWLEDGE_RIE_FOUNDATION')
    expect(html).not.toContain('GUIDANCE_RIE')
    expect(html).not.toContain('guidance-outcome/1.2.0')
    expect(html).not.toContain('guidance-engine/2.1.0')
    expect(html).not.toContain('guidance-rules/1.1.0')
    expect(html).not.toContain('RIE_ADVISOR')
    expect(html).not.toContain('RISK_ASSESSMENT')
    expect(html).not.toContain('provenance')
  })

  it('behoudt de vaste adviesvolgorde zonder downstream-CTA', () => {
    const html = renderToStaticMarkup(
      <PublicIntakeGuidanceResult outcome={createOutcome()} />,
    )
    const sections = [
      'Uw situatie',
      'Ons advies',
      'Waarom adviseren wij dit?',
      'Wat kunt u zelf al doen?',
      'Aanbevolen deskundigheid',
      'Relevante kennis en bronnen',
      'Mogelijke vervolgstappen',
      'Dit WorkMatchr Adviesdossier is gebaseerd',
    ]
    const positions = sections.map((section) => html.indexOf(section))

    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((left, right) => left - right))
    expect(html).not.toContain('Account aanmaken')
    expect(html).not.toContain('Professionals zoeken')
    expect(html).not.toContain('Matching starten')
    expect(html).not.toContain('Offertes ontvangen')
  })

  it('toont onbekende kennis- en bronverwijzingen niet', () => {
    const outcome = createOutcome()

    const presentation = presentPublicIntakeGuidance({
      ...outcome,
      professionalAdvice: {
        ...outcome.professionalAdvice,
        knowledgeReferences: [{ contentId: 'knowledge:onbekend' }],
        sourceReferences: [{ sourceId: 'source:onbekend' }],
      },
    })

    expect(presentation.knowledgeReferences).toEqual([])
    expect(presentation.sourceReferences).toEqual([])
  })

  it('toont primaire, aanvullende en mogelijke deskundigheden met dezelfde prioriteitslabels', () => {
    const outcome = createOutcome()
    const primary =
      outcome.professionalAdvice.primaryProfessionalRequirement!
    const additional = {
      ...primary,
      id: `${primary.id}:additional`,
      professionalType: 'ARBEIDSHYGIENIST' as const,
      priority: 'ADDITIONAL' as const,
      reason: 'Aanvullend relevant voor blootstelling.',
    }
    const possible = {
      ...primary,
      id: `${primary.id}:possible`,
      professionalType: 'MILIEUDESKUNDIGE' as const,
      priority: 'POSSIBLE' as const,
      reason: 'Mogelijk relevant voor vergunningen.',
    }
    const html = renderToStaticMarkup(
      <PublicIntakeGuidanceResult
        outcome={{
          ...outcome,
          professionalAdvice: {
            ...outcome.professionalAdvice,
            additionalProfessionalRequirements: [additional],
            possibleProfessionalRequirements: [possible],
          },
          professionalRequirements: [primary, additional, possible],
        }}
      />,
    )

    expect(html).toContain('Primair')
    expect(html).toContain('Aanvullend')
    expect(html).toContain('Mogelijk')
    expect(html).toContain('Arbeidshygi')
    expect(html).toContain('Milieudeskundige')
    expect(html).not.toContain('overflow-x')
  })
})
