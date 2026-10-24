'use server'

import { requireLearningUser } from '@/lib/learning/learning-authorization'
import { answerMyAnnualRetentionQuestion, setMyAnnualReminderConsent } from '@/lib/learning/learning-retention-annual-service'
import { answerMyRetentionQuestion, startMyRetentionParticipation, stopMyRetentionParticipation } from '@/lib/learning/learning-retention-service'

export async function answerAnnualRetentionQuestionAction(position: number, answer: unknown) {
  if (!Number.isInteger(position) || position < 1 || position > 10) {
    return { ok: false as const, message: 'Deze vraag is niet beschikbaar.' }
  }
  const user = await requireLearningUser('/e-learnings/mijn')
  try {
    return { ok: true as const, result: await answerMyAnnualRetentionQuestion(user.id, position, answer) }
  } catch (error) {
    if (error instanceof Error && error.message === 'ANNUAL_ANSWER_ALREADY_FINAL') {
      return { ok: false as const, message: 'Dit antwoord is al definitief opgeslagen en kan niet meer worden gewijzigd.' }
    }
    if (error instanceof Error && error.message === 'ANNUAL_CHECK_COMPLETED') {
      return { ok: false as const, message: 'Deze jaarlijkse kennischeck is al afgerond.' }
    }
    return { ok: false as const, message: 'Uw antwoord kon niet worden gecontroleerd. Probeer het opnieuw.' }
  }
}

export async function startRetentionParticipationAction(formData: FormData) {
  const user = await requireLearningUser('/e-learnings/mijn')
  const consent = formData.get('consent') === 'yes'
  try {
    const participation = await startMyRetentionParticipation(user.id, consent)
    const message = participation.status === 'STOPPED'
      ? 'Deze deelname is eerder gestopt en wordt niet automatisch opnieuw gestart.'
      : participation.status === 'COMPLETED' ? 'Uw kennisbehoudprogramma is afgerond.' : 'Uw deelname is gestart.'
    return { ok: true as const, participationId: participation.id, message }
  } catch (error) {
    const message = error instanceof Error && error.message === 'RETENTION_CONSENT_REQUIRED'
      ? 'Geef eerst expliciet toestemming om deel te nemen.'
      : error instanceof Error && error.message === 'RETENTION_NOT_ELIGIBLE'
        ? 'Kennisbehoud is beschikbaar nadat u de opleiding en eindtoets heeft afgerond.'
        : error instanceof Error && error.message === 'RETENTION_PROGRAM_NOT_AVAILABLE'
          ? 'Kennisbehoud is op dit moment nog niet beschikbaar.'
          : 'Deelname kon niet worden gestart. Probeer het opnieuw.'
    return { ok: false as const, message }
  }
}

export async function answerRetentionQuestionAction(input: { participationId: string; checkId: string; weeklyQuestionId: string; answer: unknown }) {
  if (![input.participationId, input.checkId, input.weeklyQuestionId].every((id) => /^[0-9a-f-]{36}$/i.test(id))) {
    return { ok: false as const, message: 'Deze vraag is niet beschikbaar.' }
  }
  const user = await requireLearningUser('/e-learnings/mijn')
  try {
    const result = await answerMyRetentionQuestion(user.id, input.participationId, input.checkId, input.weeklyQuestionId, input.answer)
    return { ok: true as const, result }
  } catch (error) {
    const message = error instanceof Error && error.message === 'RETENTION_ANSWER_ALREADY_FINAL'
      ? 'Dit antwoord is al definitief opgeslagen en kan niet meer worden gewijzigd.'
      : error instanceof Error && error.message === 'INVALID_RETENTION_ANSWER'
        ? 'Kies een geldig antwoord voordat u verdergaat.'
        : 'Uw antwoord kon niet worden gecontroleerd. Probeer het opnieuw.'
    return { ok: false as const, message }
  }
}

export async function stopRetentionParticipationAction(participationId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(participationId)) return { ok: false as const, message: 'Deelname niet gevonden.' }
  const user = await requireLearningUser('/e-learnings/mijn')
  try {
    await stopMyRetentionParticipation(user.id, participationId)
    return { ok: true as const }
  } catch {
    return { ok: false as const, message: 'Kennisbehoud kon niet worden gestopt. Probeer het opnieuw.' }
  }
}

export async function setAnnualReminderConsentAction(consent: boolean) {
  const user = await requireLearningUser('/e-learnings/mijn')
  try {
    const result = await setMyAnnualReminderConsent(user.id, consent)
    return { ok: true as const, result }
  } catch {
    return { ok: false as const, message: 'De jaarherinnering kon niet worden aangepast. Controleer uw opleidingsstatus en probeer het opnieuw.' }
  }
}
