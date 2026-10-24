// @vitest-environment jsdom
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, fireEvent, render as renderComponent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ submit: vi.fn(), finish: vi.fn(), complete: vi.fn() }))

vi.mock('next/link', () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => createElement('a', { href, ...props }, children) }))
vi.mock('@/app/e-learnings/actions', () => ({
  completeLearningChapterAction: mocks.complete,
  finishLearningBlockAction: mocks.finish,
  submitLearningAnswerAction: mocks.submit,
}))

import { LessonContent, LessonPlayer } from './lesson-player'
import { learningChapter4Blocks, learningChapter4Questions } from '@/lib/learning/learning-chapter4-content'
import { learningChapter5Blocks, learningChapter5Questions } from '@/lib/learning/learning-chapter5-content'
import { learningChapter6Blocks, learningChapter6Questions } from '@/lib/learning/learning-chapter6-content'
import { learningChapter7Blocks, learningChapter7Questions } from '@/lib/learning/learning-chapter7-content'
import { learningChapter8Blocks, learningChapter8Questions } from '@/lib/learning/learning-chapter8-content'
import { learningChapterBlocks, learningChapter3Blocks, learningQuestions, learningChapter3Questions } from '@/lib/learning/learning-prototype-content'
import { isLearningAnswerCorrect } from '@/lib/learning/learning-answer-policy'

const options = [{ value: 'a', text: 'Optie A' }, { value: 'b', text: 'Optie B' }]

const playerProps = {
  courseTitle: 'RI&E in de praktijk', chapterId: 'chapter-2', chapterTitle: 'Wie doet wat?', chapterPosition: 2,
  courseSlug: 'rie-in-de-praktijk', courseVersion: 'prototype-0.5', chapterNavigation: [],
  estimatedDurationLabel: '12–15 minuten', learningObjectives: [],
  blocks: [{ id: 'question-block', position: 1, type: 'SINGLE_CHOICE', data: { prompt: 'Kies één antwoord.' }, question: { id: 'q-1', type: 'SINGLE_CHOICE', options } }],
  completed: false, lastCompletedBlockId: null, progressPercentage: 0,
  questionStats: { correctQuestionIds: [] as string[], total: 1 },
}

function render(type: string, data: Record<string, unknown>, question: { type: string; options: typeof options } | null = null) {
  return renderToStaticMarkup(createElement(LessonContent, {
    block: { id: 'block-1', position: 1, type, data, question: question ? { id: 'q-1', ...question } : null },
    index: 0,
    onAnswered: vi.fn(),
  }))
}

describe('Learning-contentrenderer', () => {
  afterEach(cleanup)

  beforeEach(() => {
    mocks.submit.mockReset()
    mocks.finish.mockReset().mockResolvedValue({ ok: true })
    mocks.complete.mockReset().mockResolvedValue({ ok: true })
  })

  it.each([{ correctQuestionIds: [] }, { correctQuestionIds: ['q-1'] }])('actualiseert het eindresultaat na retries zonder refresh of dubbeltelling (%j)', async ({ correctQuestionIds }) => {
    mocks.submit
      .mockResolvedValueOnce({ ok: true, correct: false, feedback: 'Probeer opnieuw.' })
      .mockResolvedValueOnce({ ok: true, correct: true, feedback: 'Dit klopt.' })
    renderComponent(createElement(LessonPlayer, { ...playerProps, questionStats: { correctQuestionIds, total: 1 } }))
    fireEvent.click(screen.getByRole('radio', { name: 'Optie B' }))
    expect((await screen.findByRole('status')).textContent).toContain('Probeer opnieuw.')
    fireEvent.click(screen.getByRole('radio', { name: 'Optie A' }))
    expect((await screen.findByRole('status')).textContent).toContain('Dit klopt.')
    fireEvent.click(screen.getByRole('button', { name: 'Naar afronding' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Hoofdstuk afronden' }))
    expect((await screen.findByText('1 van 1 onderwerpen laatst correct beantwoord')).textContent).toContain('1 van 1')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Hoofdstuk 2 afgerond — Wie doet wat?' })))
    expect(mocks.complete).toHaveBeenCalledTimes(1)
  })

  it('laat een afgerond hoofdstuk alleen lezen, zonder antwoorden of afronding te schrijven', async () => {
    renderComponent(createElement(LessonPlayer, { ...playerProps, completed: true, readOnly: true, progressPercentage: 100 }))
    for (const radio of screen.getAllByRole('radio')) expect((radio as HTMLInputElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Naar afronding' }))
    await screen.findByText('U hebt dit hoofdstuk al afgerond. Uw voortgang is behouden.')
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'U bent aan het einde van hoofdstuk 2' })))
    expect(screen.queryByRole('button', { name: 'Hoofdstuk afronden' })).toBeNull()
    expect(mocks.submit).not.toHaveBeenCalled()
    expect(mocks.finish).not.toHaveBeenCalled()
    expect(mocks.complete).not.toHaveBeenCalled()
  })

  it('verplaatst de leesfocus ook naar een tekstblok zonder kop', async () => {
    renderComponent(createElement(LessonPlayer, {
      ...playerProps,
      blocks: [
        { id: 'intro', position: 1, type: 'HEADING', data: { title: 'Introductie' }, question: null },
        { id: 'text', position: 2, type: 'TEXT', data: { paragraphs: ['Inhoud zonder kop.'] }, question: null },
      ],
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Volgende' }))
    const content = await screen.findByText('Inhoud zonder kop.')
    await waitFor(() => expect(document.activeElement).toBe(content.closest('article')))
    expect(mocks.finish).toHaveBeenCalledTimes(1)
  })

  it('rendert titel, tekst, callout, proces, samenvatting en mediaplaceholder', () => {
    expect(render('HEADING', { title: 'Start', subtitle: 'Intro' })).toContain('<h1')
    expect(render('TEXT', { paragraphs: ['Korte uitleg'] })).toContain('Korte uitleg')
    expect(render('CALLOUT', { label: 'WETTELIJKE EIS', title: 'Kader', body: 'Toelichting' })).toContain('WETTELIJKE EIS')
    expect(render('PROCESS', { steps: ['Inventariseren', 'Evalueren'] })).toContain('<ol')
    expect(render('SUMMARY', { items: ['Risico’s beoordelen'] })).toContain('Risico’s beoordelen')
    expect(render('IMAGE', { alt: 'Illustratie volgt' })).toContain('Illustratie volgt')
  })

  it('rendert alle H4/H5/H6/H7/H8-blokken generiek, inclusief callouts en processtappen', () => {
    for (const block of [...learningChapter4Blocks, ...learningChapter5Blocks, ...learningChapter6Blocks, ...learningChapter7Blocks, ...learningChapter8Blocks]) {
      const question = [...learningChapter4Questions, ...learningChapter5Questions, ...learningChapter6Questions, ...learningChapter7Questions, ...learningChapter8Questions].find((item) => item.code === block.questionCode)
      const html = render(block.type, block.data, question ?? null)
      expect(html).not.toContain('kan niet worden weergegeven')
      if (block.type === 'CALLOUT') expect(html).toContain(`aria-label="${block.data.label}"`)
      if (block.type === 'PROCESS') {
        expect(html).toContain('<ol')
        for (const step of block.data.steps as string[]) expect(html).toContain(step.replaceAll('&', '&amp;'))
      }
      if (question && ['MULTI_CHOICE', 'SORTING'].includes(question.type)) expect(html).toContain('Antwoord controleren')
      else if (question) expect(html).not.toContain('Antwoord controleren')
    }
  })

  it('toont de H8-PDCA-sorteeropties initieel niet in de correcte PLAN-DO-CHECK-ACT-volgorde', () => {
    const item = learningChapter8Questions.find((candidate) => candidate.code === 'WL001-H8-PDCA')!
    const html = render('SORTING', { title: 'PDCA', prompt: item.questionText }, item)
    expect(html).toContain('Antwoord controleren')
    expect(html.indexOf('ACT —')).toBeLessThan(html.indexOf('CHECK —'))
    expect(html.indexOf('CHECK —')).toBeLessThan(html.indexOf('DO —'))
    expect(html.indexOf('DO —')).toBeLessThan(html.indexOf('PLAN —'))
  })

  it('rendert alle ondersteunde oefenvragen met gelabelde toetsenbordbediening', () => {
    for (const type of ['SINGLE_CHOICE', 'TRUE_FALSE', 'CASE_STUDY']) {
      const html = render(type, { prompt: 'Welke optie?', options: ['Optie A', 'Optie B'] }, { type, options })
      expect(html).toContain('Welke optie?')
      expect(html).toContain('Optie A')
      expect(html).toContain('type="radio"')
    }
    const multiple = render('MULTI_CHOICE', { prompt: 'Kies alles', options: ['Optie A'] }, { type: 'MULTI_CHOICE', options })
    expect(multiple).toContain('type="checkbox"')
    const sorting = render('SORTING', { prompt: 'Classificeer', categories: ['Gevaar', 'Risico'], items: [{ value: 'a', text: 'Zaag' }] }, { type: 'SORTING', options })
    expect(sorting).toContain('Kies een categorie')
    expect(sorting).toContain('Zaag')
  })

  it('verbergt de canonieke procesvolgorde naast een gekoppelde sorteervraag', () => {
    const html = render('PROCESS', { title: 'De RI&E-cyclus', steps: ['Inventariseren'] }, {
      type: 'SORTING',
      options: [{ value: 'inventariseren', text: 'Risico’s inventariseren' }],
    })
    expect(html).not.toContain('<ol')
    expect(html).toContain('Kies per onderdeel de plek in de volgorde')
    expect(html).toContain('Risico’s inventariseren')
  })

  it('start H1/H3/H5-sortering zonder antwoordlek en beoordeelt pas na controle, inclusief retry', async () => {
    const seeds = [...learningQuestions, ...learningChapter3Questions, ...learningChapter5Questions]
    const blocks = [...learningChapterBlocks, ...learningChapter3Blocks, ...learningChapter5Blocks]
    for (const seed of seeds.filter((q) => q.type === 'SORTING' && Array.isArray(q.correctAnswer))) {
      const block = blocks.find((b) => b.questionCode === seed.code)!
      mocks.submit.mockReset().mockImplementation(async (_id, answer) => ({ ok: true, correct: isLearningAnswerCorrect('SORTING', answer, seed.correctAnswer), feedback: 'Onderzoek de voorkeursvolgorde.' }))
      const { unmount } = renderComponent(createElement(LessonContent, { block: { ...block, id: seed.code, position: 1, question: { ...seed, id: seed.code } }, index: 0, onAnswered: vi.fn() }))
      const controls = screen.getAllByRole('combobox') as HTMLSelectElement[]
      const initial = seed.options.map((o) => ({ value: o.value, rank: Number((screen.getByLabelText(o.text) as HTMLSelectElement).value) })).sort((a, b) => a.rank - b.rank).map((o) => o.value)
      expect(initial).not.toEqual(seed.correctAnswer)
      expect(screen.queryByRole('status')).toBeNull()
      expect(mocks.submit).not.toHaveBeenCalled()
      fireEvent.change(controls[0], { target: { value: controls[0].value } })
      fireEvent.click(screen.getByRole('button', { name: 'Antwoord controleren' }))
      expect((await screen.findByRole('status')).textContent).toContain('Nog niet helemaal.')
      for (const [index, value] of (seed.correctAnswer as string[]).entries()) {
        fireEvent.change(screen.getByLabelText(seed.options.find((o) => o.value === value)!.text), { target: { value: String(index + 1) } })
      }
      fireEvent.click(screen.getByRole('button', { name: 'Antwoord controleren' }))
      expect((await screen.findByRole('status')).textContent).toContain('Goed gezien.')
      expect(mocks.submit).toHaveBeenCalledTimes(2)
      expect(mocks.submit).toHaveBeenLastCalledWith(seed.code, seed.correctAnswer)
      unmount()
    }
  })

  it('toont een veilige melding voor een onbekend bloktype of ontbrekende vraag', () => {
    expect(render('FUTURE_TYPE', {})).toContain('kan niet worden weergegeven')
    expect(render('SINGLE_CHOICE', { prompt: 'Vraag' })).toContain('niet beschikbaar')
  })

  it('geeft bij single choice, true/false en een keuze-casus direct feedback', async () => {
    mocks.submit.mockResolvedValue({ ok: true, correct: true, feedback: 'De toelichting volgt.' })
    for (const type of ['SINGLE_CHOICE', 'TRUE_FALSE', 'CASE_STUDY']) {
      const questionType = type === 'CASE_STUDY' ? 'CASE_STUDY' : type
      const { unmount } = renderComponent(createElement(LessonContent, {
        block: { id: `block-${type}`, position: 1, type, data: { prompt: 'Kies één antwoord.' }, question: { id: `question-${type}`, type: questionType, options } },
        index: 0,
        onAnswered: vi.fn(),
      }))
      fireEvent.click(screen.getByRole('radio', { name: 'Optie A' }))
      expect((await screen.findByRole('status')).textContent).toContain('Goed gezien. De toelichting volgt.')
      expect(screen.queryByRole('button', { name: 'Antwoord controleren' })).toBeNull()
      expect(mocks.submit).toHaveBeenCalledWith(`block-${type}`, 'a')
      unmount()
    }
  })

  it('laat na een fout single-choiceantwoord een inhoudelijke retry toe', async () => {
    mocks.submit
      .mockResolvedValueOnce({ ok: true, correct: false, feedback: 'Bekijk de werkzaamheden opnieuw.' })
      .mockResolvedValueOnce({ ok: true, correct: true, feedback: 'De storing hoort bij het werk.' })
    renderComponent(createElement(LessonContent, {
      block: { id: 'retry-block', position: 1, type: 'CASE_STUDY', data: { prompt: 'Wat doet u?' }, question: { id: 'retry-question', type: 'CASE_STUDY', options } },
      index: 0,
      onAnswered: vi.fn(),
    }))

    fireEvent.click(screen.getByRole('radio', { name: 'Optie B' }))
    expect((await screen.findByRole('status')).textContent).toContain('Nog niet helemaal. Bekijk de werkzaamheden opnieuw.')
    fireEvent.click(screen.getByRole('radio', { name: 'Optie A' }))
    expect((await screen.findByRole('status')).textContent).toContain('Goed gezien. De storing hoort bij het werk.')
    expect(mocks.submit).toHaveBeenCalledTimes(2)
  })

  it('verwijdert een legacy-foutprefix uit uitleg na een correct antwoord', async () => {
    mocks.submit.mockResolvedValue({ ok: true, correct: true, feedback: 'Nog niet. Een rondgang is één informatiebron.' })
    renderComponent(createElement(LessonContent, {
      block: { id: 'legacy-feedback', position: 1, type: 'TRUE_FALSE', data: { prompt: 'Welke uitleg hoort hierbij?' }, question: { id: 'legacy-question', type: 'TRUE_FALSE', options } },
      index: 0,
      onAnswered: vi.fn(),
    }))

    fireEvent.click(screen.getByRole('radio', { name: 'Optie A' }))
    expect((await screen.findByRole('status')).textContent).toBe('Goed gezien. Een rondgang is één informatiebron.')
  })

  it('houdt multi-select en sorting handmatig te controleren en blokkeert dubbele submits', async () => {
    mocks.submit.mockResolvedValue({ ok: true, correct: true, feedback: 'De antwoorden zijn opgeslagen.' })
    const multiOptions = [{ value: 'a', text: 'Bron A' }, { value: 'b', text: 'Bron B' }]
    const { unmount } = renderComponent(createElement(LessonContent, {
      block: { id: 'multi-block', position: 1, type: 'MULTI_CHOICE', data: { prompt: 'Selecteer bronnen.' }, question: { id: 'multi-question', type: 'MULTI_CHOICE', options: multiOptions } },
      index: 0,
      onAnswered: vi.fn(),
    }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Bron A' }))
    expect(mocks.submit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Antwoord controleren' }))
    expect((await screen.findByRole('status')).textContent).toContain('Goed gezien. De antwoorden zijn opgeslagen.')
    expect(mocks.submit).toHaveBeenCalledTimes(1)

    unmount()
    mocks.submit.mockReset()
    mocks.submit.mockResolvedValue({ ok: true, correct: true, feedback: 'De volgorde klopt.' })
    renderComponent(createElement(LessonContent, {
      block: { id: 'sorting-block', position: 1, type: 'SORTING', data: { prompt: 'Zet op volgorde.', items: ['Stap A', 'Stap B'] }, question: { id: 'sorting-question', type: 'SORTING', options: multiOptions } },
      index: 0,
      onAnswered: vi.fn(),
    }))
    fireEvent.change(screen.getByLabelText('Bron A'), { target: { value: '2' } })
    expect(mocks.submit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Antwoord controleren' }))
    expect((await screen.findByRole('status')).textContent).toContain('Goed gezien. De volgorde klopt.')
  })

  it('laat matching pas controleren nadat alle rollen zijn ingevuld', async () => {
    mocks.submit.mockResolvedValue({ ok: true, correct: true, feedback: 'De primaire rollen kloppen.' })
    renderComponent(createElement(LessonContent, {
      block: { id: 'roles', position: 1, type: 'SORTING', data: { prompt: 'Koppel de rollen.', categories: ['Werkgever', 'Werknemer'], items: options }, question: { id: 'roles-question', type: 'SORTING', options } },
      index: 0, onAnswered: vi.fn(),
    }))
    const check = screen.getByRole('button', { name: 'Antwoord controleren' }) as HTMLButtonElement
    expect(check.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Optie A'), { target: { value: 'werkgever' } })
    expect(check.disabled).toBe(true)
    fireEvent.click(check)
    expect(mocks.submit).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Optie B'), { target: { value: 'werknemer' } })
    expect(check.disabled).toBe(false)
    fireEvent.click(check)
    expect((await screen.findByRole('status')).textContent).toContain('De primaire rollen kloppen.')
    expect(mocks.submit).toHaveBeenCalledWith('roles', { a: 'werkgever', b: 'werknemer' })
  })

  it('voorkomt dubbele directe attempts tijdens een lopende aanvraag', async () => {
    let finishRequest: ((result: { ok: true; correct: true; feedback: string }) => void) | undefined
    mocks.submit.mockImplementation(() => new Promise((resolve) => { finishRequest = resolve }))
    renderComponent(createElement(LessonContent, {
      block: { id: 'double-block', position: 1, type: 'SINGLE_CHOICE', data: { prompt: 'Kies één antwoord.' }, question: { id: 'double-question', type: 'SINGLE_CHOICE', options } },
      index: 0,
      onAnswered: vi.fn(),
    }))
    fireEvent.click(screen.getByRole('radio', { name: 'Optie A' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Optie B' }))
    expect(mocks.submit).toHaveBeenCalledTimes(1)
    finishRequest?.({ ok: true, correct: true, feedback: 'Een poging is opgeslagen.' })
    expect((await screen.findByRole('status')).textContent).toContain('Een poging is opgeslagen.')
  })

  it('laat lange feedback natuurlijk wrappen binnen een toegankelijke, content-driven box', async () => {
    const longFeedback = 'Uitleg over blootstelling, werkpatronen, afwijkende werkzaamheden en bestaande maatregelen. '.repeat(8)
    mocks.submit.mockResolvedValue({ ok: true, correct: false, feedback: longFeedback })
    renderComponent(createElement(LessonContent, {
      block: { id: 'long-block', position: 1, type: 'SINGLE_CHOICE', data: { prompt: 'Kies één antwoord.' }, question: { id: 'long-question', type: 'SINGLE_CHOICE', options } },
      index: 0,
      onAnswered: vi.fn(),
    }))
    fireEvent.click(screen.getByRole('radio', { name: 'Optie B' }))
    const feedback = await screen.findByRole('status')
    expect(feedback.getAttribute('aria-live')).toBe('polite')
    expect(feedback.className).toContain('[overflow-wrap:anywhere]')
    expect(feedback.className).toContain('p-4')
    expect(feedback.className).not.toMatch(/\bh-\d/)
    expect(feedback.textContent).toContain(longFeedback)
  })

  it('toont hoofdstuk 3 met positie 3 en een echte hoofdstuk-2-placeholder', () => {
    const html = renderToStaticMarkup(createElement(LessonPlayer, {
      courseTitle: 'RI&E in de praktijk', chapterId: 'chapter-3', chapterTitle: 'Risico’s inventariseren', chapterPosition: 3,
      courseSlug: 'rie-in-de-praktijk', courseVersion: 'prototype-0.4', chapterNavigation: [
        { id: 'chapter-1', slug: 'waarom-een-rie', title: 'Waarom een RI&E?', position: 1, progressStatus: 'COMPLETED' },
        { id: 'chapter-3', slug: 'risicos-inventariseren', title: 'Risico’s inventariseren', position: 3, progressStatus: 'IN_PROGRESS' },
      ],
      estimatedDurationLabel: '12–15 minuten', learningObjectives: [], blocks: [], completed: false, lastCompletedBlockId: null,
      progressPercentage: 0, questionStats: { correctQuestionIds: [], total: 5 },
    }))
    expect(html).toContain('Hoofdstuk 3 van 10')
    expect(html).toContain('2. Nog niet beschikbaar')
    expect(html).toContain('12–15 minuten')
    expect(html).toContain('Hoofdstuk 3')
    expect(html).toContain('version=prototype-0.4&amp;opnieuw=1')
  })
})
