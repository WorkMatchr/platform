import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { validateAcademyBundle } from './academy-content-standard'
import { planAcademyImport } from './academy-import-service'
const load = (version: string) => validateAcademyBundle(JSON.parse(readFileSync(`content/academy/WL-001_COURSE_${version}_DRAFT.json`, 'utf8')))
const candidate = load('1.2')
const original = load('1.1')
const matrix = JSON.parse(readFileSync('docs/academy-content/WL-001-complete-coverage.json', 'utf8'))
type Binding = { objectiveCode: string; assessment: string; humanApproval: string; reviewer: null; questionCodes: string[]; questionEvidence: { code: string; version: number; correctAnswers: string[]; correctOptions: string[] }[] }
describe('WL001 complete course candidate', () => {
 it('validates losslessly and uses the importer checksum for the review evidence', () => {
  expect(validateAcademyBundle(JSON.parse(JSON.stringify(candidate)))).toEqual(candidate)
  expect(matrix.candidateChecksum).toBe(planAcademyImport(candidate).bundleHash)
  expect(matrix.sourceChecksum).toBe(planAcademyImport(original).bundleHash)
  execFileSync(process.execPath, ['scripts/prepare-wl001-complete-course.mjs', '--check'])
 })
 it('preserves the entire teaching and retention content and changes only explicit exam revisions', () => {
  const stripVersions = (value: unknown): unknown => JSON.parse(JSON.stringify(value, (key, entry) => key === 'version' ? undefined : entry))
  expect(stripVersions(candidate.chapters)).toEqual(stripVersions(original.chapters))
  expect(stripVersions(candidate.retentionQuestions)).toEqual(stripVersions(original.retentionQuestions))
  expect(candidate.definition.exam).toEqual(original.definition.exam)
  expect(candidate.examQuestions).toHaveLength(50)
  expect(candidate.retentionQuestions).toHaveLength(100)
  expect(candidate.chapters.flatMap(c => c.questions)).toHaveLength(214)
  const changed = candidate.examQuestions.flatMap((question, i) => JSON.stringify(stripVersions(question)) === JSON.stringify(stripVersions(original.examQuestions[i])) ? [] : [i+1])
  expect(changed).toEqual([3,4,6,9,10,14,16,17,20,24,25,28,30,31,32,33,35,38,39,40,43,44,50])
  for (const [i, question] of candidate.examQuestions.entries()) expect(question.version).toBe(original.examQuestions[i].version + 1)
 })
 it('binds every objective to actual versioned answer evidence without fabricating approval', () => {
  expect(matrix.objectives).toHaveLength(104)
  expect(new Set(matrix.objectives.map((r: Binding) => r.objectiveCode)).size).toBe(104)
  expect(matrix.assessmentCounts).toEqual({DIRECT: 30, DIRECT_PROPOSED: 74})
  for (const row of matrix.objectives as Binding[]) {
   expect(row.humanApproval).toBe('OPEN'); expect(row.reviewer).toBeNull()
   expect(row.questionCodes.length).toBeGreaterThan(0)
   for (const evidence of row.questionEvidence) {
    const question = candidate.examQuestions.find(q => q.code === evidence.code)!
    expect(evidence.version).toBe(question.version)
    expect(evidence.correctAnswers).toEqual(question.correctAnswer)
    expect(evidence.correctOptions).toEqual(question.options.filter(o => o.isCorrect).map(o => o.text))
   }
  }
  expect(candidate.sources.filter(s => !original.sources.some(old => old.id === s.id)).every(s => s.status === 'MANUAL_REVIEW_REQUIRED')).toBe(true)
 })
 it('keeps legally sensitive scope and exceptions subject to review', () => {
  for (const number of [4,25,30,31,32,33,35]) expect(candidate.examQuestions[number-1].legalReviewRequired).toBe(true)
  const exceptions = candidate.examQuestions[30]
  expect(exceptions.questionText + exceptions.options.map(o => o.text).join(' ')).toMatch(/40/)
  expect(exceptions.options.filter(o => o.isCorrect).map(o => o.text).join(' ')).toMatch(/25/)
  expect(matrix.limitations.join(' ')).toMatch(/429/)
 })
})
