import { notFound, redirect } from 'next/navigation'
import { Container } from '@/components/layout/container'
import { FinalExamPlayer } from '@/components/learning/final-exam-player'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { getFinalExamPlayer } from '@/lib/learning/learning-final-exam-service'

export default async function FinalExamAttemptPage({ params }: { params: Promise<{ courseSlug: string; attemptId: string }> }) {
  const { courseSlug, attemptId } = await params
  const user = await requireLearningUser(`/e-learnings/${courseSlug}/eindtoets/${attemptId}`)
  const attempt = await getFinalExamPlayer(user.id, attemptId)
  if (!attempt) {
    if (courseSlug !== 'rie-in-de-praktijk') notFound()
    redirect(`/e-learnings/${courseSlug}/eindtoets?melding=toegang`)
  }
  return <Container className="py-8 sm:py-12">
    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-primary">Eindtoets — RI&E in de praktijk</p>
    <FinalExamPlayer
      attemptId={attempt.id}
      attemptNumber={attempt.attemptNumber}
      currentPosition={attempt.currentPosition}
      questions={attempt.questions}
      savedAnswers={attempt.answers}
    />
  </Container>
}
