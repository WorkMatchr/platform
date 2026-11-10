import { isLocalPilot } from '@/lib/learning/learning-exam-runtime-version'
import { getPrisma } from '@/lib/prisma'
import { PilotClock } from '@/components/learning/pilot-clock'
import { findAcademyCourseByAttempt } from '@/lib/learning/academy-course-service'
import { notFound, redirect } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { FinalExamPlayer } from '@/components/learning/final-exam-player'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getFinalExamPlayer } from '@/lib/learning/learning-final-exam-service'

export default async function FinalExamAttemptPage({ params }: { params: Promise<{ courseSlug: string; attemptId: string }> }) {
  const { courseSlug, attemptId } = await params
  const user = await requireLearningUser(`/e-learnings/${courseSlug}/eindtoets/${attemptId}`)
  const course = await findAcademyCourseByAttempt(user.id, attemptId)
  if (!course || course.slug !== courseSlug) notFound()
  const attempt = await getFinalExamPlayer(user.id, attemptId)
  if (!attempt) {
    redirect(`/e-learnings/${courseSlug}/eindtoets?melding=toegang`)
  }
  const pilot=isLocalPilot() && await getPrisma().learningPilotAssignment.findUnique({where:{enrollmentId:attempt.enrollmentId},select:{id:true}})
  return <Container className="py-8 sm:py-12">
    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-primary">Eindtoets — {course.title}</p>
    {pilot && <PilotClock enrollment={attempt.enrollmentId} target={attempt.id} exam/>}
    <FinalExamPlayer
      attemptId={attempt.id}
      attemptNumber={attempt.attemptNumber}
      currentPosition={attempt.currentPosition}
      questions={attempt.questions}
      savedAnswers={attempt.answers}
    />
  </Container>
}
