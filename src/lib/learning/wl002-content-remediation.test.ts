import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { wl002CourseBundle as old } from './wl002-course-bundle'
import { wl002RemediatedCourseBundle as next } from './wl002-content-v1-2'
import { academyBundleStatistics, validateAcademyBundle } from './academy-content-standard'
import { measureQuestionBank, remediationReview } from './wl002-remediation-review'
import { wl002ObjectiveCoverage } from './wl002-objective-coverage'
import { isLearningAnswerCorrect } from './learning-answer-policy'
import { parseFinalExamQuestionBank } from './learning-final-exam-content'
import { planAcademyImport } from './academy-import-service'

const questions = (bundle: typeof next) => [...bundle.chapters.flatMap((chapter) => chapter.questions), ...bundle.examQuestions, ...bundle.retentionQuestions]
describe('WL-002 remediation v1.2 — content and historical integrity', () => {
  it('keeps v1.0 byte-equivalent as an import bundle and chooses a new draft context', () => {
    expect(planAcademyImport(old).bundleHash).toBe('ad8212686d54737aae664c19dba33054604fa750fd6073919fcd13e181e916b2')
    expect(next.courseVersion).toBe('WL-002-COURSE-1.2'); expect(next.examVersion).toBe('WL-002-EXAM-1.2')
    expect(next.definition.retention.bankVersion).toBe('WL-002-RETENTION-1.2')
    expect(next.contentStatus).toBe('DRAFT'); expect(next.reviewFlags).toEqual(old.reviewFlags)
    expect(next.definition.retention.consentVersion).toBe(old.definition.retention.consentVersion)
  })
  it('preserves structure, policies, type mix and all 240 stable answer sets/positions', () => {
    expect(academyBundleStatistics(next)).toMatchObject({ chapters: 10, contentBlocks: 320, formativeQuestions: 90, chapterCheckQuestions: 30, examQuestions: 50, retentionQuestions: 100 })
    expect(validateAcademyBundle(next)).toEqual(next)
    const before = new Map(questions(old).map((question) => [question.code, question]))
    for (const question of questions(next)) {
      const prior = before.get(question.code)!
      expect(question.version, question.code).toBe(3); expect(prior.version).toBe(1)
      expect(question.correctAnswer, question.code).toEqual(prior.correctAnswer)
      expect(question.options.map(({value,isCorrect})=>({value,isCorrect}))).toEqual(prior.options.map(({value,isCorrect})=>({value,isCorrect})))
      expect(question.type).toBe(prior.type); expect(question.chapterNumber).toBe(prior.chapterNumber)
    }
    expect(next.definition.exam).toEqual(old.definition.exam)
    for (const field of ['durationWeeks','questionsPerWeek','openAfterProgramDays','selectionPolicyVersion','consentCopy'] as const) expect(next.definition.retention[field]).toBe(old.definition.retention[field])
  })
  it('uses independent, case-specific exercise options, grammatical answers and matching feedback', () => {
    const key = (question: ReturnType<typeof questions>[number]) => JSON.stringify(question.options.map((option)=>[option.text,option.isCorrect]).sort())
    const retention = new Set(next.retentionQuestions.map(key))
    for (const question of next.chapters.flatMap((chapter)=>chapter.questions)) expect(retention.has(key(question)),question.code).toBe(false)
    const get = (code:string) => questions(next).find((question)=>question.code===code)!
    expect(get('WL002-H5-Q01').options.find((option)=>option.isCorrect)!.text).toBe('Praktijkcontrole van begrip en veilige uitvoering.')
    expect(get('WL002-H8-Q02').questionText).toMatch(/blootstellingsgegevens.*machinebeveiliging/)
    expect(get('WL002-H4-Q08').questionText).toMatch(/routeproblemen.*werktempo.*herstel/)
    expect(get('WL002-H10-Q06').options.find((option)=>option.isCorrect)!.text).toContain('opnieuw beoordelen')
    expect(get('WL002-H10-Q02').questionText).toContain('nieuwe onzekerheden')
  })
  it('reduces shortest-answer bias without forcing a position pattern or changing keys', () => {
    for (const bank of ['examQuestions','retentionQuestions'] as const) {
      const a = measureQuestionBank(old[bank]), b = measureQuestionBank(next[bank])
      expect(b.uniquelyShortestPercentage).toBeLessThan(a.uniquelyShortestPercentage)
      expect(b.uniquelyLongestPercentage).toBeLessThanOrEqual(40)
      expect(b.correctPositions).toEqual(a.correctPositions); expect(b.longestCorrectPositionRun).toBeLessThanOrEqual(3)
      expect(b.meanCorrectCharacters/b.meanIncorrectCharacters).toBeGreaterThan(0.75)
      expect(b.meanCorrectCharacters/b.meanIncorrectCharacters).toBeLessThan(1.25)
    }
  })
  it('retains exact-set scoring and first/last passing boundary policy', () => {
    for (const question of questions(next)) {
      const answer = question.type==='MULTI_CHOICE'?question.correctAnswer:question.correctAnswer[0]
      expect(isLearningAnswerCorrect(question.type,answer,question.correctAnswer)).toBe(true)
      if(question.type==='MULTI_CHOICE') {
        expect(question.correctAnswer.length).toBeGreaterThanOrEqual(2)
        expect(isLearningAnswerCorrect(question.type,question.correctAnswer.slice(1),question.correctAnswer)).toBe(false)
        expect(isLearningAnswerCorrect(question.type,[...question.correctAnswer,question.options.find((option)=>!option.isCorrect)!.value],question.correctAnswer)).toBe(false)
      }
    }
    expect(next.definition.exam.passingScore).toBe(40); expect(next.definition.exam.passingPercentage).toBe(80)
  })
  it('links all forty objectives to existing lessons, ordinary exercises and chapter checks', () => {
    expect(wl002ObjectiveCoverage).toHaveLength(10)
    for(const [index,links] of wl002ObjectiveCoverage.entries()) {
      expect(links).toHaveLength(next.chapters[index].objectives.length)
      for(const [lessons,exercises,checks] of links) {
        expect(lessons.length*exercises.length*checks.length).toBeGreaterThan(0)
        expect(lessons.every((n)=>n>=1&&n<=6)).toBe(true)
        expect(exercises.every((n)=>n>=1&&n<=6)).toBe(true)
        expect(checks.every((n)=>n>=7&&n<=9)).toBe(true)
      }
    }
    expect(next.chapters[9].blocks.filter((block)=>block.data.label==='Praktijkcasus').every((block)=>String(block.data.body).includes('Werkstroom'))).toBe(true)
  })
  it('keeps legal flags, primary source and no professional qualification claims', () => {
    expect(next.sources.find((source)=>source.id==='arbo12-wet')?.url).toContain('stb-2026-18')
    const text=JSON.stringify(next.chapters)
    for(const fragment of ['rechtstreekse raadpleging','zelfstandige en onafhankelijke','Praktisch aanbevolen','Fictief effectcontroledossier','Fictieve jaarplanning']) expect(text).toContain(fragment)
    for(const question of questions(next).filter((question)=>[1,2,4,5,7,8,10].includes(question.chapterNumber))) expect(question.legalReviewRequired).toBe(true)
  })
  it('keeps WL-001 exam separate and has a deterministic complete change register', () => {
    const prior = parseFinalExamQuestionBank(readFileSync('prisma/seed-data/WL-001_FINAL_EXAM_v1.1_CANONICAL_QUESTION_BANK.md','utf8'))
    for(const question of questions(next)) expect(prior.some((entry)=>entry.questionText===question.questionText)).toBe(false)
    const a = remediationReview(),b=remediationReview()
    expect(createHash('sha256').update(JSON.stringify(a)).digest('hex')).toBe(createHash('sha256').update(JSON.stringify(b)).digest('hex'))
    expect(a.counts.exercises).toBe(90); expect(a.counts.exam).toBe(50)
  })
})
