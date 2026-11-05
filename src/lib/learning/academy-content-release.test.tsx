// @vitest-environment node
import { createElement } from 'react'
import { createHash } from 'node:crypto'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { validateAcademyBundle, type AcademyQuestion } from './academy-content-standard'
import { isExamAnswerCorrect, scoreExam } from './learning-exam-policy'
import { planAcademyImport } from './academy-import-service'
import { wl002RemediatedCourseBundle } from './wl002-content-v1-2'
import { learningRetentionQuestions } from './learning-retention-content'
import { parseFinalExamQuestionBank } from './learning-final-exam-content'
vi.mock('@/app/e-learnings/actions', () => ({ completeLearningChapterAction: vi.fn(), finishLearningBlockAction: vi.fn(), submitLearningAnswerAction: vi.fn() }))
import { LessonContent } from '@/components/learning/lesson-player'

const identities = [
  ['WL-001', 'RI&E in de praktijk'],
  ['WL-002', 'Preventiemedewerker in de praktijk'],
  ['WL-003', 'Veilig en gezond werken'],
] as const
function load(code: string) {
  // This suite preserves the original reviewed candidates; later revisions have separate tests.
  const versions: Record<string,string> = { 'WL-001':'1.0', 'WL-002':'1.3', 'WL-003':'1.1' }
  const matches = readdirSync('content/academy').filter(name => name === `${code}_COURSE_${versions[code]}_DRAFT.json`)
  expect(matches).toHaveLength(1)
  const bundle = validateAcademyBundle(JSON.parse(readFileSync(path.join('content/academy', matches[0]), 'utf8')))
  const review = JSON.parse(readFileSync(`docs/academy-content/${code}-review.json`, 'utf8'))
  return { bundle, review }
}
const sourceChecksum = (value: string) => createHash('sha256').update(value.replaceAll('\r\n', '\n'), 'utf8').digest('hex')
const answer = (q: AcademyQuestion) => q.type === 'SINGLE_CHOICE' ? q.correctAnswer[0] : q.correctAnswer
const escape = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

describe.each(identities)('%s content acceptance', (code, title) => {
  it('preserves the canonical identity and leaves all approvals open', () => {
    const { bundle, review } = load(code)
    expect(bundle.definition.courseCode).toBe(code)
    expect(bundle.definition.title).toBe(title)
    expect(bundle.contentStatus).toBe('DRAFT')
    expect(bundle.definition.reviewStage).not.toBe('READY_FOR_PUBLICATION')
    expect(review.reviewStatus).toBe('OPEN')
    expect(review.candidateVersion).toBe(bundle.courseVersion)
    expect(review.sourceVersion).not.toBe(bundle.courseVersion)
    expect(planAcademyImport(bundle).mode).toBe('DRY_RUN')
  })
  it('maps objectives to existing chapters, assessment questions and practical work', () => {
    const { bundle, review } = load(code)
    expect(review.audience.length).toBeGreaterThan(0)
    expect(review.prerequisites.length).toBeGreaterThan(0)
    expect(review.learningObjectives.length).toBeGreaterThan(0)
    expect(new Set(review.learningObjectives)).toEqual(new Set(bundle.chapters.flatMap(ch => ch.objectives)))
    const exams = new Set(bundle.examQuestions.map(q => q.code))
    const blocks = new Set(bundle.chapters.flatMap(ch => ch.blocks.map(b => b.code)))
    for (const objective of review.learningObjectives as string[]) {
      const mapping = review.objectiveCoverage.find((m: { objective: string }) => m.objective === objective)
      expect(mapping, objective).toBeDefined()
      expect(mapping.chapters.length).toBeGreaterThan(0)
      expect(mapping.chapters.every((n: number) => bundle.chapters.some(ch => ch.position === n))).toBe(true)
      if (mapping.examQuestionCodes.length === 0) {
        expect(mapping.assessmentCoverage).toBe('NOT_EXPLICIT')
        expect(mapping.coverageNote.length).toBeGreaterThan(30)
        expect(review.reviewStatus).toBe('OPEN')
      }
      expect(mapping.examQuestionCodes.every((q: string) => exams.has(q))).toBe(true)
      expect(mapping.practiceBlockCodes.length).toBeGreaterThan(0)
      expect(mapping.practiceBlockCodes.every((b: string) => blocks.has(b))).toBe(true)
    }
  })
  it('documents a 240–300 minute estimate including the exam without claiming a measured pilot', () => {
    const { bundle, review } = load(code)
    expect(review.studyPlan.chapterMinutes).toEqual(bundle.chapters.map(ch => ch.estimatedMinutes))
    expect(review.studyPlan.examMinutes).toBeGreaterThanOrEqual(30)
    const total = bundle.chapters.reduce((n, ch) => n + ch.estimatedMinutes, 0) + review.studyPlan.examMinutes
    expect(total).toBeGreaterThanOrEqual(240)
    expect(total).toBeLessThanOrEqual(300)
    expect(review.studyPlan.totalMinutes).toBe(total)
    expect(review.studyPlan.measured).toBe(false)
    expect(review.studyPlan.rationale.length).toBeGreaterThan(50)
  })
  it('retains the approved threshold, exact answer sets and conservative unanswered scoring', () => {
    const { bundle, review } = load(code)
    expect(review.certificate).toMatchObject({ passingScore: 40, questionCount: 50, attemptLimit: null, legalQualification: false })
    expect(bundle.definition.exam).toMatchObject({ questionCount: 50, passingScore: 40, passingPercentage: 80 })
    for (const q of [...bundle.chapters.flatMap(ch => ch.questions), ...bundle.examQuestions, ...bundle.retentionQuestions]) {
      expect(isExamAnswerCorrect(q.type, answer(q), q.correctAnswer), q.code).toBe(true)
      expect(isExamAnswerCorrect(q.type, null, q.correctAnswer), q.code).toBe(false)
      const wrong = q.options.find(o => !o.isCorrect)!.value
      expect(isExamAnswerCorrect(q.type, q.type === 'SINGLE_CHOICE' ? wrong : [...q.correctAnswer, wrong], q.correctAnswer), q.code).toBe(false)
    }
    for (const good of [0, 39, 40, 50]) {
      const result = scoreExam(bundle.examQuestions.map((q, i) => ({ type: q.type, correctAnswer: q.correctAnswer, answer: i < good ? answer(q) : null })), 40)
      expect(result.score).toBe(good)
      expect(result.passed).toBe(good >= 40)
    }
  })
  it('renders every content block through the existing player without exposing assessment keys', () => {
    const { bundle } = load(code)
    const chapters: string[] = []
    for (const chapter of bundle.chapters) {
      const markup = chapter.blocks.map((b, index) => {
        if (b.type === 'TEXT') expect(Array.isArray(b.data.paragraphs) && b.data.paragraphs.length > 0, b.code).toBe(true)
        if (b.type === 'SUMMARY') expect(Array.isArray(b.data.items) && b.data.items.length > 0, b.code).toBe(true)
        if (b.type === 'PROCESS') expect(Array.isArray(b.data.steps) && b.data.steps.length > 0, b.code).toBe(true)
        const q = chapter.questions.find(q => q.code === b.questionCode)
        if (q) expect([b.data.prompt, b.data.body], b.code).toContain(q.questionText)
        const html = renderToStaticMarkup(createElement(LessonContent, { index, readOnly: true, onAnswered: () => {}, block: { id: b.code, position: index + 1, type: b.type, data: b.data, question: q ? { id: q.code, type: q.type, options: q.options.map(({ value, text }) => ({ value, text })) } : null } }))
        expect(html, b.code).not.toContain('Dit contentonderdeel kan niet worden weergegeven.')
        expect(html, b.code).not.toMatch(/correctAnswer|isCorrect|answerKey/)
        expect(html.length, b.code).toBeGreaterThan(20)
        return `<div class="review-block">${html}</div>`
      }).join('\n')
      chapters.push(`<section id="h${chapter.position}"><h2>Hoofdstuk ${chapter.position}: ${escape(chapter.title)}</h2>${markup}</section>`)
    }
    if (process.env.ACADEMY_CONTENT_PREVIEW === 'true') {
      const out = path.resolve('.local-storage', 'academy-content-review')
      mkdirSync(out, { recursive: true })
      const cssDir = path.resolve('.next', 'static', 'chunks')
      const css = readdirSync(cssDir).filter(f => f.endsWith('.css')).map(f => readFileSync(path.join(cssDir, f), 'utf8')).join('\n')
      writeFileSync(path.join(out, `${code}.html`), `<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)} — contentreview</title><style>${css}</style><style>html{scroll-behavior:auto}body{overflow-wrap:anywhere;font-family:Arial,sans-serif;color:#10243a;background:#f5f8fc}main{max-width:850px;margin:auto;padding:24px}.review-block{background:white;padding:24px;margin:16px 0;border:1px solid #dce5ee;border-radius:12px}summary,a{cursor:pointer}a:focus-visible{outline:3px solid #075caa;outline-offset:4px}h1{font-size:2rem;font-weight:bold}section>h2{margin-top:48px;font-size:1.5rem;font-weight:bold}nav{display:flex;flex-wrap:wrap;gap:16px}button,input{max-width:100%}</style><main><p>AFGESCHERMDE LOKALE CONTENTREVIEW — CONCEPT, GEEN INSCHRIJVING OF PUBLICATIE</p><h1>${escape(title)}</h1><p>${escape(bundle.courseVersion)}. De bestaande lesrenderer toont de volledige inhoud. Antwoordvelden staan in alleen-lezenstand; deze weergave vervangt geen ingelogde Academy-acceptatie.</p><nav aria-label="Hoofdstukken">${bundle.chapters.map(ch => `<a href="#h${ch.position}">Hoofdstuk ${ch.position}</a>`).join('')}</nav>${chapters.join('\n')}<h2>Bronnen voor inhoudelijke review</h2><ul>${bundle.sources.map(s => `<li>${escape(s.title)} — ${escape(s.status)} — ${escape(s.url)}</li>`).join('')}</ul></main></html>`)
    }
  })
})


describe('targeted content corrections and history', () => {
  it('normalizes Windows and Linux line endings for historical source checksums', () => {
    expect(sourceChecksum('historische bron\r\ninhoud\r\n')).toBe(sourceChecksum('historische bron\ninhoud\n'))
    expect(sourceChecksum('gewijzigde bron\n')).not.toBe(sourceChecksum('historische bron\n'))
  })
  it('preserves WL-001 historical sources and the already shuffled retention bank', () => {
    const { bundle, review } = load('WL-001')
    for (const source of review.sourceFiles) {
      expect(sourceChecksum(readFileSync(source.path, 'utf8')), source.path).toBe(source.sha256CanonicalLF)
    }
    for (const original of learningRetentionQuestions) {
      const q = bundle.retentionQuestions.find(q => q.code === `WL001-RET-${original.code}`)!
      expect(q.questionText).toBe(original.questionText)
      expect(q.options).toEqual(original.options)
      expect(q.correctAnswer).toEqual(original.correctAnswer)
      expect(q.version).toBe(original.questionVersion)
    }
  })
  it('preserves WL-001 canonical exam questions and correct answers while fixing the formative type', () => {
    const { bundle } = load('WL-001')
    const original = parseFinalExamQuestionBank(readFileSync('prisma/seed-data/WL-001_FINAL_EXAM_v1.1_CANONICAL_QUESTION_BANK.md', 'utf8'))
    for (const previous of original) {
      const q = bundle.examQuestions.find(q => q.code === `WL001-EX-${previous.code}`)!
      expect(q.questionText).toBe(previous.questionText)
      expect(q.type).toBe(previous.type)
      expect(q.correctAnswer).toEqual(previous.correctAnswer)
    }
    const fixed = bundle.chapters.flatMap(ch => ch.questions).find(q => q.code === 'WL001-H6-NOORD-VIJF')!
    expect(fixed.type).toBe('SINGLE_CHOICE')
    expect(fixed.correctAnswer).toHaveLength(1)
    expect(fixed.version).toBeGreaterThan(1)
  })
  it('preserves the complete WL-002 assessment semantics from the latest 1.2 draft', () => {
    const { bundle } = load('WL-002')
    expect(bundle.chapters.flatMap(ch => ch.questions)).toEqual(wl002RemediatedCourseBundle.chapters.flatMap(ch => ch.questions))
    expect(bundle.examQuestions).toEqual(wl002RemediatedCourseBundle.examQuestions)
    expect(bundle.retentionQuestions).toEqual(wl002RemediatedCourseBundle.retentionQuestions)
  })
  it('preserves the original WL-003 source and versions only the changed questions', () => {
    const { bundle, review } = load('WL-003')
    const source = review.evidence.sourceFiles[0]
    const raw = readFileSync(source.path)
    expect(sourceChecksum(raw.toString('utf8'))).toBe(source.sha256CanonicalLF)
    const old = validateAcademyBundle(JSON.parse(raw.toString('utf8')))
    const questions = (value: typeof bundle) => [...value.chapters.flatMap(ch => ch.questions), ...value.examQuestions, ...value.retentionQuestions]
    const oldQuestions = new Map(questions(old).map(q => [q.code, q]))
    for (const q of questions(bundle)) {
      const previous = oldQuestions.get(q.code)!
      if (review.evidence.changedQuestionRevisions.includes(q.code)) expect(q.version).toBe(previous.version + 1)
      else expect(q).toEqual(previous)
    }
  })
  it('retains the explicit incident, screen-work and qualification corrections in WL-003', () => {
    const { bundle, review } = load('WL-003')
    const blocks = new Map(bundle.chapters.flatMap(ch => ch.blocks).map(b => [b.code, b]))
    for (const assertion of review.evidence.regressionAssertions) {
      const block = blocks.get(assertion.blockCode)
      expect(block).toBeDefined()
      const content = JSON.stringify(block!.data)
      for (const expected of assertion.mustContain) expect(content).toContain(expected)
      for (const forbidden of assertion.mustNotContain) expect(content).not.toContain(forbidden)
    }
  })
})
