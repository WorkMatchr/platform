import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { GuidanceOutcome } from '@/lib/guidance/guidance-domain'
import { buildPublicIntakeGuidanceHandoff } from '@/lib/public-intake/public-intake-guidance-handoff'
import { presentPublicIntakeGuidance } from '@/lib/public-intake/public-intake-guidance-presentation'
import { PublicIntakeGuidanceResult } from './public-intake-workspace'

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
    expect(html).toContain('RI&amp;E-deskundige')
    expect(html).toContain('Relevante kennis en bronnen')
    expect(html).toContain('Moet ik een RI&amp;E hebben?')
    expect(html).toContain('Mogelijke vervolgstappen')
    expect(html).toContain('Nog niet volledig duidelijk')
    expect(html).toContain('De gewenste planning is nog niet bevestigd.')
    expect(html).toContain('Dit WorkMatchr Adviesdossier is gebaseerd')
    expect(html).not.toContain('U moet')
  })

  it('toont geen technische codes, versies of provenance', () => {
    const html = renderToStaticMarkup(
      <PublicIntakeGuidanceResult outcome={createOutcome()} />,
    )

    expect(html).not.toContain('KNOWLEDGE_RIE_FOUNDATION')
    expect(html).not.toContain('GUIDANCE_RIE')
    expect(html).not.toContain('guidance-outcome/1.1.0')
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
})
