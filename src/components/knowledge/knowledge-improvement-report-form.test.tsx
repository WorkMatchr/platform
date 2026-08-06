import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { KnowledgeImprovementActionState } from '@/lib/knowledge/knowledge-improvement-action-state'

vi.mock('@/app/kenniscentrum/verbetering-melden/[knowledgeItemId]/actions', () => ({
  submitKnowledgeImprovementAction: vi.fn(),
}))

import { KnowledgeImprovementReportFormView } from './knowledge-improvement-report-form'

const knowledgeItemId = '10000000-0000-4000-8000-000000000001'

function render(state?: Partial<KnowledgeImprovementActionState>) {
  return renderToStaticMarkup(<KnowledgeImprovementReportFormView knowledgeItemId={knowledgeItemId} rawState={state} />)
}

describe('professionele verbetermelding', () => {
  it('rendert de eerste keer zonder action-resultaat', () => {
    const html = render()
    expect(html).toContain('Waar gaat uw melding over?')
    expect(html).toContain('name="explanation"')
    expect(html).not.toContain('TypeError')
  })

  it('rendert veilig met een initiële state zonder fieldErrors', () => {
    expect(render({ status: 'idle', message: null })).toContain('Meld een inhoudelijke verbetering')
  })

  it('toont validatiefouten voor ieder formulierveld', () => {
    const html = render({
      status: 'error',
      message: 'Controleer de gemarkeerde velden.',
      fieldErrors: {
        knowledgeItemId: ['Het kennisitem ontbreekt.'],
        reportType: ['Kies het soort melding.'],
        explanation: ['Geef een toelichting.'],
        proposedImprovement: ['De voorgestelde verbetering is te lang.'],
        sourceReference: ['De bronverwijzing is te lang.'],
      },
    })
    for (const message of [
      'Het kennisitem ontbreekt.',
      'Kies het soort melding.',
      'Geef een toelichting.',
      'De voorgestelde verbetering is te lang.',
      'De bronverwijzing is te lang.',
    ]) expect(html).toContain(message)
  })

  it('toont een succesvolle indiening zonder veldfouten', () => {
    const html = render({ status: 'success', message: 'Dank u. Uw inhoudelijke melding is veilig ontvangen en wordt onderzocht.' })
    expect(html).toContain('Dank u. Uw inhoudelijke melding is veilig ontvangen en wordt onderzocht.')
    expect(html).toContain('text-success')
  })
})
