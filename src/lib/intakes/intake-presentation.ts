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
  DRAFT: 'Concept',
  IN_PROGRESS: 'In behandeling',
  READY_FOR_REVIEW: 'Gereed voor controle',
  SUBMITTED: 'Ingediend',
  CONVERTED: 'Omgezet naar opdracht',
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
