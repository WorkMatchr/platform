import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { wl002CourseBundle } from './wl002-course-bundle'
import { validateAcademyBundle, academyBundleStatistics } from './academy-content-standard'
import { academyPublicationState, createAcademyDefinition, resolveAcademyDefinition } from './academy-course-definition'
import { planAcademyImport } from './academy-import-service'
import { ACADEMY_TEST_DATABASE, assertAcademyDatabaseTarget } from './academy-database-policy'
import { parseFinalExamQuestionBank } from './learning-final-exam-content'
import { isLearningAnswerCorrect } from './learning-answer-policy'

describe('Academy canonical content and safe import policy', () => {
  it('contains ten substantial chapters, practice, checks, fifty exam and hundred retention questions', () => {
    const stats = academyBundleStatistics(wl002CourseBundle)
    expect(stats).toMatchObject({ chapters: 10, formativeQuestions: 90, chapterCheckQuestions: 30, examQuestions: 50, retentionQuestions: 100 })
    expect(stats.contentBlocks).toBeGreaterThanOrEqual(300)
    expect(wl002CourseBundle.chapters.every((chapter) => chapter.blocks.filter((block) => block.type === 'TEXT').length >= 12)).toBe(true)
    expect(wl002CourseBundle.chapters.map((chapter) => chapter.position)).toEqual([1,2,3,4,5,6,7,8,9,10])
  })
  it('keeps all content draft, separate from the public catalogue and all student activations', () => {
    expect(wl002CourseBundle.contentStatus).toBe('DRAFT')
    expect(academyPublicationState('DRAFT', wl002CourseBundle.definition)).toBe('REVIEW_REQUIRED')
    expect(academyPublicationState('PUBLISHED', wl002CourseBundle.definition)).toBe('PUBLISHED')
    expect(wl002CourseBundle.definition.futureLearningBenefit).toEqual({ basis: 'COURSE_EARNED', percentage: 5, activated: false })
  })
  it('does not duplicate the WL-001 exam and retains exact correct sets', () => {
    const prior = parseFinalExamQuestionBank(readFileSync('prisma/seed-data/WL-001_FINAL_EXAM_v1.1_CANONICAL_QUESTION_BANK.md', 'utf8'))
    const stems = new Set(prior.map((question) => question.questionText.toLocaleLowerCase('nl')))
    for (const question of [...wl002CourseBundle.examQuestions, ...wl002CourseBundle.retentionQuestions]) {
      expect(stems.has(question.questionText.toLocaleLowerCase('nl'))).toBe(false)
      const answer = question.type === 'SINGLE_CHOICE' ? question.correctAnswer[0] : question.correctAnswer
      expect(isLearningAnswerCorrect(question.type, answer, question.correctAnswer)).toBe(true)
      if (question.type === 'MULTI_CHOICE') expect(isLearningAnswerCorrect(question.type, question.correctAnswer.slice(1), question.correctAnswer)).toBe(false)
    }
  })
  it('has independent chapter coverage and bounded answer-position/length bias', () => {
    const stats = academyBundleStatistics(wl002CourseBundle)
    for (const bank of [wl002CourseBundle.examQuestions, wl002CourseBundle.retentionQuestions]) {
      for (let chapter = 1; chapter <= 10; chapter++) expect(bank.filter((question) => question.chapterNumber === chapter)).toHaveLength(bank.length / 10)
    }
    expect(stats.examQuality.uniquelyLongestPercentage).toBeLessThanOrEqual(40)
    expect(stats.retentionQuality.uniquelyLongestPercentage).toBeLessThanOrEqual(40)
    expect(stats.examQuality.longestCorrectPositionRun).toBeLessThanOrEqual(4)
  })
  it.each(['duplicate', 'unknown-option', 'wrong-chapter', 'leakage', 'missing-source'] as const)('rejects invalid bundles: %s', (mutation) => {
    const bundle = structuredClone(wl002CourseBundle)
    if (mutation === 'duplicate') bundle.examQuestions[1].code = bundle.examQuestions[0].code
    if (mutation === 'unknown-option') bundle.examQuestions[0].correctAnswer = ['unknown']
    if (mutation === 'wrong-chapter') bundle.chapters[0].questions[0].chapterNumber = 2
    if (mutation === 'leakage') bundle.chapters[0].blocks[0].data.correctAnswer = 'B'
    if (mutation === 'missing-source') bundle.examQuestions[0].sourceIds = ['unknown']
    expect(() => validateAcademyBundle(bundle)).toThrow()
  })
  it('defaults to a reproducible offline plan without requiring credentials', () => {
    const a = planAcademyImport(wl002CourseBundle), b = planAcademyImport(structuredClone(wl002CourseBundle))
    expect(a.mode).toBe('DRY_RUN'); expect(a.bundleHash).toMatch(/^[a-f0-9]{64}$/); expect(b.bundleHash).toBe(a.bundleHash)
  })
  it('resolves versioned course settings and fails closed for mismatched or absent course config', () => {
    const definition = createAcademyDefinition({ code: 'WL-003', slug: 'voorbeeldopleiding', title: 'Voorbeeldopleiding', subtitle: '' })
    expect(resolveAcademyDefinition({ code: 'WL-003', slug: definition.slug, title: definition.title }, { academy: definition })).toEqual(definition)
    expect(() => resolveAcademyDefinition({ code: 'WL-002', slug: definition.slug, title: definition.title }, { academy: definition })).toThrow()
    expect(() => resolveAcademyDefinition({ code: 'WL-003', slug: definition.slug, title: definition.title }, {})).toThrow()
  })
  const safe = { databaseUrl: `postgresql://operator:synthetic@${ACADEMY_TEST_DATABASE.hostname}/neondb?sslmode=verify-full`, projectId: ACADEMY_TEST_DATABASE.projectId, branchId: ACADEMY_TEST_DATABASE.branchId, nodeEnv: 'test' }
  it('allows only the explicitly isolated project with verified TLS', () => { expect(assertAcademyDatabaseTarget(safe).projectId).toBe(ACADEMY_TEST_DATABASE.projectId) })
  it.each([
    { nodeEnv: 'production' }, { vercelEnv: 'production' }, { databaseUrl: undefined }, { databaseUrl: 'broken' },
    { databaseUrl: 'postgresql://operator:synthetic@localhost/neondb?sslmode=verify-full' }, { projectId: 'fixture-842b0f40ee' },
    { branchId: 'other' }, { databaseUrl: safe.databaseUrl.replace('verify-full', 'require') }, { databaseUrl: safe.databaseUrl.replace('/neondb', '/other') },
  ])('refuses an unauthorized import target without exposing the credential: %j', (change) => {
    expect(() => assertAcademyDatabaseTarget({ ...safe, ...change })).toThrow(/ACADEMY_IMPORT_/)
  })
})
