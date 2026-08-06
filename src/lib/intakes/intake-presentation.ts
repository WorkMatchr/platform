import type { IntakeQuestionCategory, IntakeStatus } from '@/generated/prisma/client'

export const intakeCategorySteps = [
  { category: 'HELP_REQUEST', slug: 'hulpvraag', label: 'Uw hulpvraag' },
  { category: 'DESIRED_OUTCOME', slug: 'gewenst-resultaat', label: 'Gewenst resultaat' },
  { category: 'SITUATION', slug: 'huidige-situatie', label: 'Huidige situatie' },
  { category: 'IMPACT', slug: 'omvang-en-gevolgen', label: 'Omvang en gevolgen' },
  { category: 'URGENCY', slug: 'urgentie', label: 'Urgentie' },
  { category: 'WORK_MODE', slug: 'werkwijze', label: 'Werkwijze' },
  { category: 'LOCATION', slug: 'locatie', label: 'Locatie' },
  { category: 'PLANNING', slug: 'planning', label: 'Planning' },
  { category: 'CONSTRAINTS', slug: 'randvoorwaarden', label: 'Randvoorwaarden' },
] as const satisfies ReadonlyArray<{
  category: IntakeQuestionCategory
  slug: string
  label: string
}>

export const intakeStatusLabels: Record<IntakeStatus, string> = {
  DRAFT: 'Nog invullen',
  IN_PROGRESS: 'Nog invullen',
  READY_FOR_REVIEW: 'Klaar om te publiceren',
  SUBMITTED: 'Wordt gepubliceerd',
  CONVERTED: 'Gepubliceerd',
  ARCHIVED: 'Gearchiveerd',
}

export function getIntakeCategoryBySlug(slug: string) {
  return intakeCategorySteps.find((step) => step.slug === slug)
}

export function getIntakeCategoryByKey(category: IntakeQuestionCategory) {
  return intakeCategorySteps.find((step) => step.category === category)
}

export function getNextIntakeCategory(category: IntakeQuestionCategory) {
  const index = intakeCategorySteps.findIndex((step) => step.category === category)
  return index >= 0 ? intakeCategorySteps[index + 1] : undefined
}

export function getPreviousIntakeCategory(category: IntakeQuestionCategory) {
  const index = intakeCategorySteps.findIndex((step) => step.category === category)
  return index > 0 ? intakeCategorySteps[index - 1] : undefined
}

export function getVisibleIntakeSteps(categories: readonly IntakeQuestionCategory[]) {
  const visible = new Set(categories)
  return intakeCategorySteps.filter((step) => visible.has(step.category))
}

export function getIntakeStepLabel(category: IntakeQuestionCategory, questionnaireVersion: number): string {
  if (questionnaireVersion >= 2) {
    if (category === 'HELP_REQUEST') return 'Uw hulpvraag en categorie'
    if (category === 'SITUATION') return 'Vragen over uw situatie'
    if (category === 'PLANNING') return 'Omvang van de opdracht'
    if (category === 'CONSTRAINTS') return 'Aanvullende opmerkingen'
  }
  return getIntakeCategoryByKey(category)?.label ?? category
}
