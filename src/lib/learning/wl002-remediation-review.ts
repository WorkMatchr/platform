import { academyContentQuality, type AcademyQuestion } from './academy-content-standard'
import { wl002CourseBundle as before } from './wl002-course-bundle'
import { wl002RemediatedCourseBundle as after } from './wl002-content-v1-2'

export function measureQuestionBank(questions: AcademyQuestion[]) {
  const single = questions.filter((question) => question.type === 'SINGLE_CHOICE')
  const tiedMaximum = single.filter((question) => {
    const max = Math.max(...question.options.map((option) => option.text.length))
    return question.options.some((option) => option.isCorrect && option.text.length === max) && question.options.filter((option) => option.text.length === max).length > 1
  })
  const options = questions.flatMap((question) => question.options)
  const mean = (correct: boolean) => {
    const values = options.filter((option) => option.isCorrect === correct)
    return Math.round(10 * values.reduce((sum, option) => sum + option.text.length, 0) / values.length) / 10
  }
  return { ...academyContentQuality(questions), tiedMaximum: tiedMaximum.length, tiedMaximumCodes: tiedMaximum.map((question) => question.code),
    meanCorrectCharacters: mean(true), meanIncorrectCharacters: mean(false),
    cognitive: Object.fromEntries(['B', 'T', 'A'].map((level) => [level, questions.filter((question) => question.cognitiveLevel === level).length])),
    longestCodes: single.filter((question) => question.options.every((option) => option.isCorrect || option.text.length < question.options.find((option) => option.isCorrect)!.text.length)).map((question) => question.code),
    shortestCodes: single.filter((question) => question.options.every((option) => option.isCorrect || option.text.length > question.options.find((option) => option.isCorrect)!.text.length)).map((question) => question.code) }
}
export function remediationReview() {
  const questions = (bundle: typeof before) => [...bundle.chapters.flatMap((chapter) => chapter.questions), ...bundle.examQuestions, ...bundle.retentionQuestions]
  const old = new Map(questions(before).map((question) => [question.code, question]))
  const changedQuestions = questions(after).flatMap((question) => {
    const prior = old.get(question.code)!
    const fields = (Object.keys(question) as (keyof AcademyQuestion)[]).filter((field) => field !== 'version' && JSON.stringify(prior[field]) !== JSON.stringify(question[field]))
    return fields.length ? [{ code: question.code, old: prior, new: question, fields }] : []
  })
  const oldBlocks = new Map(before.chapters.flatMap((chapter) => chapter.blocks).map((block) => [block.code, block]))
  const blocks = after.chapters.flatMap((chapter) => chapter.blocks).flatMap((block) => JSON.stringify(block) === JSON.stringify(oldBlocks.get(block.code)) ? [] : [{ code: block.code, old: oldBlocks.get(block.code)!, new: block }])
  return {
    versions: { before: before.courseVersion, after: after.courseVersion },
    counts: { blocks: blocks.length, exercises: changedQuestions.filter((entry) => /-H\d+-/.test(entry.code)).length, exam: changedQuestions.filter((entry) => entry.code.includes('-EX-')).length, retention: changedQuestions.filter((entry) => entry.code.includes('-RET-')).length,
      retentionText: changedQuestions.filter((entry) => entry.code.includes('-RET-') && entry.fields.some((field) => ['questionText','options','explanation'].includes(field))).length },
    before: { formative: measureQuestionBank(before.chapters.flatMap((chapter) => chapter.questions)), exam: measureQuestionBank(before.examQuestions), retention: measureQuestionBank(before.retentionQuestions) },
    after: { formative: measureQuestionBank(after.chapters.flatMap((chapter) => chapter.questions)), exam: measureQuestionBank(after.examQuestions), retention: measureQuestionBank(after.retentionQuestions) },
    changedQuestions, blocks,
  }
}
