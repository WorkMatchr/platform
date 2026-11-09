import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import LearningHomePage from './page'

vi.mock('@/lib/learning/learning-authorization', () => ({
  requireLearningUser: async () => ({ id: 'synthetic-learner' }),
}))
vi.mock('@/lib/learning/learning-query-service', () => ({
  getPublishedLearningCourses: async () => [{
    id: 'course', code: 'TEST', slug: 'test', title: 'Testopleiding', description: '',
    versions: [{ chapters: [10, 15].map(estimatedMinutes => ({ estimatedMinutes, progress: [] })), enrollments: [] }],
  }],
}))

it('toont de totale lestijd en het aantal hoofdstukken bij de opleiding', async () => {
  const html = renderToStaticMarkup(await LearningHomePage())
  expect(html).toContain('25 minuten voor de lessen · 2 hoofdstukken beschikbaar')
})
