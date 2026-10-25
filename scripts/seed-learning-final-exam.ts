import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { Prisma, PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { parseFinalExamQuestionBank } from '../src/lib/learning/learning-final-exam-content'

const sourcePath = 'prisma/seed-data/WL-001_FINAL_EXAM_v1.0_CANONICAL_QUESTION_BANK.md'
const bank = parseFinalExamQuestionBank(readFileSync(sourcePath, 'utf8'))
const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

function assertQuestionMatches(
  existing: { knowledgeArea: string; learningObjective: string; difficulty: number; type: string; questionText: string; explanation: string; correctAnswer: Prisma.JsonValue; options: Array<{ value: string; text: string; isCorrect: boolean; position: number }> },
  source: (typeof bank)[number],
) {
  const matches = existing.knowledgeArea === source.knowledgeArea
    && existing.learningObjective === source.title
    && existing.difficulty === source.difficulty
    && existing.type === source.type
    && existing.questionText === source.questionText
    && existing.explanation === source.explanation
    && JSON.stringify(existing.correctAnswer) === JSON.stringify(source.correctAnswer)
    && existing.options.length === source.options.length
    && existing.options.every((option, index) => option.value === source.options[index].value
      && option.text === source.options[index].text
      && option.isCorrect === source.options[index].isCorrect
      && option.position === index + 1)
  if (!matches) throw new Error(`${source.code}: bestaande QuestionVersion wijkt af van de canonieke bron; overschrijven is verboden.`)
}

async function seedFinalExam() {
  await prisma.$transaction(async (transaction) => {
    const course = await transaction.learningCourse.findUnique({ where: { code: 'WL-001' } })
    if (!course || course.status !== 'PUBLISHED') throw new Error('WL-001 is niet gepubliceerd; examseed afgebroken.')
    const courseVersion = await transaction.learningCourseVersion.findUnique({
      where: { courseId_version: { courseId: course.id, version: 'prototype-0.17' } },
      select: { id: true, status: true },
    })
    if (!courseVersion || courseVersion.status !== 'PUBLISHED') throw new Error('WL-001 prototype-0.17 is niet gepubliceerd; examseed afgebroken.')

    const exam = await transaction.learningExam.upsert({
      where: { code: 'WL-001-FINAL' },
      update: {},
      create: { courseId: course.id, code: 'WL-001-FINAL', title: 'Eindtoets — RI&E in de praktijk' },
    })
    if (exam.courseId !== course.id || exam.title !== 'Eindtoets — RI&E in de praktijk') {
      throw new Error('WL-001-FINAL bestaat met een onverwachte cursus of titel.')
    }

    const examVersion = await transaction.learningExamVersion.upsert({
      where: { examId_version: { examId: exam.id, version: 'WL-001-EXAM-1.0' } },
      update: {},
      create: {
        examId: exam.id,
        courseId: course.id,
        courseVersionId: courseVersion.id,
        version: 'WL-001-EXAM-1.0',
        questionCount: 50,
        maxScore: 50,
        passingScore: 40,
        passingPercentage: 80,
        timeLimitMinutes: null,
        attemptLimit: null,
      },
      include: { questions: { include: { question: { include: { options: { orderBy: { position: 'asc' } } } } } } },
    })
    if (examVersion.courseId !== course.id || examVersion.courseVersionId !== courseVersion.id
      || examVersion.questionCount !== 50 || examVersion.maxScore !== 50 || examVersion.passingScore !== 40
      || examVersion.passingPercentage !== 80 || examVersion.timeLimitMinutes !== null || examVersion.attemptLimit !== null) {
      throw new Error('WL-001-EXAM-1.0 bestaat met een afwijkende, niet-canonieke configuratie.')
    }

    if (examVersion.status !== 'DRAFT') {
      if (examVersion.status !== 'PUBLISHED') throw new Error('WL-001-EXAM-1.0 is niet publiceerbaar.')
      if (examVersion.questions.length !== 50) throw new Error('Gepubliceerde ExamVersion heeft niet exact 50 vragen.')
      for (const [index, source] of bank.entries()) {
        const mapping = examVersion.questions.find((item) => item.position === index + 1)
        if (!mapping || mapping.code !== source.code || mapping.chapterNumber !== source.chapterNumber
          || mapping.cognitiveLevel !== source.cognitiveLevel || mapping.isCritical !== source.isCritical
          || JSON.stringify(mapping.knowledgeAreas) !== JSON.stringify([source.knowledgeArea])) {
          throw new Error(`${source.code}: gepubliceerde exammapping wijkt af van canonieke metadata.`)
        }
        assertQuestionMatches(mapping.question, source)
      }
      return
    }

    if (examVersion.questions.length > 0 && await transaction.learningExamAttempt.count({ where: { examVersionId: examVersion.id } }) > 0) {
      throw new Error('Een ExamVersion met pogingen mag niet vanuit draft worden aangepast.')
    }

    for (const [index, source] of bank.entries()) {
      const questionCode = `WL001-EX-${source.code}`
      const question = await transaction.learningQuestion.upsert({
        where: { code_version: { code: questionCode, version: 1 } },
        update: {},
        create: {
          code: questionCode,
          knowledgeArea: source.knowledgeArea,
          learningObjective: source.title,
          difficulty: source.difficulty,
          type: source.type,
          questionText: source.questionText,
          explanation: source.explanation,
          correctAnswer: source.correctAnswer as unknown as Prisma.InputJsonValue,
          status: 'PUBLISHED_PROTOTYPE',
          version: 1,
          options: { create: source.options.map((option, position) => ({ ...option, position: position + 1 })) },
        },
        include: { options: { orderBy: { position: 'asc' } } },
      })
      assertQuestionMatches(question, source)

      const existingMapping = await transaction.learningExamQuestion.findUnique({
        where: { examVersionId_code: { examVersionId: examVersion.id, code: source.code } },
      })
      const mappingData = {
        questionId: question.id,
        position: index + 1,
        chapterNumber: source.chapterNumber,
        cognitiveLevel: source.cognitiveLevel,
        knowledgeAreas: [source.knowledgeArea],
        isCritical: source.isCritical,
      }
      if (existingMapping) {
        const isSame = existingMapping.questionId === mappingData.questionId
          && existingMapping.position === mappingData.position
          && existingMapping.chapterNumber === mappingData.chapterNumber
          && existingMapping.cognitiveLevel === mappingData.cognitiveLevel
          && JSON.stringify(existingMapping.knowledgeAreas) === JSON.stringify(mappingData.knowledgeAreas)
          && existingMapping.isCritical === mappingData.isCritical
        if (!isSame) throw new Error(`${source.code}: bestaande draftmapping wijkt af van de canonieke bron.`)
      } else {
        await transaction.learningExamQuestion.create({ data: { examVersionId: examVersion.id, code: source.code, ...mappingData } })
      }
    }

    await transaction.learningExamVersion.update({ where: { id: examVersion.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
    console.log('WL-001-EXAM-1.0 published from the canonical E01–E50 source; 50 immutable mappings; 40/50 pass; no timer; unlimited attempts.')
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60_000 })
}

seedFinalExam()
  .catch((error: unknown) => {
    console.error('LEARNING_FINAL_EXAM_SEED_FAILED', error instanceof Error ? error.message : 'unknown')
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
