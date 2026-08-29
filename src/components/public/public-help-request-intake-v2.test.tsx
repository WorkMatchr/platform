import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
vi.mock('@/app/advieswijzer/actions', () => ({
  createPublicIntakeDraftAction: vi.fn(), clearPublicIntakeSessionAction: vi.fn(),
  confirmPublicIntakeAIClassificationAction: vi.fn(), recordPublicIntakeAnswerAction: vi.fn(),
  recordPublicIntakeTopicSelectionAction: vi.fn(),
}))
vi.mock('@/lib/auth-client', () => ({ authClient: { useSession: () => ({ data: null }) } }))
vi.mock('./advice-dossier-ready-actions', () => ({ AdviceDossierReadyActions: () => null }))
import { buildPublicIntakeGuidanceHandoff } from '@/lib/public-intake/public-intake-guidance-handoff'
import { PUBLIC_HELP_REQUEST_INTAKE_V2_FLOW_VERSION } from '@/lib/public-intake/public-intake-config'
import type { PublicIntakeDraftView } from '@/lib/public-intake/public-intake-types'
import { PublicIntakeStart } from './public-intake-start'
import { PublicIntakeWorkspace } from './public-intake-workspace'

function draft(): PublicIntakeDraftView {
  const at = new Date('2026-08-27T08:00:00.000Z')
  const snapshot = {
    phase: 'STARTED' as const,
    entryPoint: 'FREE_TEXT' as const,
    originalInput: 'Wij hebben een RI&E nodig voor ons bedrijf.',
    selectedRequestKey: null,
    flowVersion: PUBLIC_HELP_REQUEST_INTAKE_V2_FLOW_VERSION,
    currentStep: 'start', version: 1, startedAt: at, lastInteractionAt: at,
    expiresAt: new Date('2026-09-27T08:00:00.000Z'), answers: [],
  }
  return { ...snapshot, guidance: buildPublicIntakeGuidanceHandoff('v2-draft', snapshot), aiClassification: { summary: 'De organisatie heeft een nieuwe RI&E nodig.', primarySubject: 'RIE', secondarySubjects: [], confidence: 'HIGH', alternatives: [] }, adviceDossier: null }
}

describe('AI Hulpvraag Intake v2', () => {
  it('begint met één vrije hulpvraag zonder vaste situaties', () => {
    const html = renderToStaticMarkup(<PublicIntakeStart experience="HELP_REQUEST_V2" onCreated={() => undefined} />)
    expect(html).toContain('Waarbij heeft uw organisatie hulp nodig?')
    expect(html).toContain('Wij hebben een RI&amp;E nodig voor ons bedrijf')
    expect(html).toContain('2.000 tekens')
    expect(html).not.toContain('Of kies een herkenbare situatie')
  })

  it('toont de compacte drie stappen en geen oude rechterkolom', () => {
    const html = renderToStaticMarkup(<PublicIntakeWorkspace initialDraft={draft()} onRestart={() => undefined} experience="HELP_REQUEST_V2" />)
    expect(html).toContain('Uw hulpvraag')
    expect(html).toContain('Aanvullende vragen')
    expect(html).toContain('Controle')
    expect(html).not.toContain('Waarom vragen wij dit?')
    expect(html).not.toContain('Organisatiecontext')
  })

  it('biedt in de controlefase een revisieactie voor eerdere antwoorden', () => {
    const current = draft()
    const answers = [
      { questionKey: 'context_rie_status', value: 'Een nieuwe RI&E' },
      { questionKey: 'context_employee_count', value: '11 tot en met 50 medewerkers' },
      { questionKey: 'context_location_count', value: 'Eén locatie' },
      { questionKey: 'context_preferred_start', value: 'Binnen drie maanden' },
      { questionKey: 'context_existing_investigation', value: 'Nee' },
    ].map(({ questionKey, value }) => ({
      questionKey, questionVersion: 1, answerType: 'OPTION' as const,
      disposition: 'ANSWERED' as const, source: 'AI_CONTEXT_PLANNER' as const,
      version: 1, value,
    }))
    const snapshot = { ...current, phase: 'CLARIFYING' as const, answers }
    const html = renderToStaticMarkup(
      <PublicIntakeWorkspace
        initialDraft={{ ...snapshot, guidance: buildPublicIntakeGuidanceHandoff('v2-draft', snapshot) }}
        onRestart={() => undefined}
        experience="HELP_REQUEST_V2"
      />,
    )

    expect(html).toContain('Dit hebben wij van uw vraag begrepen')
    expect(html).toContain('Wijzigen')
  })
})
