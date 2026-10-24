import { redirect } from 'next/navigation'
import { LessonPlayer } from '@/components/learning/lesson-player'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getLearningChapter } from '@/lib/learning/learning-query-service'

export default async function LearningChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string; chapterSlug: string }>
  searchParams: Promise<{ opnieuw?: string; version?: string }>
}) {
  const [{ courseSlug, chapterSlug }, query] = await Promise.all([params, searchParams])
  const route = `/e-learnings/${courseSlug}/leren/${chapterSlug}`
  const user = await requireLearningUser(route)
  const result = await getLearningChapter(courseSlug, chapterSlug, user.id, query.version)
  if (!result) redirect(`/e-learnings/${courseSlug}`)
  const { chapter, enrollment } = result
  const progress = chapter.progress[0]
  const introData = chapter.contentBlocks[0]?.data
  const intro = introData && typeof introData === 'object' && !Array.isArray(introData) ? introData as Record<string, unknown> : {}
  const durationLabel = typeof intro.estimatedDurationLabel === 'string'
    ? intro.estimatedDurationLabel
    : `Circa ${chapter.estimatedMinutes} minuten`
  const learningObjectives = Array.isArray(intro.learningObjectives)
    ? intro.learningObjectives.filter((objective): objective is string => typeof objective === 'string')
    : []
  const latestByQuestion = new Map<string, boolean>()
  for (const attempt of enrollment.questionAttempts) latestByQuestion.set(attempt.questionId, attempt.correct)
  const questionIds = new Set(chapter.contentBlocks.map((block) => block.questionId).filter((id): id is string => Boolean(id)))
  const questionStats = {
    correctQuestionIds: [...questionIds].filter((id) => latestByQuestion.get(id) === true),
    total: questionIds.size,
  }

  return <LessonPlayer
    courseTitle={chapter.courseVersion.course.title}
    chapterId={chapter.id}
    chapterTitle={chapter.title}
    chapterPosition={chapter.position}
    courseSlug={courseSlug}
    courseVersion={chapter.courseVersion.version}
    estimatedDurationLabel={durationLabel}
    learningObjectives={learningObjectives}
    chapterNavigation={chapter.courseVersion.chapters.map((availableChapter) => ({
      id: availableChapter.id,
      slug: availableChapter.slug,
      title: availableChapter.title,
      position: availableChapter.position,
      progressStatus: availableChapter.progress[0]?.status ?? null,
    }))}
    blocks={chapter.contentBlocks.map((block) => ({
      id: block.id,
      position: block.position,
      type: block.type,
      data: block.data,
      question: block.question,
    }))}
    completed={progress?.status === 'COMPLETED'}
    lastCompletedBlockId={progress?.lastCompletedBlockId ?? null}
    progressPercentage={progress?.progressPercentage ?? 0}
    questionStats={questionStats}
    readOnly={progress?.status === 'COMPLETED' && query.opnieuw === '1'}
  />
}
