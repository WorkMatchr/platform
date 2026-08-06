import type { IntakeQuestionCategory } from '@/generated/prisma/client'
import type { IntakeDetailView, IntakeQuestionView } from '@/lib/intakes/intake-query-service'
import { getIntakeCategoryByKey } from '@/lib/intakes/intake-presentation'
import { validateMultipleLocations } from '@/lib/intakes/intake-multiple-locations'

export type IntakeAssignmentReadinessIssue = {
  code: string
  section: string
  questionId?: string
  questionKey?: string
  message: string
  editHref?: string
}

export type IntakeAssignmentReadiness = {
  isReady: boolean
  issues: IntakeAssignmentReadinessIssue[]
}

export type IntakeAssignmentReadinessQuestion = {
  id: string
  key: string
  category: IntakeQuestionCategory
  label: string
  selectedOptionValues: readonly string[]
  organizationLocationId: string | null
  textValue?: string | null
}

export type IntakeAssignmentReadinessInput = {
  intakeId: string
  questionnaireVersion: number
  missingQuestionKeys: readonly string[]
  questions: readonly IntakeAssignmentReadinessQuestion[]
  activeLocationIds: ReadonlySet<string>
}

function editHref(intakeId: string, category: IntakeQuestionCategory): string | undefined {
  const step = getIntakeCategoryByKey(category)
  return step ? `/hulpvragen/${intakeId}/${step.slug}?wijzig=1` : undefined
}

function issueForQuestion(
  input: IntakeAssignmentReadinessInput,
  question: IntakeAssignmentReadinessQuestion,
): IntakeAssignmentReadinessIssue {
  return {
    code: 'REQUIRED_ANSWER_MISSING',
    section: question.category,
    questionId: question.id,
    questionKey: question.key,
    message: question.label,
    editHref: editHref(input.intakeId, question.category),
  }
}

function locationIssue(
  input: IntakeAssignmentReadinessInput,
  message: string,
  question?: IntakeAssignmentReadinessQuestion,
): IntakeAssignmentReadinessIssue {
  return {
    code: 'LOCATION_NOT_PUBLICABLE',
    section: 'LOCATION',
    questionId: question?.id,
    questionKey: question?.key,
    message,
    editHref: `/hulpvragen/${input.intakeId}/locatie?wijzig=1`,
  }
}

/**
 * Gedeelde, deterministische bron voor de publiceerbaarheid van een intake.
 * De controlepagina en de transactionele conversie gebruiken exact dezelfde
 * issues; de publicatieservice blijft daardoor server-side autoritatief.
 */
export function evaluateIntakeAssignmentReadiness(
  input: IntakeAssignmentReadinessInput,
): IntakeAssignmentReadiness {
  const questionsByKey = new Map(input.questions.map((question) => [question.key, question]))
  const issues = input.missingQuestionKeys.map((key) => {
    const question = questionsByKey.get(key)
    return question
      ? issueForQuestion(input, question)
      : {
          code: 'REQUIRED_ANSWER_MISSING',
          section: 'INTAKE',
          questionKey: key,
          message: 'Een verplicht onderdeel van uw opdracht ontbreekt.',
        }
  })

  if (input.questionnaireVersion >= 2) {
    const modeQuestion = questionsByKey.get('LOCATION_MODE')
    const mode = modeQuestion?.selectedOptionValues[0]
    const registeredLocation = questionsByKey.get('REGISTERED_LOCATION')

    if (
      mode === 'REGISTERED' &&
      registeredLocation?.organizationLocationId &&
      !input.activeLocationIds.has(registeredLocation.organizationLocationId)
    ) {
      issues.push(locationIssue(input, 'Kies een actieve organisatielocatie.', registeredLocation))
    }

    if (mode === 'OTHER') {
      const city = questionsByKey.get('OTHER_LOCATION_CITY')
      if (!city?.textValue?.trim()) {
        issues.push(locationIssue(input, 'Vul voor de andere locatie een plaats of regio in.', city))
      }
    }

    if (mode === 'MULTIPLE') {
      const multiple = questionsByKey.get('MULTIPLE_LOCATION_DETAILS')
      const result = validateMultipleLocations(multiple?.textValue ?? '')
      if (result.generalError || Object.keys(result.errors).length > 0) {
        issues.push(locationIssue(
          input,
          result.generalError ?? 'Controleer de plaatsen of regio’s en verwijder dubbele waarden.',
          multiple,
        ))
      }
    }
  }

  const uniqueIssues = [...new Map(
    issues.map((issue) => [`${issue.code}:${issue.questionKey ?? issue.section}`, issue]),
  ).values()]

  return { isReady: uniqueIssues.length === 0, issues: uniqueIssues }
}

function selectedOptionValues(question: IntakeQuestionView): string[] {
  const selectedIds = Array.isArray(question.value)
    ? question.value
    : typeof question.value === 'string' && question.inputType === 'SINGLE_SELECT'
      ? [question.value]
      : []

  return selectedIds
    .map((optionId) => question.options.find((option) => option.id === optionId)?.value)
    .filter((value): value is string => Boolean(value))
}

export function getIntakeAssignmentReadiness(
  intake: IntakeDetailView,
): IntakeAssignmentReadiness {
  return evaluateIntakeAssignmentReadiness({
    intakeId: intake.id,
    questionnaireVersion: intake.questionnaireVersion,
    missingQuestionKeys: intake.progress.missingQuestionKeys,
    questions: intake.questions.map((question) => ({
      id: question.id,
      key: question.key,
      category: question.category,
      label: question.label,
      selectedOptionValues: selectedOptionValues(question),
      organizationLocationId:
        question.inputType === 'ORGANIZATION_LOCATION' && typeof question.value === 'string'
          ? question.value
          : null,
      textValue: typeof question.value === 'string' && (
        question.inputType === 'SHORT_TEXT' || question.inputType === 'LONG_TEXT'
      ) ? question.value : null,
    })),
    activeLocationIds: new Set(intake.locations.map((location) => location.id)),
  })
}
