'use server'

import { cookies, headers } from 'next/headers'
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
import {
  assertPublicIntakeRequestAllowed,
  PUBLIC_INTAKE_RATE_LIMIT_MESSAGE,
  PublicIntakeAbuseProtectionError,
  type PublicIntakeAbuseContext,
} from '@/lib/public-intake/public-intake-abuse-protection'

export type PublicIntakeActionResult =
  | { ok: true; draft: PublicIntakeDraftView }
  | { ok: false; message: string; invalidSession?: boolean }

export type AbandonPublicIntakeActionResult =
  | { ok: true }
  | { ok: false; message: string }

async function completedDraft(
  draft: PublicIntakeDraftView,
  abuseContext: PublicIntakeAbuseContext,
): Promise<PublicIntakeDraftView> {
  return attachAdviceDossierForCurrentUser(
    await enrichPublicIntakeDraftWithAIClassification(draft, { abuseContext }),
  )
}

async function readPublicIntakeSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(PUBLIC_INTAKE_COOKIE_NAME)?.value
}

function actionError(error: unknown): PublicIntakeActionResult {
  if (error instanceof PublicIntakeAbuseProtectionError) {
    return { ok: false, message: PUBLIC_INTAKE_RATE_LIMIT_MESSAGE }
  }
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

async function abuseContext(
  sessionToken?: string,
): Promise<PublicIntakeAbuseContext> {
  return {
    requestHeaders: await headers(),
    sessionToken: sessionToken ?? await readPublicIntakeSessionToken(),
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
    const requestContext = await abuseContext()
    await assertPublicIntakeRequestAllowed(requestContext)
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
            { ...requestContext, sessionToken: result.sessionToken },
          ),
        }
      }
    }
    return {
      ok: true,
      draft: await completedDraft(result.draft, {
        ...requestContext,
        sessionToken: result.sessionToken,
      }),
    }
  } catch (error) {
    return actionError(error)
  }
}

export async function resumePublicIntakeDraftAction() {
  const requestContext = await abuseContext()
  await assertPublicIntakeRequestAllowed(requestContext)
  return completedDraft(
    await resumePublicIntakeDraft(
      requestContext.sessionToken,
    ),
    requestContext,
  )
}

export async function recordPublicIntakeAnswerAction(
  input: RecordPublicIntakeAnswerInput,
): Promise<PublicIntakeActionResult> {
  try {
    const requestContext = await abuseContext()
    await assertPublicIntakeRequestAllowed(requestContext)
    return {
      ok: true,
      draft: await completedDraft(
        await recordPublicIntakeAnswer(
          requestContext.sessionToken,
          input,
        ),
        requestContext,
      ),
    }
  } catch (error) {
    return actionError(error)
  }
}

export async function confirmPublicIntakeAIClassificationAction(): Promise<PublicIntakeActionResult> {
  try {
    const requestContext = await abuseContext()
    await assertPublicIntakeRequestAllowed(requestContext)
    const sessionToken = requestContext.sessionToken
    const draft = await enrichPublicIntakeDraftWithAIClassification(
      await getPublicIntakeDraftForSession(sessionToken),
      { abuseContext: requestContext },
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
        requestContext,
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

    const requestContext = await abuseContext()
    await assertPublicIntakeRequestAllowed(requestContext)
    const sessionToken = requestContext.sessionToken
    const draft = await enrichPublicIntakeDraftWithAIClassification(
      await getPublicIntakeDraftForSession(sessionToken),
      { abuseContext: requestContext },
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
        requestContext,
      ),
    }
  } catch (error) {
    return actionError(error)
  }
}

export async function changePublicIntakePhaseAction(toPhase: PublicIntakePhase) {
  const requestContext = await abuseContext()
  await assertPublicIntakeRequestAllowed(requestContext)
  return changePublicIntakePhase(requestContext.sessionToken, toPhase)
}

export async function clearPublicIntakeSessionAction(): Promise<void> {
  await removePublicIntakeSessionCookie()
}

export async function abandonPublicIntakeDraftAction(): Promise<AbandonPublicIntakeActionResult> {
  try {
    const requestContext = await abuseContext()
    await assertPublicIntakeRequestAllowed(requestContext)
    await abandonPublicIntakeDraftByUser(requestContext.sessionToken)
    await removePublicIntakeSessionCookie()
    return { ok: true }
  } catch (error) {
    if (error instanceof PublicIntakeAbuseProtectionError) {
      return { ok: false, message: PUBLIC_INTAKE_RATE_LIMIT_MESSAGE }
    }
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
