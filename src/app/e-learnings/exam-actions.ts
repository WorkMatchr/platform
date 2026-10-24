'use server'

import { redirect } from 'next/navigation'
import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { saveFinalExamAnswer, startFinalExamAttempt, submitFinalExamAttempt, updateFinalExamPosition } from '@/lib/learning/learning-final-exam-service'
import { ensureCertificateForPassedExam } from '@/lib/learning/learning-certificate-service'

const idPattern = /^[0-9a-f-]{36}$/i

export async function startFinalExamAction(courseSlug: string) {
  if (courseSlug !== 'rie-in-de-praktijk') redirect('/e-learnings')
  const user = await requireLearningUser(`/e-learnings/${courseSlug}/eindtoets`)
  try {
    const attempt = await startFinalExamAttempt(user.id)
    redirect(`/e-learnings/${courseSlug}/eindtoets/${attempt.id}`)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error
    redirect(`/e-learnings/${courseSlug}/eindtoets?melding=toegang`)
  }
}

export async function saveFinalExamAnswerAction(attemptId: string, questionId: string, answer: unknown | null) {
  if (!idPattern.test(attemptId) || !idPattern.test(questionId)) return { ok: false as const, message: 'De vraag of poging is niet beschikbaar.' }
  const user = await requireLearningUser('/e-learnings/mijn')
  try {
    await saveFinalExamAnswer(user.id, attemptId, questionId, answer)
    return { ok: true as const }
  } catch {
    return { ok: false as const, message: 'Uw antwoord kon niet veilig worden opgeslagen. Probeer het opnieuw.' }
  }
}

export async function updateFinalExamPositionAction(attemptId: string, position: number) {
  if (!idPattern.test(attemptId) || !Number.isInteger(position)) return { ok: false as const }
  const user = await requireLearningUser('/e-learnings/mijn')
  try {
    await updateFinalExamPosition(user.id, attemptId, position)
    return { ok: true as const }
  } catch {
    return { ok: false as const }
  }
}

export async function submitFinalExamAction(attemptId: string) {
  if (!idPattern.test(attemptId)) return { ok: false as const, message: 'De toets kan niet worden ingeleverd.' }
  const user = await requireLearningUser('/e-learnings/mijn')
  try {
    const submitted = await submitFinalExamAttempt(user.id, attemptId)
    if (submitted.passed) await ensureCertificateForPassedExam(user.id)
    return { ok: true as const, href: `/e-learnings/rie-in-de-praktijk/eindtoets/resultaat/${attemptId}` }
  } catch {
    return { ok: false as const, message: 'De toets kon niet worden ingeleverd. Uw opgeslagen antwoorden zijn behouden.' }
  }
}
