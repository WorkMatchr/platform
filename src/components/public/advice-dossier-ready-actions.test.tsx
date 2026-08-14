import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/app/adviesdossiers/actions', () => ({
  prepareAdviceDossierIntakeAction: vi.fn(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

import {
  AdviceDossierAssignmentSubmitButton,
  AdviceDossierReadyActions,
  prepareAdviceDossierAssignment,
} from './advice-dossier-ready-actions'

describe('Adviesdossier-vervolgacties', () => {
  it('toont twee gelijkwaardige acties met de juiste dossierlink en handoffcopy', () => {
    const html = renderToStaticMarkup(
      <AdviceDossierReadyActions dossierId="dossier-123" />,
    )

    expect(html).toContain('Bekijk uw Adviesdossier')
    expect(html).toContain('Professionele ondersteuning nodig?')
    expect(html).toContain('Maak hiervan een opdracht')
    expect(html).toContain('href="/adviesdossiers/dossier-123"')
    expect(html).toContain('lg:grid-cols-2')
    expect(html).toContain('zodat u niet opnieuw hoeft te beginnen')
  })

  it('toont tijdens voorbereiden een disabled knop met spinner en loadingtekst', () => {
    const html = renderToStaticMarkup(
      <AdviceDossierAssignmentSubmitButton isPending />,
    )

    expect(html).toContain('disabled')
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Opdracht voorbereiden…')
    expect(html).toContain('animate-spin')
  })

  it('navigeert na een succesvolle handoff naar de gekoppelde intake', async () => {
    const navigate = vi.fn()
    const action = vi.fn().mockResolvedValue({
      ok: true,
      href: '/hulpvragen/intake-123?van=adviesdossier',
    })

    await expect(prepareAdviceDossierAssignment({
      dossierId: 'dossier-123',
      action,
      navigate,
    })).resolves.toBeNull()
    expect(action).toHaveBeenCalledWith('dossier-123')
    expect(navigate).toHaveBeenCalledWith('/hulpvragen/intake-123?van=adviesdossier')
  })

  it('toont een veilige domeinfout zonder te navigeren', async () => {
    const navigate = vi.fn()

    await expect(prepareAdviceDossierAssignment({
      dossierId: 'dossier-123',
      action: vi.fn().mockResolvedValue({ ok: false, code: 'NOT_ELIGIBLE' }),
      navigate,
    })).resolves.toBe(
      'Vanuit dit Adviesdossier kan momenteel geen opdracht worden gestart.',
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('gebruikt de resultaat-action en blokkeert dubbele client-submit', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/components/public/advice-dossier-ready-actions.tsx'),
      'utf8',
    )

    expect(source).toContain('prepareAdviceDossierIntakeAction')
    expect(source).toContain('router.push(href)')
    expect(source).toContain('submitStarted.current || isPending')
    expect(source).toContain('submitStarted.current = true')
    expect(source).toContain('setError(HANDOFF_FALLBACK_ERROR)')
    expect(source).toContain('Uw Adviesdossier is bewaard')
    expect(source).toContain('role="alert"')
  })
})
