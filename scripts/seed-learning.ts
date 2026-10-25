import 'dotenv/config'
import { Prisma, PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
  learningChapterBlocks,
  learningChapter3Blocks,
  learningChapter3Questions,
  learningQuestions,
  learningSourceMetadata,
} from '../src/lib/learning/learning-prototype-content'
import { learningChapter2Blocks, learningChapter2Questions, learningChapter2SourceMetadata } from '../src/lib/learning/learning-chapter2-content'
import { learningChapter4Blocks, learningChapter4Questions, learningChapter4SourceMetadata } from '../src/lib/learning/learning-chapter4-content'
import { learningChapter5Blocks, learningChapter5Questions, learningChapter5SourceMetadata } from '../src/lib/learning/learning-chapter5-content'
import { learningChapter6Blocks, learningChapter6Questions, learningChapter6SourceMetadata } from '../src/lib/learning/learning-chapter6-content'
import { learningChapter7Blocks, learningChapter7Questions, learningChapter7SourceMetadata } from '../src/lib/learning/learning-chapter7-content'
import { learningChapter8Blocks, learningChapter8Questions, learningChapter8SourceMetadata } from '../src/lib/learning/learning-chapter8-content'
import { learningChapter9Blocks, learningChapter9Questions, learningChapter9SourceMetadata } from '../src/lib/learning/learning-chapter9-content'
import { learningChapter10Blocks, learningChapter10Questions, learningChapter10SourceMetadata } from '../src/lib/learning/learning-chapter10-content'
import { resolvePublicSources } from '../src/content/public-sources'

const learningCourseVersion = 'prototype-0.17'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is niet geconfigureerd.')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

async function seedLearning() {
  await prisma.$transaction(async (transaction) => {
    const existingCourse = await transaction.learningCourse.findUnique({ where: { code: 'WL-001' } })
    const course = existingCourse ?? await transaction.learningCourse.create({ data: {
        code: 'WL-001',
        slug: 'rie-in-de-praktijk',
        title: 'RI&E in de praktijk',
        description: 'Een eerste verkenning van arbeidsrisico’s, de RI&E-cyclus en het Plan van Aanpak.',
        status: 'DRAFT',
    } })
    const existingVersion = await transaction.learningCourseVersion.findUnique({
      where: { courseId_version: { courseId: course.id, version: learningCourseVersion } },
    })
    if (existingVersion?.status === 'PUBLISHED') return
    const version = existingVersion ?? await transaction.learningCourseVersion.create({ data: {
        courseId: course.id,
        version: learningCourseVersion,
        status: 'DRAFT',
        sourceMetadata: { ...learningSourceMetadata, chapter2: {
          ...learningChapter2SourceMetadata,
          sources: resolvePublicSources(learningChapter2SourceMetadata.sourceIds),
        }, chapter4: learningChapter4SourceMetadata, chapter5: { ...learningChapter5SourceMetadata, validatedSources: resolvePublicSources(learningChapter5SourceMetadata.sourceIds) }, chapter6: { ...learningChapter6SourceMetadata, validatedSources: resolvePublicSources(learningChapter6SourceMetadata.sourceIds) }, chapter7: { ...learningChapter7SourceMetadata, validatedSources: resolvePublicSources(learningChapter7SourceMetadata.sourceIds) }, chapter8: { ...learningChapter8SourceMetadata, validatedSources: resolvePublicSources(learningChapter8SourceMetadata.sourceIds) }, chapter9: { ...learningChapter9SourceMetadata, validatedSources: resolvePublicSources(learningChapter9SourceMetadata.sourceIds) }, chapter10: { ...learningChapter10SourceMetadata, validatedSources: resolvePublicSources(learningChapter10SourceMetadata.sourceIds) } } as unknown as Prisma.InputJsonValue,
    } })
    const existingChapter = await transaction.learningChapter.findUnique({
      where: { courseVersionId_slug: { courseVersionId: version.id, slug: 'waarom-een-rie' } },
    })
    const chapter = existingChapter ?? await transaction.learningChapter.create({ data: {
        courseVersionId: version.id,
        slug: 'waarom-een-rie',
        title: 'Waarom een RI&E?',
        position: 1,
        estimatedMinutes: 10,
    } })

    const existingChapter2 = await transaction.learningChapter.findUnique({
      where: { courseVersionId_slug: { courseVersionId: version.id, slug: 'wie-doet-wat' } },
    })
    const chapter2 = existingChapter2 ?? await transaction.learningChapter.create({ data: {
        courseVersionId: version.id,
        slug: 'wie-doet-wat',
        title: 'Wie doet wat?',
        position: 2,
        estimatedMinutes: 15,
    } })

    const existingChapter3 = await transaction.learningChapter.findUnique({
      where: { courseVersionId_slug: { courseVersionId: version.id, slug: 'risicos-inventariseren' } },
    })
    const chapter3 = existingChapter3 ?? await transaction.learningChapter.create({ data: {
        courseVersionId: version.id,
        slug: 'risicos-inventariseren',
        title: 'Risico’s inventariseren',
        position: 3,
        estimatedMinutes: 15,
    } })

    const existingChapter4 = await transaction.learningChapter.findUnique({
      where: { courseVersionId_slug: { courseVersionId: version.id, slug: 'risicos-beoordelen' } },
    })
    const chapter4 = existingChapter4 ?? await transaction.learningChapter.create({ data: {
      courseVersionId: version.id, slug: 'risicos-beoordelen', title: 'Risico’s beoordelen', position: 4, estimatedMinutes: 20,
    } })

    const questions = new Map<string, string>()
    const chapter5 = await transaction.learningChapter.upsert({
      where: { courseVersionId_slug: { courseVersionId: version.id, slug: 'maatregelen-bepalen' } },
      update: {},
      create: { courseVersionId: version.id, slug: 'maatregelen-bepalen', title: 'Maatregelen bepalen', position: 5, estimatedMinutes: 20 },
    })
    const chapter6 = await transaction.learningChapter.upsert({
      where: { courseVersionId_slug: { courseVersionId: version.id, slug: 'plan-van-aanpak' } },
      update: {},
      create: { courseVersionId: version.id, slug: 'plan-van-aanpak', title: 'Plan van Aanpak: van risico naar actie', position: 6, estimatedMinutes: 20 },
    })
    const chapter7 = await transaction.learningChapter.upsert({
      where: { courseVersionId_slug: { courseVersionId: version.id, slug: 'toetsing-rie' } },
      update: {},
      create: { courseVersionId: version.id, slug: 'toetsing-rie', title: 'Toetsing van de RI&E', position: 7, estimatedMinutes: 20 },
    })
    const chapter8 = await transaction.learningChapter.upsert({
      where: { courseVersionId_slug: { courseVersionId: version.id, slug: 'rie-actueel-houden' } },
      update: {},
      create: { courseVersionId: version.id, slug: 'rie-actueel-houden', title: 'RI&E actueel houden', position: 8, estimatedMinutes: 20 },
    })
    const chapter9 = await transaction.learningChapter.upsert({
      where: { courseVersionId_slug: { courseVersionId: version.id, slug: 'van-papier-naar-praktijk' } },
      update: {},
      create: { courseVersionId: version.id, slug: 'van-papier-naar-praktijk', title: 'Van papier naar praktijk', position: 9, estimatedMinutes: 20 },
    })
    const chapter10 = await transaction.learningChapter.upsert({
      where: { courseVersionId_slug: { courseVersionId: version.id, slug: 'integrale-praktijkcasus' } },
      update: {},
      create: { courseVersionId: version.id, slug: 'integrale-praktijkcasus', title: 'Integrale praktijkcasus', position: 10, estimatedMinutes: 30 },
    })
    for (const seed of [...learningQuestions, ...learningChapter2Questions, ...learningChapter3Questions, ...learningChapter4Questions, ...learningChapter5Questions, ...learningChapter6Questions, ...learningChapter7Questions, ...learningChapter8Questions, ...learningChapter9Questions, ...learningChapter10Questions]) {
      const questionVersion = seed.questionVersion ?? 1
      const existingQuestion = await transaction.learningQuestion.findUnique({ where: { code_version: { code: seed.code, version: questionVersion } } })
      const question = existingQuestion ?? await transaction.learningQuestion.create({ data: {
          code: seed.code,
          knowledgeArea: seed.knowledgeArea,
          learningObjective: seed.learningObjective,
          difficulty: seed.difficulty ?? 1,
          type: seed.type,
          questionText: seed.questionText,
          explanation: seed.explanation,
          correctAnswer: seed.correctAnswer as unknown as Prisma.InputJsonValue,
          status: 'PUBLISHED_PROTOTYPE',
          version: questionVersion,
        } })
      questions.set(seed.code, question.id)
      for (const [position, option] of seed.options.entries()) {
        const existingOption = await transaction.learningQuestionOption.findUnique({
          where: { questionId_value: { questionId: question.id, value: option.value } },
        })
        if (!existingOption) await transaction.learningQuestionOption.create({ data: { questionId: question.id, ...option, position: position + 1 } })
      }
    }

    for (const [targetChapter, blocks] of [[chapter, learningChapterBlocks], [chapter2, learningChapter2Blocks], [chapter3, learningChapter3Blocks], [chapter4, learningChapter4Blocks], [chapter5, learningChapter5Blocks], [chapter6, learningChapter6Blocks], [chapter7, learningChapter7Blocks], [chapter8, learningChapter8Blocks], [chapter9, learningChapter9Blocks], [chapter10, learningChapter10Blocks]] as const) {
      for (const [position, block] of blocks.entries()) {
        const existingBlock = await transaction.learningContentBlock.findUnique({
          where: { chapterId_position: { chapterId: targetChapter.id, position: position + 1 } },
        })
        if (!existingBlock) await transaction.learningContentBlock.create({ data: {
            chapterId: targetChapter.id,
            position: position + 1,
            type: block.type,
            data: block.data as Prisma.InputJsonValue,
            questionId: block.questionCode ? questions.get(block.questionCode) : null,
          } })
      }
    }
    const publishedAt = new Date()
    const publishedVersions = await transaction.learningCourseVersion.findMany({
      where: { courseId: course.id, status: 'PUBLISHED', id: { not: version.id } },
      select: { id: true },
    })
    for (const publishedVersion of publishedVersions) {
      await transaction.learningCourseVersion.update({ where: { id: publishedVersion.id }, data: { status: 'RETIRED' } })
    }
    await transaction.learningCourseVersion.update({
      where: { id: version.id },
      data: { status: 'PUBLISHED', publishedAt, validFrom: publishedAt },
    })
    await transaction.learningCourse.update({ where: { id: course.id }, data: { status: 'PUBLISHED' } })
  }, { timeout: 60_000 })
}

seedLearning()
  .catch((error: unknown) => {
    console.error('LEARNING_SEED_FAILED', error instanceof Error ? error.message : 'unknown')
    process.exitCode = 1
  })
  .finally(async () => prisma.$disconnect())
