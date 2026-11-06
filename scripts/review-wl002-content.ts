import { readFileSync, writeFileSync } from 'node:fs'
import { wl002CourseBundle as bundle } from '../src/lib/learning/wl002-course-bundle'
import { academyBundleStatistics, academyContentQuality, type AcademyQuestion } from '../src/lib/learning/academy-content-standard'
import { parseFinalExamQuestionBank } from '../src/lib/learning/learning-final-exam-content'
import { learningChapterBlocks, learningChapter3Blocks, learningQuestions, learningChapter3Questions } from '../src/lib/learning/learning-prototype-content'
import { learningChapter2Blocks, learningChapter2Questions } from '../src/lib/learning/learning-chapter2-content'
import { learningChapter4Blocks, learningChapter4Questions } from '../src/lib/learning/learning-chapter4-content'
import { learningChapter5Blocks, learningChapter5Questions } from '../src/lib/learning/learning-chapter5-content'
import { learningChapter6Blocks, learningChapter6Questions } from '../src/lib/learning/learning-chapter6-content'
import { learningChapter7Blocks, learningChapter7Questions } from '../src/lib/learning/learning-chapter7-content'
import { learningChapter8Blocks, learningChapter8Questions } from '../src/lib/learning/learning-chapter8-content'
import { learningChapter9Blocks, learningChapter9Questions } from '../src/lib/learning/learning-chapter9-content'
import { learningChapter10Blocks, learningChapter10Questions } from '../src/lib/learning/learning-chapter10-content'

const normalize = (value: string) => value.toLocaleLowerCase('nl').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const words = (value: string) => normalize(value).split(' ').filter(Boolean).length
const formative = bundle.chapters.flatMap((chapter) => chapter.questions)
const all = [...formative, ...bundle.examQuestions, ...bundle.retentionQuestions]
const legacyBlocks = [learningChapterBlocks, learningChapter2Blocks, learningChapter3Blocks, learningChapter4Blocks, learningChapter5Blocks, learningChapter6Blocks, learningChapter7Blocks, learningChapter8Blocks, learningChapter9Blocks, learningChapter10Blocks]
const legacyQuestions = [learningQuestions, learningChapter2Questions, learningChapter3Questions, learningChapter4Questions, learningChapter5Questions, learningChapter6Questions, learningChapter7Questions, learningChapter8Questions, learningChapter9Questions, learningChapter10Questions]
const legacyExam = parseFinalExamQuestionBank(readFileSync('prisma/seed-data/WL-001_FINAL_EXAM_v1.1_CANONICAL_QUESTION_BANK.md', 'utf8'))
function measure(questions: AcademyQuestion[]) {
  const single = questions.filter((question) => question.type === 'SINGLE_CHOICE')
  return { ...academyContentQuality(questions), longestCodes: single.filter((q) => q.options.every((o) => o.isCorrect || o.text.length < q.options.find((o) => o.isCorrect)!.text.length)).map((q) => q.code),
    shortestCodes: single.filter((q) => q.options.every((o) => o.isCorrect || o.text.length > q.options.find((o) => o.isCorrect)!.text.length)).map((q) => q.code) }
}
const optionKey = (question: AcademyQuestion) => JSON.stringify(question.options.map((option) => [normalize(option.text), option.isCorrect]).sort())
const reused = formative.flatMap((q) => bundle.retentionQuestions.filter((r) => optionKey(q) === optionKey(r)).map((r) => [q.code, r.code]))
const tokenSet = (value: string) => new Set(normalize(value).split(' ').filter((token) => token.length > 3))
const similar: { a: string; b: string; similarity: number }[] = []
const legacySimilar: { academy: string; wl001: string; similarity: number }[] = []
for (const question of all) for (const legacy of legacyExam) {
  const a = tokenSet(question.questionText), b = tokenSet(legacy.questionText)
  const similarity = [...a].filter((token) => b.has(token)).length / new Set([...a, ...b]).size
  if (similarity >= 0.4) legacySimilar.push({ academy: question.code, wl001: legacy.code, similarity: Math.round(similarity * 100) })
}
for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
  const a = tokenSet(all[i].questionText), b = tokenSet(all[j].questionText)
  const union = new Set([...a, ...b]).size
  const similarity = [...a].filter((token) => b.has(token)).length / union
  if (similarity >= 0.5) similar.push({ a: all[i].code, b: all[j].code, similarity: Math.round(similarity * 100) })
}
const report = {
  stats: academyBundleStatistics(bundle), formative: measure(formative), exam: measure(bundle.examQuestions), retention: measure(bundle.retentionQuestions),
  duplicateStems: all.length - new Set(all.map((question) => normalize(question.questionText))).size,
  exactLegacyExamOverlap: all.filter((q) => legacyExam.some((old) => normalize(old.questionText) === normalize(q.questionText))).map((q) => q.code),
  reusedFormativeRetentionOptions: reused, similarStems: similar, legacySimilar,
  chapters: bundle.chapters.map((chapter, index) => ({ chapter: chapter.position, title: chapter.title, objectives: chapter.objectives.length, blocks: chapter.blocks.length, textWords: words(JSON.stringify(chapter.blocks.filter((block) => !block.questionCode).map((block) => block.data))), practiceCases: chapter.blocks.filter((block) => block.data.label === 'Praktijkcasus').length, questions: chapter.questions.length, checks: chapter.chapterCheckCodes.length, legacyBlocks: legacyBlocks[index].length, legacyQuestions: legacyQuestions[index].length })),
}
if (process.argv.includes('--write')) {
  const cell = (value: unknown) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')
  const lines = ['# WL-002 — reproduceerbare automatische reviewbijlage', '', 'Runcontext: 25 oktober 2026; `npx tsx scripts/review-wl002-content.ts --write`. Geen contentmutatie of publicatie. Automatische signalen zijn geen inhoudelijk/juridisch oordeel.', '',
    '## Aantallen en metingen', '', '```json', JSON.stringify({ stats: report.stats, formative: report.formative, exam: report.exam, retention: report.retention, duplicateStems: report.duplicateStems, exactLegacyExamOverlap: report.exactLegacyExamOverlap }, null, 2), '```', '',
    '## Hoofdstukken en vergelijking', '', '| H | Titel | Leerdoelen | Blokken | Tekstwoorden* | Casussen | Vragen | Checks (inbegrepen) | WL-001 blokken/vragen |', '|---|---|---:|---:|---:|---:|---:|---:|---|',
    ...report.chapters.map((chapter) => `| ${chapter.chapter} | ${chapter.title} | ${chapter.objectives} | ${chapter.blocks} | ${chapter.textWords} | ${chapter.practiceCases} | ${chapter.questions} | ${chapter.checks} | ${chapter.legacyBlocks}/${chapter.legacyQuestions} |`), '', '*Woorden in geserialiseerde niet-vraagblokken, inclusief labels; vergelijkingsproxy, geen didactische norm.', '',
    '## Hergebruik volledige antwoordopties en correctheid', '', `${reused.length} formatieve oefeningen gebruiken exact de opties en correcte set van een retentionvraag. Dit is structureel aantoonbaar; of de andere vraagstam dezelfde set rechtvaardigt, vereist menselijke beoordeling. Prioriteit P1: controleer alle onderstaande paren vóór publicatie.`, '', '| Oefening | Retentionconcept |', '|---|---|', ...reused.map(([a,b]) => `| ${a} | ${b} |`), '',
    '## Vergelijkbare vraagstammen', '', 'Token-Jaccard ≥50% (woorden langer dan drie letters). Signaleert lexicale overeenkomst; mist semantische doublures en bewijst ze niet.', '', '| Vraag A | Vraag B | Overeenkomst |', '|---|---|---:|', ...similar.map((pair) => `| ${pair.a} | ${pair.b} | ${pair.similarity}% |`), '',
    '## Vergelijkbare vraagstammen met WL-001 v1.1', '', 'Token-Jaccard ≥40%, geen semantisch bewijs. Gemeenschappelijke leerdoelen zoals actualisatie, tijdelijke krachten en borging zijn op zichzelf toegestaan.', '', '| Academy | WL-001 examen | Overeenkomst |', '|---|---|---:|', ...legacySimilar.map((pair) => `| ${pair.academy} | ${pair.wl001} | ${pair.similarity}% |`), '',
    '## Inventaris van alle 240 vragen', '', 'Per vraag is de set technisch consistent met de opgeslagen correcte opties, is feedback aanwezig en is de hoofdstukkoppeling geldig. Afleiderplausibiliteit, eenduidigheid en inhoudelijke correctheid blijven MANUAL REVIEW REQUIRED; geen automatische goedkeuring.', '',
    '| Code | H | Type | B/T/A | Feedbackwoorden | Juridisch gemarkeerd | Vraagstam |', '|---|---:|---|---|---:|---|---|', ...all.map((q) => `| ${q.code} | ${q.chapterNumber} | ${q.type} | ${q.cognitiveLevel} | ${words(q.explanation)} | ${q.legalReviewRequired ? 'Ja' : 'Niet gemarkeerd; review blijft nodig'} | ${cell(q.questionText)} |`), '',
    '## Inventaris van alle 320 lesblokken', '', '| Code | H | Type | Woorden* | Vraagkoppeling |', '|---|---:|---|---:|---|', ...bundle.chapters.flatMap((chapter) => chapter.blocks.map((block) => `| ${block.code} | ${chapter.position} | ${block.type} | ${words(JSON.stringify(block.data))} | ${block.questionCode ?? '—'} |`)), '', ]
  writeFileSync('docs/wl002-content-review-analysis.md', lines.join('\n'), 'utf8')
}
console.log(JSON.stringify({ ...report, reusedFormativeRetentionOptions: reused.length, similarStems: similar.length }, null, 2))
