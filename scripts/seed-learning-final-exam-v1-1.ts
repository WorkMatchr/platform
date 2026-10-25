import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { Prisma, PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { parseFinalExamQuestionBank } from '../src/lib/learning/learning-final-exam-content'

const VERSION = 'WL-001-EXAM-1.1'
const sourcePath = 'prisma/seed-data/WL-001_FINAL_EXAM_v1.1_CANONICAL_QUESTION_BANK.md'
const bank = parseFinalExamQuestionBank(readFileSync(sourcePath, 'utf8'))
const bankV10 = parseFinalExamQuestionBank(readFileSync('prisma/seed-data/WL-001_FINAL_EXAM_v1.0_CANONICAL_QUESTION_BANK.md', 'utf8'))
const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

type QuestionWithOptions = {
  knowledgeArea: string
  learningObjective: string
  difficulty: number
  type: string
  questionText: string
  explanation: string
  correctAnswer: Prisma.JsonValue
  options: Array<{ value: string; text: string; isCorrect: boolean; position: number }>
}

function questionMatches(existing: QuestionWithOptions, source: (typeof bank)[number]) {
  return existing.knowledgeArea === source.knowledgeArea
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
}

function assertQuestionMatches(existing: QuestionWithOptions, source: (typeof bank)[number], version: number) {
  if (!questionMatches(existing, source)) {
    throw new Error(`${source.code} QuestionVersion ${version} wijkt af van de v1.1-bron; overschrijven is verboden.`)
  }
}

function assertMappingMatches(mapping: {
  position: number
  code: string
  chapterNumber: number
  cognitiveLevel: string
  knowledgeAreas: string[]
  isCritical: boolean
  question: QuestionWithOptions
}, source: (typeof bank)[number], index: number) {
  if (mapping.position !== index + 1 || mapping.code !== source.code || mapping.chapterNumber !== source.chapterNumber
    || mapping.cognitiveLevel !== source.cognitiveLevel || mapping.isCritical !== source.isCritical
    || JSON.stringify(mapping.knowledgeAreas) !== JSON.stringify([source.knowledgeArea])) {
    throw new Error(`${source.code}: v1.1-exammapping wijkt af van de canonieke bron.`)
  }
  if (!questionMatches(mapping.question, source)) throw new Error(`${source.code}: v1.1 verwijst naar afwijkende QuestionVersion.`)
}

async function seedFinalExamV11() {
  await prisma.$transaction(async (transaction) => {
    const course = await transaction.learningCourse.findUnique({ where: { code: 'WL-001' } })
    if (!course || course.status !== 'PUBLISHED') throw new Error('WL-001 is niet gepubliceerd; examseed afgebroken.')
    const courseVersion = await transaction.learningCourseVersion.findUnique({
      where: { courseId_version: { courseId: course.id, version: 'prototype-0.17' } },
      select: { id: true, status: true },
    })
    if (!courseVersion || courseVersion.status !== 'PUBLISHED') throw new Error('WL-001 prototype-0.17 is niet gepubliceerd; examseed afgebroken.')

    const exam = await transaction.learningExam.findUnique({ where: { code: 'WL-001-FINAL' } })
    if (!exam || exam.courseId !== course.id) throw new Error('Seed v1.0 eerst de gepubliceerde WL-001-toets voordat v1.1 wordt toegevoegd.')
    const v10 = await transaction.learningExamVersion.findUnique({
      where: { examId_version: { examId: exam.id, version: 'WL-001-EXAM-1.0' } },
      include: {
        questions: {
          include: {
            question: { include: { options: { orderBy: { position: 'asc' } } } },
          },
        },
      },
    })
    if (!v10 || !['PUBLISHED', 'RETIRED'].includes(v10.status) || v10.courseVersionId !== courseVersion.id || v10.questions.length !== 50
      || v10.questionCount !== 50 || v10.maxScore !== 50 || v10.passingScore !== 40 || v10.passingPercentage !== 80
      || v10.timeLimitMinutes !== null || v10.attemptLimit !== null) {
      throw new Error('WL-001-EXAM-1.0 ontbreekt of wijkt af; v1.1 is niet veilig publiceerbaar.')
    }
    for (const [index, source] of bankV10.entries()) {
      const mapping = v10.questions.find((item) => item.position === index + 1)
      if (!mapping || mapping.code !== source.code || mapping.chapterNumber !== source.chapterNumber
        || mapping.cognitiveLevel !== source.cognitiveLevel || mapping.isCritical !== source.isCritical
        || JSON.stringify(mapping.knowledgeAreas) !== JSON.stringify([source.knowledgeArea])) {
        throw new Error(`${source.code}: de gepubliceerde v1.0-mapping wijkt af; v1.0 mag niet worden aangepast.`)
      }
      assertQuestionMatches(mapping.question, source, 1)
    }

    const version = await transaction.learningExamVersion.upsert({
      where: { examId_version: { examId: exam.id, version: VERSION } },
      update: {},
      create: {
        examId: exam.id,
        courseId: course.id,
        courseVersionId: courseVersion.id,
        version: VERSION,
        questionCount: 50,
        maxScore: 50,
        passingScore: 40,
        passingPercentage: 80,
        timeLimitMinutes: null,
        attemptLimit: null,
      },
      include: {
        questions: {
          include: {
            question: { include: { options: { orderBy: { position: 'asc' } } } },
          },
        },
      },
    })
    if (version.courseId !== course.id || version.courseVersionId !== courseVersion.id || version.questionCount !== 50
      || version.maxScore !== 50 || version.passingScore !== 40 || version.passingPercentage !== 80
      || version.timeLimitMinutes !== null || version.attemptLimit !== null) {
      throw new Error(`${VERSION} bestaat met een afwijkende configuratie.`)
    }

    if (version.status === 'PUBLISHED') {
      if (v10.status !== 'RETIRED') throw new Error('WL-001-EXAM-1.0 moet als vorige gepubliceerde versie RETIRED zijn.')
      if (version.questions.length !== 50) throw new Error('Gepubliceerde ExamVersion 1.1 heeft niet exact 50 vragen.')
      for (const [index, source] of bank.entries()) {
        const mapping = version.questions.find((item) => item.position === index + 1)
        if (!mapping) throw new Error(`${source.code}: mapping ontbreekt in gepubliceerde v1.1.`)
        assertMappingMatches(mapping, source, index)
        assertQuestionMatches(mapping.question, source, mapping.question.version)
      }
      return
    }
    if (version.status !== 'DRAFT') throw new Error(`${VERSION} is niet publiceerbaar.`)
    if (v10.status !== 'PUBLISHED') throw new Error('WL-001-EXAM-1.0 moet gepubliceerd zijn voordat v1.1 wordt gepubliceerd.')
    if (version.questions.length > 0 && await transaction.learningExamAttempt.count({ where: { examVersionId: version.id } }) > 0) {
      throw new Error('Een ExamVersion met pogingen mag niet vanuit draft worden aangepast.')
    }

    for (const [index, source] of bank.entries()) {
      const code = `WL001-EX-${source.code}`
      const v10Question = await transaction.learningQuestion.findUnique({
        where: { code_version: { code, version: 1 } },
        include: { options: { orderBy: { position: 'asc' } } },
      })
      if (!v10Question) throw new Error(`${source.code}: de QuestionVersion uit v1.0 ontbreekt.`)
      const questionVersion = questionMatches(v10Question, source) ? 1 : 2
      const question = questionVersion === 1 ? v10Question : await transaction.learningQuestion.upsert({
        where: { code_version: { code, version: questionVersion } },
        update: {},
        create: {
          code,
          knowledgeArea: source.knowledgeArea,
          learningObjective: source.title,
          difficulty: source.difficulty,
          type: source.type,
          questionText: source.questionText,
          explanation: source.explanation,
          correctAnswer: source.correctAnswer as unknown as Prisma.InputJsonValue,
          status: 'PUBLISHED_PROTOTYPE',
          version: questionVersion,
          options: { create: source.options.map((option, position) => ({ ...option, position: position + 1 })) },
        },
        include: { options: { orderBy: { position: 'asc' } } },
      })
      assertQuestionMatches(question, source, questionVersion)

      const existingMapping = await transaction.learningExamQuestion.findUnique({
        where: { examVersionId_code: { examVersionId: version.id, code: source.code } },
        include: { question: { include: { options: { orderBy: { position: 'asc' } } } } },
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
        assertMappingMatches(existingMapping, source, index)
        assertQuestionMatches(existingMapping.question, source, questionVersion)
        if (existingMapping.questionId !== mappingData.questionId) throw new Error(`${source.code}: draftmapping wijkt af; aanpassen geweigerd.`)
      } else {
        await transaction.learningExamQuestion.create({ data: { examVersionId: version.id, code: source.code, ...mappingData } })
      }
    }

    // The schema permits exactly one PUBLISHED version per exam. Retiring v1.0
    // is a lifecycle-only transition; its content and scoring configuration stay immutable.
    await transaction.learningExamVersion.update({ where: { id: v10.id }, data: { status: 'RETIRED' } })
    await transaction.learningExamVersion.update({ where: { id: version.id }, data: { status: 'PUBLISHED', publishedAt: new Date() } })
    console.log(`${VERSION} gepubliceerd; v1.0 en haar pogingen zijn ongemoeid gelaten.`)
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60_000 })
}

seedFinalExamV11()
  .catch((error: unknown) => {
    console.error('LEARNING_FINAL_EXAM_V1_1_SEED_FAILED', error instanceof Error ? error.message : 'unknown')
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
