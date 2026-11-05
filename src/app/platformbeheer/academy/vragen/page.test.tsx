// @vitest-environment jsdom
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ courses: vi.fn(), read: vi.fn() }))
vi.mock('@/lib/learning/academy-question-bank-admin-service', () => ({ listAcademyAdminCourses: mocks.courses, readAcademyAdminQuestions: mocks.read, AcademyAdminReadError: class extends Error {} }))
import Page from './page'
vi.stubGlobal('React', React)
beforeEach(() => {
  mocks.courses.mockResolvedValue([{ code: 'WL-002', title: 'Preventiemedewerker in de praktijk' }])
  mocks.read.mockResolvedValue({ total: 1, versions: ['WL-002-EXAM-1.0'], rows: [{ courseCode: 'WL-002', code: 'WL002-EX-E17', bank: 'EXAM', referenceVersion: 'WL-002-EXAM-1.0', questionVersion: 1, chapter: 4, status: 'DRAFT', referenceStatus: 'DRAFT', type: 'MULTI_CHOICE', cognitiveLevel: 'T', knowledgeArea: 'Preventie', text: '<script>geen uitvoering</script>', options: [{ value: 'A', text: 'Werk onderzoeken', isCorrect: true }, { value: 'B', text: 'Effect controleren', isCorrect: true }, { value: 'C', text: 'Geen onderzoek', isCorrect: false }], review: ['Juridische review vereist'], correctAnswer: ['A', 'B'], explanation: 'Inhoudelijke uitleg' }] })
})
afterEach(cleanup)
it('has labelled native GET filters, full version identity, textual correct markers and escaped content', async () => {
  const { container } = render(await Page({ searchParams: Promise.resolve({ course: 'WL-002' }) }))
  for (const label of ['Opleiding', 'Vraagbank', 'Vraagcode of vraagtekst', 'Hoofdstuk', 'Vraagtype', 'Publicatiestatus', 'Opleidings-, examen- of bankversie', 'Vraagversie']) expect(screen.getByLabelText(label)).toBeTruthy()
  expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Vragen & antwoorden')
  expect(screen.getByRole('heading', { level: 2 }).textContent).toContain('Vraagversie 1')
  expect(screen.getAllByText('— Correct antwoord')).toHaveLength(2)
  expect(screen.getByText('<script>geen uitvoering</script>')).toBeTruthy(); expect(container.querySelector('script')).toBeNull()
  expect(screen.getByRole('button', { name: 'Zoeken en filteren' }).getAttribute('type')).toBe('submit')
  const link = screen.getByRole('link', { name: 'Vertrouwelijke review-PDF downloaden' })
  expect(link.getAttribute('href')).not.toContain('undefined'); expect(link.getAttribute('href')).toContain('course=WL-002')
  expect(container.querySelector('form')?.getAttribute('method')).toBeNull() // Default GET, no mutation action.
})
it('rejects malformed filters without reading questions', async () => {
  mocks.read.mockClear(); render(await Page({ searchParams: Promise.resolve({ course: 'WL-002', chapter: 'bad' }) }))
  expect(screen.getByText(/gekozen filters zijn niet geldig/)).toBeTruthy(); expect(mocks.read).not.toHaveBeenCalled()
})
it('renders a safe generic error without sensitive database messages', async () => {
  mocks.read.mockRejectedValue(new Error('secret database diagnostic'))
  const { container } = render(await Page({ searchParams: Promise.resolve({ course: 'WL-002' }) }))
  expect(container.textContent).toContain('Vraagbank niet beschikbaar'); expect(container.textContent).not.toContain('secret')
})
