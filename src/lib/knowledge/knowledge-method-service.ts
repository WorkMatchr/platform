import { createHash, randomUUID } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'

type DatabaseClient = ReturnType<typeof getPrisma>
type ComponentReference =
  | { type: 'PROCEDURE'; procedureId: string }
  | { type: 'CHECKLIST'; checklistId: string }
  | { type: 'RULE'; ruleId: string }
  | { type: 'CALCULATION'; calculationId: string }
  | { type: 'FORM_TEMPLATE'; formTemplateId: string }

export type KnowledgeMethodEvidenceInput = {
  sourceBlockId: string
  role: 'BASIS' | 'INPUT' | 'STEP' | 'OUTPUT' | 'LIMITATION'
  rationale: string
}

export type KnowledgeMethodComponentInput = ComponentReference & {
  sequence: number
  label: string
  evidence: KnowledgeMethodEvidenceInput[]
}

export type KnowledgeMethodInput = {
  code: string
  title: string
  purpose: string
  applicability: Prisma.InputJsonValue
  inputContract: Prisma.InputJsonValue
  outputContract: Prisma.InputJsonValue
  limitations: string
  temporalStatus: 'HISTORICAL' | 'CURRENT' | 'SUPERSEDED' | 'UNKNOWN'
  createdByActor: string
  supersedesMethodId?: string
  evidence: KnowledgeMethodEvidenceInput[]
  components: KnowledgeMethodComponentInput[]
}

export class KnowledgeMethodError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'KnowledgeMethodError'
  }
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => [key, stable(entry)]))
  return value
}

export function fingerprintKnowledgeMethod(input: KnowledgeMethodInput) {
  const content = { ...input, supersedesMethodId: undefined, createdByActor: undefined }
  return createHash('sha256').update(JSON.stringify(stable(content))).digest('hex')
}

function validateInput(input: KnowledgeMethodInput) {
  if (!/^[A-Z][A-Z0-9_]{2,119}$/u.test(input.code)) throw new KnowledgeMethodError('METHOD_CODE_INVALID', 'De methodecode is ongeldig.')
  if (!input.title.trim() || !input.purpose.trim() || !input.limitations.trim() || !input.createdByActor.trim()) throw new KnowledgeMethodError('METHOD_FIELDS_REQUIRED', 'Verplichte methodevelden ontbreken.')
  if (input.components.length === 0) throw new KnowledgeMethodError('METHOD_COMPONENT_REQUIRED', 'De methode vereist minimaal één component.')
  if (input.evidence.length === 0) throw new KnowledgeMethodError('METHOD_EVIDENCE_REQUIRED', 'De methode vereist rechtstreeks bronbewijs.')
  const sequences = input.components.map((component) => component.sequence)
  if (sequences.some((sequence) => !Number.isInteger(sequence) || sequence < 1) || new Set(sequences).size !== sequences.length) throw new KnowledgeMethodError('METHOD_COMPONENT_SEQUENCE_INVALID', 'Componentvolgorde is ongeldig.')
  if (input.components.some((component) => !component.label.trim() || component.evidence.length === 0)) throw new KnowledgeMethodError('METHOD_COMPONENT_EVIDENCE_REQUIRED', 'Iedere component vereist bronbewijs.')
  for (const evidence of [...input.evidence, ...input.components.flatMap((component) => component.evidence)]) {
    if (!evidence.sourceBlockId || !evidence.rationale.trim()) throw new KnowledgeMethodError('METHOD_EVIDENCE_INVALID', 'Bronbewijs is onvolledig.')
  }
}

function componentData(component: KnowledgeMethodComponentInput) {
  const base = { id: randomUUID(), sequence: component.sequence, label: component.label.trim() }
  switch (component.type) {
    case 'PROCEDURE': return { ...base, procedureId: component.procedureId }
    case 'CHECKLIST': return { ...base, checklistId: component.checklistId }
    case 'RULE': return { ...base, ruleId: component.ruleId }
    case 'CALCULATION': return { ...base, calculationId: component.calculationId }
    case 'FORM_TEMPLATE': return { ...base, formTemplateId: component.formTemplateId }
  }
}

async function assertEvidenceBlocks(tx: Prisma.TransactionClient, input: KnowledgeMethodInput) {
  const ids = [...new Set([...input.evidence, ...input.components.flatMap((component) => component.evidence)].map((item) => item.sourceBlockId))]
  const blocks = await tx.knowledgeSourceBlock.findMany({
    where: { id: { in: ids }, sourcePage: { extractionRun: { status: 'COMPLETED' } } },
    select: { id: true },
  })
  if (blocks.length !== ids.length) throw new KnowledgeMethodError('METHOD_EVIDENCE_BLOCK_INVALID', 'Een bewijsblok bestaat niet of komt niet uit een voltooide extractie.')
}

export async function storeKnowledgeMethod(input: KnowledgeMethodInput, database: DatabaseClient = getPrisma()) {
  validateInput(input)
  const fingerprint = fingerprintKnowledgeMethod(input)
  return database.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${input.code}))`)
    const identical = await tx.knowledgeMethod.findUnique({ where: { code_contentFingerprint: { code: input.code, contentFingerprint: fingerprint } }, select: { id: true, revision: true } })
    if (identical) return { methodId: identical.id, revision: identical.revision, created: false, contentFingerprint: fingerprint }
    const latest = await tx.knowledgeMethod.findFirst({ where: { code: input.code }, orderBy: { revision: 'desc' }, select: { id: true, revision: true } })
    if ((latest?.id ?? undefined) !== input.supersedesMethodId) throw new KnowledgeMethodError('METHOD_SUPERSESSION_CONFLICT', 'De verwachte voorgaande methoderevisie komt niet overeen.')
    await assertEvidenceBlocks(tx, input)
    const methodId = randomUUID()
    const revision = (latest?.revision ?? 0) + 1
    await tx.knowledgeMethod.create({
      data: {
        id: methodId, code: input.code, revision, title: input.title.trim(), purpose: input.purpose.trim(),
        applicability: input.applicability, inputContract: input.inputContract, outputContract: input.outputContract,
        limitations: input.limitations.trim(), temporalStatus: input.temporalStatus, validationStatus: 'UNVALIDATED',
        publicationStatus: 'DRAFT', accessTier: 'INTERNAL_REVIEWER', contentFingerprint: fingerprint,
        supersedesMethodId: input.supersedesMethodId, createdByActor: input.createdByActor.trim(),
      },
    })
    let evidenceSequence = 1
    for (const evidence of input.evidence) {
      await tx.knowledgeMethodEvidence.create({ data: { methodId, sourceBlockId: evidence.sourceBlockId, evidenceRole: evidence.role, sequence: evidenceSequence++, rationale: evidence.rationale.trim() } })
    }
    for (const component of [...input.components].sort((a, b) => a.sequence - b.sequence)) {
      const created = await tx.knowledgeMethodComponent.create({ data: { methodId, ...componentData(component) }, select: { id: true } })
      for (const evidence of component.evidence) {
        await tx.knowledgeMethodEvidence.create({ data: { methodId, componentId: created.id, sourceBlockId: evidence.sourceBlockId, evidenceRole: evidence.role, sequence: evidenceSequence++, rationale: evidence.rationale.trim() } })
      }
    }
    return { methodId, revision, created: true, contentFingerprint: fingerprint }
  }, { isolationLevel: 'Serializable' })
}

export async function getKnowledgeMethod(code: string, database: DatabaseClient = getPrisma()) {
  return database.knowledgeMethod.findFirst({
    where: { code }, orderBy: { revision: 'desc' },
    include: {
      components: { orderBy: { sequence: 'asc' }, include: { procedure: true, checklist: true, rule: true, calculation: true, formTemplate: true, evidence: { orderBy: { sequence: 'asc' }, include: { sourceBlock: { include: { sourcePage: true } } } } } },
      evidence: { where: { componentId: null }, orderBy: { sequence: 'asc' }, include: { sourceBlock: { include: { sourcePage: true } } } },
    },
  })
}
