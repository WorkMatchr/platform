import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/authorization', () => ({
  requireUser: vi.fn().mockResolvedValue({ id: '20000000-0000-4000-8000-000000000001' }),
}))
vi.mock('@/lib/knowledge/knowledge-improvement-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/knowledge/knowledge-improvement-service')>()
  return { ...actual, reportKnowledgeImprovement: vi.fn() }
})

import { reportKnowledgeImprovement } from '@/lib/knowledge/knowledge-improvement-service'
import { initialKnowledgeImprovementActionState } from '@/lib/knowledge/knowledge-improvement-action-state'
import { submitKnowledgeImprovementAction } from './actions'

const mockedReport = vi.mocked(reportKnowledgeImprovement)

describe('inhoudelijke verbetermelding-action', () => {
  beforeEach(() => vi.clearAllMocks())

  it('evalueert als echte server-actionmodule zonder runtime-type-export', () => {
    expect(submitKnowledgeImprovementAction).toBeTypeOf('function')
  })

  it('retourneert veldfouten binnen het volledige statecontract', async () => {
    const result = await submitKnowledgeImprovementAction(
      initialKnowledgeImprovementActionState,
      new FormData(),
    )
    expect(result).toMatchObject({ status: 'error', message: 'Controleer de gemarkeerde velden.' })
    expect(result.fieldErrors).toEqual(expect.objectContaining({
      knowledgeItemId: expect.any(Array),
      reportType: expect.any(Array),
      explanation: expect.any(Array),
    }))
    expect(mockedReport).not.toHaveBeenCalled()
  })

  it('retourneert na een geldige indiening een volledige succesvolle state', async () => {
    mockedReport.mockResolvedValue({ id: '30000000-0000-4000-8000-000000000001' } as never)
    const formData = new FormData()
    formData.set('knowledgeItemId', '10000000-0000-4000-8000-000000000001')
    formData.set('reportType', 'INCORRECT')
    formData.set('explanation', 'Deze formulering moet aan de hand van de actuele bron worden gecontroleerd.')

    const result = await submitKnowledgeImprovementAction(initialKnowledgeImprovementActionState, formData)

    expect(mockedReport).toHaveBeenCalledOnce()
    expect(result).toEqual({
      ...initialKnowledgeImprovementActionState,
      status: 'success',
      message: 'Dank u. Uw inhoudelijke melding is veilig ontvangen en wordt onderzocht.',
    })
  })
})
