'use server'

import { cookies } from 'next/headers'
import type { PublicIntakePhase } from '@/generated/prisma/client'
import {
  PUBLIC_INTAKE_COOKIE_NAME,
  publicIntakeCookieOptions,
  publicIntakeCookieRemovalOptions,
} from '@/lib/public-intake/public-intake-config'
import {
  abandonPublicIntakeDraftByUser,
  changePublicIntakePhase,
  createPublicIntakeDraft,
  getPublicIntakeDraftForSession,
  recordPublicIntakeAnswer,
  resumePublicIntakeDraft,
} from '@/lib/public-intake/public-intake-service'
import { PublicIntakeServiceError } from '@/lib/public-intake/public-intake-errors'
import { getRecognizableRequestInitialAnswer } from '@/lib/public-intake/public-intake-prototype'
import { enrichPublicIntakeDraftWithAIClassification } from '@/lib/public-intake/public-intake-ai-classification'
import { getAIIntakeUnderstanding } from '@/lib/public-intake/public-intake-ai-presentation'
import type { PublicIntakeDraftView } from '@/lib/public-intake/public-intake-types'
import type {
  CreatePublicIntakeDraftInput,
  RecordPublicIntakeAnswerInput,
} from '@/lib/public-intake/public-intake-validation'
import { attachAdviceDossierForCurrentUser } from '@/lib/advice-dossiers/public-intake-advice-dossier-handoff'

export type PublicIntakeActionResult =
  | { ok: true; draft: PublicIntakeDraftView }
  | { ok: false; message: string; invalidSession?: boolean }

export type AbandonPublicIntakeActionResult =
  | { ok: true }
  | { ok: false; message: string }

async function completedDraft(
  draft: PublicIntakeDraftView,
): Promise<PublicIntakeDraftView> {
  return attachAdviceDossierForCurrentUser(
    await enrichPublicIntakeDraftWithAIClassification(draft),
  )
}

async function readPublicIntakeSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(PUBLIC_INTAKE_COOKIE_NAME)?.value
}

function actionError(error: unknown): PublicIntakeActionResult {
  if (error instanceof PublicIntakeServiceError) {
    return {
      ok: false,
      message: error.message,
      invalidSession: error.code === 'ACCESS_DENIED',
    }
  }
  return {
    ok: false,
    message: 'Opslaan is nu niet gelukt. Uw keuze blijft staan; probeer het opnieuw.',
  }
}

async function removePublicIntakeSessionCookie(): Promise<void> {
  ;(await cookies()).set(
    PUBLIC_INTAKE_COOKIE_NAME,
    '',
    publicIntakeCookieRemovalOptions(),
  )
}

export async function createPublicIntakeDraftAction(
  input: CreatePublicIntakeDraftInput,
): Promise<PublicIntakeActionResult> {
  try {
    const result = await createPublicIntakeDraft(input)
    const cookieStore = await cookies()
    cookieStore.set(
      PUBLIC_INTAKE_COOKIE_NAME,
      result.sessionToken,
      publicIntakeCookieOptions(),
    )

    if (input.entryPoint === 'RECOGNIZABLE_REQUEST' && input.selectedRequestKey) {
      const initialAnswer = getRecognizableRequestInitialAnswer(input.selectedRequestKey)
      if (initialAnswer) {
        return {
          ok: true,
          draft: await completedDraft(
            await recordPublicIntakeAnswer(
              result.sessionToken,
              initialAnswer,
            ),
          ),
        }
      }
    }
    return {
      ok: true,
      draft: await completedDraft(result.draft),
    }
  } catch (error) {
    return actionError(error)
  }
}

export async function resumePublicIntakeDraftAction() {
  return completedDraft(
    await resumePublicIntakeDraft(
      await readPublicIntakeSessionToken(),
    ),
  )
}

export async function recordPublicIntakeAnswerAction(
  input: RecordPublicIntakeAnswerInput,
): Promise<PublicIntakeActionResult> {
  try {
    return {
      ok: true,
      draft: await completedDraft(
        await recordPublicIntakeAnswer(
          await readPublicIntakeSessionToken(),
          input,
        ),
      ),
    }
  } catch (error) {
    return actionError(error)
  }
}

export async function confirmPublicIntakeAIClassificationAction(): Promise<PublicIntakeActionResult> {
  try {
    const sessionToken = await readPublicIntakeSessionToken()
    const draft = await enrichPublicIntakeDraftWithAIClassification(
      await getPublicIntakeDraftForSession(sessionToken),
    )
    const understanding = getAIIntakeUnderstanding(draft.aiClassification)
    if (!understanding) {
      throw new PublicIntakeServiceError(
        'VALIDATION_ERROR',
        'Het voorstel is niet meer beschikbaar. Kies zelf het onderwerp van uw vraag.',
      )
    }

    return {
      ok: true,
      draft: await completedDraft(
        await recordPublicIntakeAnswer(
          sessionToken,
          {
            questionKey: 'guidance_topic',
            questionVersion: 1,
            disposition: 'ANSWERED',
            value: understanding.subjectCode,
          },
          { answerSource: 'AI_CONFIRMED' },
        ),
      ),
    }
  } catch (error) {
    return actionError(error)
  }
}

export async function recordPublicIntakeTopicSelectionAction(
  input: RecordPublicIntakeAnswerInput,
): Promise<PublicIntakeActionResult> {
  try {
    if (input.questionKey !== 'guidance_topic') {
      throw new PublicIntakeServiceError('VALIDATION_ERROR')
    }

    const sessionToken = await readPublicIntakeSessionToken()
    const draft = await enrichPublicIntakeDraftWithAIClassification(
      await getPublicIntakeDraftForSession(sessionToken),
    )
    const source = getAIIntakeUnderstanding(draft.aiClassification)
      ? 'USER_CORRECTED'
      : 'FALLBACK_SELECTION'

    return {
      ok: true,
      draft: await completedDraft(
        await recordPublicIntakeAnswer(sessionToken, input, {
          answerSource: source,
        }),
      ),
    }
  } catch (error) {
    return actionError(error)
  }
}

export async function changePublicIntakePhaseAction(toPhase: PublicIntakePhase) {
  return changePublicIntakePhase(await readPublicIntakeSessionToken(), toPhase)
}

export async function clearPublicIntakeSessionAction(): Promise<void> {
  await removePublicIntakeSessionCookie()
}

export async function abandonPublicIntakeDraftAction(): Promise<AbandonPublicIntakeActionResult> {
  try {
    await abandonPublicIntakeDraftByUser(await readPublicIntakeSessionToken())
    await removePublicIntakeSessionCookie()
    return { ok: true }
  } catch (error) {
    if (!(error instanceof PublicIntakeServiceError)) {
      console.error('[public-intake] Concept afsluiten mislukt.', {
        errorType: error instanceof Error ? error.name : 'UnknownError',
      })
    }
    return {
      ok: false,
      message: 'Wij konden uw huidige concept niet afsluiten. Probeer het opnieuw.',
    }
  }
}
