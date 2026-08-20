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

import { PublicIntakePrototype } from '@/components/public/public-intake-prototype'
import { PublicPageHero } from '@/components/public/public-page-hero'
import { resolveActiveKnowledgeContext } from '@/content/knowledge/knowledge-contexts'
import { metadata } from './advieswijzer/page'

describe('publieke Advieswijzer', () => {
  it('rendert het openingsscherm met vrije invoer en zeven compacte situaties', () => {
    const html = renderToStaticMarkup(<PublicIntakePrototype initialDraft={null} />)
    expect(html).toContain('Vermeld nog geen namen, medische gegevens')
    expect(html).toContain('Beschrijf kort uw situatie...')
    expect(html).toContain('Help mij verder')
    expect(html).toContain('Of kies een herkenbare situatie')
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(7)
    expect(html).toContain('Wij hebben een RI&amp;E nodig')
    expect(html).toContain('Mijn situatie staat er niet tussen')
  })

  it('toont een gevalideerde Bedrijfsarts-context zonder een hulpvraag voor te vullen', () => {
    const context = resolveActiveKnowledgeContext('OCCUPATIONAL_PHYSICIAN')
    const html = renderToStaticMarkup(
      <PublicIntakePrototype initialDraft={null} knowledgeContext={context} />,
    )

    expect(html).toContain('Uw vraag gaat over het inschakelen van een bedrijfsarts.')
    expect(html).toContain('Vertel kort waar u binnen uw organisatie tegenaan loopt.')
    expect(html).toContain('<textarea')
    expect(html).not.toContain('Wat moet ik regelen voor een BHV-organisatie?')
  })

  it('biedt bij een afwijkende hervatbare context een expliciete keuze', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/public/public-intake-prototype.tsx'),
      'utf8',
    )

    expect(source).toContain('Welke hulpvraag wilt u vervolgen?')
    expect(source).toContain('We overschrijven uw eerdere antwoorden niet.')
    expect(source).toContain('Verder met {activeKnowledgeContext.shortLabel}')
    expect(source).toContain('Eerdere antwoorden hervatten')
    expect(source).toContain('await clearPublicIntakeSessionAction()')
  })

  it('heeft unieke indexeerbare metadata en canonical', () => {
    expect(metadata.title).toBe('Advieswijzer | WorkMatchr')
    expect(metadata.description).toContain('verduidelijk')
    expect(metadata.alternates?.canonical).toBe('/advieswijzer')
    expect(metadata.robots).toBeUndefined()
  })

  it('borgt de doorlopende flow, opslagstatus en toegankelijke vraagstructuur', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/public/public-intake-workspace.tsx'),
      'utf8',
    )
    expect(source).toContain('recordPublicIntakeAnswerAction')
    expect(source).toContain('<fieldset')
    expect(source).toContain('<legend')
    expect(source).toContain('aria-live="polite"')
    expect(source).toContain('role="alert"')
    expect(source).not.toContain('Volgende')
    expect(source).not.toMatch(/Vraag \{.*\} van/)
    expect(source).toContain('firstQuestionControlRef.current?.focus()')
    expect(source).toContain('ref={optionIndex === 0 ? firstQuestionControlRef : undefined}')
    expect(source).not.toContain('questionHeadingRef')
    expect(source).toContain('aria-labelledby="public-intake-question-title"')
    expect(source).toContain('text-[clamp(1.5rem,2.5vw,2rem)]')
    expect(source).not.toContain('decidePublicIntake')
    expect(source).toContain('draft.guidance.clarification')
    expect(source).toContain('draft.guidance.outcome')
    expect(source).toContain(
      '<PublicIntakeGuidanceResult outcome={draft.guidance.outcome} />',
    )
    expect(source).toContain('isReadyForSummary &&')
    expect(source).toContain(
      "draft.guidance.completion.status === 'COMPLETED_WITH_SAFE_FALLBACK'",
    )
    expect(source).not.toContain('Deze begeleide route is nog niet beschikbaar')
    expect(source).not.toContain("'LIMITED_ROUTE'")
  })

  it('gebruikt de gedeelde compacte Arbo-wijzerlayout', () => {
    const html = renderToStaticMarkup(
      <PublicPageHero
        eyebrow="Advieswijzer"
        title="Waar kunnen wij u vandaag mee helpen?"
        description="Beschrijf kort uw situatie."
        compact
      />,
    )
    const pageSource = readFileSync(
      join(process.cwd(), 'src/app/advieswijzer/page.tsx'),
      'utf8',
    )

    expect(html).toContain('py-5 sm:py-7')
    expect(html).toContain('!text-[clamp(2.25rem,3.5vw,3rem)]')
    expect(pageSource).toContain('ArboGuidePageLayout')
    expect(pageSource).toContain('currentLabel="Advieswijzer"')
    expect(pageSource).not.toContain('<Section')
  })

  it('gebruikt een compacte responsieve 30/70-werkruimte zonder prototype-eindscherm', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/public/public-intake-workspace.tsx'),
      'utf8',
    )
    expect(source).toContain('lg:grid-cols-[minmax(15rem,3fr)_minmax(0,7fr)]')
    expect(source).toContain('grid gap-4')
    expect(source).toContain('min-w-0 space-y-3')
    expect(source).not.toContain("process.env.NODE_ENV !== 'production'")
    expect(source).not.toContain('Module 7 — UX-prototype')
  })

  it('toont opnieuw beginnen alleen bij een actieve draft via een toegankelijke dialoog', () => {
    const workspaceSource = readFileSync(
      join(process.cwd(), 'src/components/public/public-intake-workspace.tsx'),
      'utf8',
    )
    const startSource = readFileSync(
      join(process.cwd(), 'src/components/public/public-intake-start.tsx'),
      'utf8',
    )
    const dialogSource = readFileSync(
      join(process.cwd(), 'src/components/public/public-intake-restart-dialog.tsx'),
      'utf8',
    )

    expect(workspaceSource).toContain('PublicIntakeRestartDialog')
    expect(startSource).not.toContain('Nieuwe hulpvraag starten')
    expect(dialogSource).toContain('<dialog')
    expect(dialogSource).toContain('Nieuwe hulpvraag starten?')
    expect(dialogSource).toContain('Uw huidige invulronde wordt afgesloten.')
    expect(dialogSource).toContain('Annuleren')
    expect(dialogSource).toContain('↺')
    expect(dialogSource).toContain('onClose={() => triggerRef.current?.focus()}')
    expect(dialogSource).toContain('disabled={isPending}')
    expect(dialogSource).toContain('loading={isPending}')
    expect(dialogSource).toContain('role="alert"')
  })
})
