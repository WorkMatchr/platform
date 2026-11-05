import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ overview: vi.fn() }))
vi.mock('@/lib/learning/learning-authorization', () => ({ requireLearningUser: async () => ({ id: 'synthetic' }) }))
vi.mock('@/lib/learning/learning-final-exam-service', () => ({ getFinalExamOverview: mocks.overview }))
vi.mock('@/app/e-learnings/exam-actions', () => ({ startFinalExamAction: async () => {} }))
import Page from './page'
function overview(limit: number | null, status = 'SUBMITTED') {
  const attempt = { id: 'synthetic-attempt', attemptNumber: 2, status, passed: false, percentage: 0 }
  return { examVersion: { version: '2.0', questionCount: 1, passingScore: 1, passingPercentage: 100, attemptLimit: limit }, enrollment: { courseVersion: { course: { title: 'Synthetische cursus' } }, examAttempts: [attempt] }, attempts: status === 'SUBMITTED' ? [attempt] : [], activeAttempt: status === 'IN_PROGRESS' ? attempt : null, eligible: true, completedChapters: 1, chapterCount: 1 }
}
async function html() { return renderToStaticMarkup(await Page({ params: Promise.resolve({ courseSlug: 'synthetic' }), searchParams: Promise.resolve({}) })) }
beforeEach(() => mocks.overview.mockReset())
it.each(['SUBMITTED', 'ABANDONED'])('hides new attempts at the configured limit including %s attempts', async (status) => {
  mocks.overview.mockResolvedValue(overview(2, status))
  const markup = await html()
  expect(markup).toContain('maximale aantal toetspogingen')
  expect(markup).not.toContain('type="submit"')
})
it('allows an active final attempt to resume', async () => {
  mocks.overview.mockResolvedValue(overview(2, 'IN_PROGRESS'))
  expect(await html()).toContain('Hervat eindtoets')
})
it.each([null, 3])('retains retry below the configured limit %s', async (limit) => {
  mocks.overview.mockResolvedValue(overview(limit))
  expect(await html()).toContain('Opnieuw proberen')
})
