import type { Prisma } from '@/generated/prisma/client'
import type { PublicIntakeAnswerView } from './public-intake-types'

export const SHARED_ASSIGNMENT_CONTEXT_VERSION = 'shared-assignment-context/1.0.0' as const
export const SHARED_CONTEXT_SECTOR_QUESTION_KEY = 'context_sector' as const

export type SharedSectorOption = Readonly<{
  code: string
  label: string
}>

export type SharedAssignmentContext = Readonly<{
  version: typeof SHARED_ASSIGNMENT_CONTEXT_VERSION
  sector: Readonly<{
    code: string
    label: string
    source: 'ORIGINAL_INPUT' | 'USER_ANSWER'
  }> | null
}>

type SectorReader = Pick<Prisma.TransactionClient, 'providerSectorTaxonomyMap'>

const sectorSignals: Readonly<Record<string, readonly RegExp[]>> = Object.freeze({
  industrie: Object.freeze([
    /\bmetaal(?:bewerking|bewerkingsbedrijf)?\b/,
    /\bproductie(?:bedrijf|omgeving)?\b/,
    /\bfabriek\b/,
    /\bbrzo(?:-bedrijf)?\b/,
    /\bseveso(?:-bedrijf)?\b/,
    /\bprocesinstallaties?\b/,
  ]),
  logistiek: Object.freeze([
    /\btransport(?:bedrijf)?\b/,
    /\blogistiek(?:bedrijf)?\b/,
    /\bchauffeurs?\b/,
    /\bmagazijn\b/,
  ]),
  zorg: Object.freeze([
    /\bzorginstelling\b/,
    /\bziekenhuis\b/,
    /\bverpleeghuis\b/,
  ]),
  onderwijs: Object.freeze([
    /\bschool\b/,
    /\bonderwijs(?:instelling)?\b/,
  ]),
  bouw: Object.freeze([
    /\bbouw(?:bedrijf|plaats)?\b/,
  ]),
  horeca: Object.freeze([/\bhoreca\b/, /\brestaurant\b/, /\bhotel\b/]),
  detailhandel: Object.freeze([/\bwinkel\b/, /\bdetailhandel\b/]),
  landbouw: Object.freeze([/\blandbouw\b/, /\bboerderij\b/, /\bagrarisch\b/]),
  'zakelijke-dienstverlening': Object.freeze([/\badviesbureau\b/, /\bzakelijke dienstverlening\b/]),
})

export async function getSharedSectorOptions(
  database: SectorReader,
): Promise<readonly SharedSectorOption[]> {
  const mappings = await database.providerSectorTaxonomyMap.findMany({
    where: {
      sector: { isActive: true },
      term: {
        isActive: true,
        version: {
          status: 'PUBLISHED',
          taxonomy: { kind: 'SECTOR' },
        },
      },
    },
    select: {
      sector: { select: { slug: true } },
      term: { select: { label: true, sortOrder: true } },
    },
    orderBy: { term: { sortOrder: 'asc' } },
  })

  return Object.freeze(
    mappings.map(({ sector, term }) => Object.freeze({ code: sector.slug, label: term.label })),
  )
}
export function inferSharedSectorCode(
  originalInput: string,
  availableSectors: readonly SharedSectorOption[],
): string | null {
  const text = originalInput.trim().toLocaleLowerCase('nl-NL')
  const availableCodes = new Set(availableSectors.map((sector) => sector.code))
  const matches = Object.entries(sectorSignals)
    .filter(([code, signals]) => availableCodes.has(code) && signals.some((signal) => signal.test(text)))
    .map(([code]) => code)

  return matches.length === 1 ? matches[0] : null
}

export function resolveSharedAssignmentContext(input: {
  originalInput: string | null
  answers: readonly PublicIntakeAnswerView[]
  sectorOptions: readonly SharedSectorOption[]
}): SharedAssignmentContext {
  const answeredSector = input.answers.find(
    (answer) =>
      answer.questionKey === SHARED_CONTEXT_SECTOR_QUESTION_KEY &&
      answer.disposition === 'ANSWERED' &&
      typeof answer.value === 'string',
  )
  const sectorCode = answeredSector?.value as string | undefined
  const answeredOption = sectorCode
    ? input.sectorOptions.find((sector) => sector.code === sectorCode)
    : null
  const inferredCode = !answeredOption && input.originalInput
    ? inferSharedSectorCode(input.originalInput, input.sectorOptions)
    : null
  const inferredOption = inferredCode
    ? input.sectorOptions.find((sector) => sector.code === inferredCode)
    : null
  const option = answeredOption ?? inferredOption

  return Object.freeze({
    version: SHARED_ASSIGNMENT_CONTEXT_VERSION,
    sector: option
      ? Object.freeze({
          code: option.code,
          label: option.label,
          source: answeredOption ? 'USER_ANSWER' : 'ORIGINAL_INPUT',
        })
      : null,
  })
}
