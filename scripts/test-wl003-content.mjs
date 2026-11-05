import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const bundle = JSON.parse(readFileSync(new URL('../prisma/seed-data/WL-003_COURSE_1.0_DRAFT.json', import.meta.url), 'utf8'))
const formative = bundle.chapters.flatMap(chapter => chapter.questions)
const all = [...formative, ...bundle.examQuestions, ...bundle.retentionQuestions]
const normalize = text => text.toLocaleLowerCase('nl').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const objectiveCodes = text => text.match(/H\d+-LD\d{2}/g) ?? []

// Data acceptance checks only: no database, import execution, provider or app runtime.
test('WL-003 remains an isolated DRAFT with its own immutable identities', () => {
  assert.equal(bundle.contentStatus, 'DRAFT')
  assert.equal(bundle.definition.reviewStage, 'REVIEW_REQUIRED')
  assert.equal(bundle.definition.courseCode, 'WL-003')
  assert.equal(bundle.definition.slug, 'veilig-en-gezond-werken')
  assert.equal(bundle.courseVersion, 'WL-003-COURSE-1.0')
  assert.equal(bundle.examVersion, 'WL-003-EXAM-1.0')
  assert.equal(bundle.definition.certificateTemplateVersion, 'ACADEMY-CERT-1.0')
  assert.ok(all.every(question => question.code.startsWith('WL003-') && question.version === 1))
})
test('exam configuration preserves 40/50 and introduces no timer or attempt limit', () => {
  assert.deepEqual(bundle.definition.exam, { code: 'WL-003-FINAL', questionCount: 50, passingScore: 40, passingPercentage: 80 })
  assert.equal(bundle.definition.retention.durationWeeks, 12)
  assert.equal(bundle.definition.retention.questionsPerWeek, 5)
  assert.equal(bundle.definition.retention.openAfterProgramDays, 30)
  assert.equal(bundle.definition.futureLearningBenefit.activated, false)
})
test('duration is explicitly an unmeasured 270-minute design, not a forced runtime', () => {
  assert.equal(bundle.chapters.reduce((sum, chapter) => sum + chapter.estimatedMinutes, 0), 220)
  assert.equal(220 + 50, 270)
  assert.match(bundle.description, /nog niet met studenten gemeten/i)
})
test('ten ordered chapters with independent version-local slugs', () => {
  assert.equal(bundle.chapters.length, 10)
  assert.deepEqual(bundle.chapters.map(chapter => chapter.position), [1,2,3,4,5,6,7,8,9,10])
  assert.equal(new Set(bundle.chapters.map(chapter => chapter.slug)).size, 10)
})
for (const chapter of bundle.chapters) {
  test(`H${chapter.position}: six substantive lessons, practice cases and nine exercises`, () => {
    const lesson = chapter.blocks.filter(block => /^H\d+-L\d+-explanation$/.test(block.code))
    assert.equal(lesson.length, 6)
    assert.ok(chapter.blocks.length >= 20)
    for (const block of lesson) {
      assert.ok(block.data.paragraphs.join(' ').split(/\s+/).length >= 95, block.code)
      const prefix = block.code.replace('-explanation', '')
      assert.ok(chapter.blocks.some(item => item.code === `${prefix}-case` && item.data.body.length > 100))
      assert.ok(chapter.blocks.some(item => item.code === `${prefix}-application` && item.data.paragraphs.length === 2))
    }
    assert.equal(chapter.questions.length, 9)
    assert.equal(chapter.chapterCheckCodes.length, 3)
    const refs = chapter.blocks.flatMap(block => block.questionCode ? [block.questionCode] : [])
    assert.deepEqual([...refs].sort(), chapter.questions.map(question => question.code).sort())
    for (const question of chapter.questions) assert.equal(question.chapterNumber, chapter.position)
  })
}
test('40 objectives covered by formative, chapter check, exam and retention', () => {
  let count = 0
  for (const chapter of bundle.chapters) for (const objective of chapter.objectives) {
    const code = objectiveCodes(objective)[0]
    assert.ok(code)
    const banks = [chapter.questions, chapter.questions.filter(question => chapter.chapterCheckCodes.includes(question.code)), bundle.examQuestions, bundle.retentionQuestions]
    for (const bank of banks) assert.ok(bank.some(question => objectiveCodes(question.learningObjective).includes(code)), code)
    count++
  }
  assert.equal(count, 40)
})
test('50 separate exam questions and 100 retention questions cover every chapter', () => {
  assert.equal(formative.length, 90)
  assert.equal(bundle.examQuestions.length, 50)
  assert.equal(bundle.retentionQuestions.length, 100)
  for (let chapter = 1; chapter <= 10; chapter++) {
    assert.equal(bundle.examQuestions.filter(question => question.chapterNumber === chapter).length, 5)
    assert.equal(bundle.retentionQuestions.filter(question => question.chapterNumber === chapter).length, 10)
  }
  assert.deepEqual(bundle.examQuestions.map(question => question.code), Array.from({ length: 50 }, (_, i) => `WL003-EX-E${String(i + 1).padStart(2, '0')}`))
  assert.deepEqual(bundle.retentionQuestions.map(question => question.code), Array.from({ length: 100 }, (_, i) => `WL003-RET-R${String(i + 1).padStart(3, '0')}`))
})
test('240 unique stems/codes and nonduplicate options', () => {
  assert.equal(all.length, 240)
  assert.equal(new Set(all.map(question => question.code)).size, 240)
  assert.equal(new Set(all.map(question => normalize(question.questionText))).size, 240)
  for (const question of all) assert.equal(new Set(question.options.map(option => normalize(option.text))).size, 4, question.code)
})
test('all exact answer sets are internally consistent with no select-all multi', () => {
  for (const question of all) {
    assert.ok(['SINGLE_CHOICE', 'MULTI_CHOICE'].includes(question.type))
    assert.equal(question.options.length, 4)
    const correct = question.options.filter(option => option.isCorrect).map(option => option.value)
    assert.deepEqual([...question.correctAnswer].sort(), correct.sort(), question.code)
    assert.ok(correct.length < 4)
    assert.equal(new Set(question.correctAnswer).size, correct.length)
    assert.ok(question.type === 'SINGLE_CHOICE' ? correct.length === 1 : correct.length >= 2)
    assert.ok(question.explanation.length >= 30)
    assert.ok(question.sourceIds.length > 0)
  }
})
test('correctness metadata is absent from all student lesson block payloads', () => {
  for (const chapter of bundle.chapters) for (const block of chapter.blocks) assert.doesNotMatch(JSON.stringify(block.data), /"(?:correctAnswer|isCorrect|answerKey)"/)
})
test('multi-choice exercise blocks explicitly request all correct answers', () => {
  for (const chapter of bundle.chapters) for (const block of chapter.blocks.filter(item => item.type === 'MULTI_CHOICE')) assert.equal(block.data.instruction, 'Meerdere antwoorden zijn mogelijk. Selecteer alle juiste antwoorden.')
})
test('length indicators do not make correct single answers systematically longest or shortest', () => {
  for (const bank of [formative, bundle.examQuestions, bundle.retentionQuestions]) {
    const single = bank.filter(question => question.type === 'SINGLE_CHOICE')
    for (const direction of ['longest', 'shortest']) {
      const indicated = single.filter(question => {
        const right = question.options.find(option => option.isCorrect).text.length
        const wrong = question.options.filter(option => !option.isCorrect).map(option => option.text.length)
        return direction === 'longest' ? wrong.every(length => length < right) : wrong.every(length => length > right)
      }).length
      assert.ok(indicated / single.length <= 0.4, `${direction}: ${indicated}/${single.length}`)
    }
  }
})
test('single-choice correct positions have no run beyond three', () => {
  for (const bank of [formative, bundle.examQuestions, bundle.retentionQuestions]) {
    let last = null, run = 0
    for (const question of bank.filter(item => item.type === 'SINGLE_CHOICE')) {
      const current = question.correctAnswer[0]
      run = current === last ? run + 1 : 1
      assert.ok(run <= 3)
      last = current
    }
  }
})
test('source and metadata references are complete while legal/learning review stays open', () => {
  const ids = new Set(bundle.sources.map(source => source.id))
  assert.equal(ids.size, bundle.sources.length)
  for (const source of bundle.sources) assert.equal(new URL(source.url).protocol, 'https:')
  for (const question of all) {
    for (const id of question.sourceIds) assert.ok(ids.has(id), id)
    assert.ok(['B', 'T', 'A'].includes(question.cognitiveLevel))
    assert.ok([1,2,3].includes(question.difficulty))
    assert.ok(question.knowledgeAreas.length >= 1)
    assert.equal(typeof question.criticalConcept, 'boolean')
    assert.equal(typeof question.legalReviewRequired, 'boolean')
  }
  assert.deepEqual(bundle.reviewFlags, ['CONTENT REVIEW REQUIRED — LEGAL', 'ASSESSMENT VALIDATION REQUIRED'])
  assert.equal(bundle.sources.find(source => source.id === 'law').status, 'MANUAL_REVIEW_REQUIRED')
  assert.ok(bundle.examQuestions.some(question => question.legalReviewRequired))
})
test('no environment credentials, replacement characters or control payloads in canonical content', () => {
  const text = JSON.stringify(bundle)
  assert.doesNotMatch(text, /DATABASE_URL|BETTER_AUTH_SECRET|RESEND_API_KEY|postgres(?:ql)?:\/\/|C:\\Users\\|\uFFFD/)
  for (const question of all) assert.doesNotMatch(question.questionText, /[\u0000-\u001f]/)
})

// The readable review copies must not silently drift from the canonical source.
test('course manuscript preserves every canonical explanation, case and discussion', () => {
  const manuscript = readFileSync(new URL('../docs/wl003-course-manuscript.md', import.meta.url), 'utf8')
  for (const chapter of bundle.chapters) for (const block of chapter.blocks) {
    for (const field of ['body', 'paragraphs']) {
      const value = block.data[field]
      for (const text of Array.isArray(value) ? value : value ? [value] : []) assert.ok(manuscript.includes(text), block.code)
    }
  }
})

test('editor question review contains all 240 questions, options and learning explanations', () => {
  const review = readFileSync(new URL('../docs/wl003-question-bank-review.md', import.meta.url), 'utf8')
  for (const question of all) for (const text of [question.code, question.questionText, question.explanation, ...question.options.map(option => option.text)]) assert.ok(review.includes(text), question.code)
})

test('each of sixty case-based tasks explicitly separates assignment from discussion', () => {
  const tasks = bundle.chapters.flatMap(chapter => chapter.blocks.filter(block => block.code.endsWith('-application')))
  assert.equal(tasks.length, 60)
  for (const task of tasks) {
    assert.match(task.data.paragraphs[0], /^Werkopdracht: /)
    assert.match(task.data.paragraphs[1], /^Bespreking: /)
    assert.ok(task.data.paragraphs[0].slice('Werkopdracht: '.length).trim().length > 0)
    assert.ok(task.data.paragraphs[1].slice('Bespreking: '.length).trim().length > 0)
  }
})

test('weekly and annual consent stay separate, optional and independent of certificate validity', () => {
  const retention = bundle.definition.retention
  assert.notEqual(retention.consentVersion, retention.annualConsentVersion)
  assert.match(retention.consentCopy, /vrijwillig.*stoppen/i)
  assert.match(retention.consentCopy, /zonder reclame/i)
  assert.match(retention.consentCopy, /certificaat blijven behouden/i)
  assert.match(retention.annualConsentCopy, /afzonderlijke vrijwillige toestemming/i)
  assert.match(retention.annualConsentCopy, /vóór verzending.*ingetrokken/i)
})
