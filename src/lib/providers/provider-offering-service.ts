import { z } from 'zod'
import type { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { requireProviderManager } from './provider-authorization'
import { requireProviderSectionEditable } from './provider-dossier-access'
import { ProviderServiceError } from './provider-errors'
import { sameModes } from './provider-offering'
import { hasConflictingActiveWorkArea } from './provider-work-area-rules'
import { requireTerm } from './provider-record-mutation-service'
import { expectedVersionSchema, uuidSchema } from './provider-validation'
import { parseProviderInput, reserveProviderVersion } from './provider-write-utils'

const changeSchema = z.object({
  kind: z.enum(['sector', 'service', 'area']), recordId: uuidSchema.nullable(), selected: z.boolean(),
  termId: uuidSchema.nullable(), specialismId: uuidSchema.nullable(),
  modes: z.array(z.enum(['ON_SITE', 'HYBRID', 'REMOTE'])).max(3).refine(values => new Set(values).size === values.length),
  years: z.int().min(0).max(1000).nullable(),
}).strict()
const batchSchema = z.object({ version: expectedVersionSchema, changes: z.array(changeSchema).max(250) })
type Change = z.infer<typeof changeSchema>
type Tx = Prisma.TransactionClient
const latest = { take: 1, orderBy: { version: 'desc' as const } }
function invalid(): never { throw new ProviderServiceError('VALIDATION_ERROR') }
function conflict(): never { throw new ProviderServiceError('CONFLICT') }

async function writeSector(tx: Tx, providerProfileId: string, row: Change) {
  const record = row.recordId ? await tx.providerSectorExperience.findFirst({
    where: { id: row.recordId, providerProfileId }, include: { revisions: latest },
  }) : null
  const previous = record?.revisions[0]
  if (row.recordId && !previous) conflict()
  const status = row.selected ? 'ACTIVE' : 'ARCHIVED'
  if ((!row.selected && !record) || !row.termId || row.specialismId || row.modes.length || (row.years !== null && row.years > 80)) invalid()
  if (previous && previous.sectorTermId !== row.termId) invalid()
  if (!previous) await requireTerm(tx, row.termId, ['SECTOR'])
  const changed = row.selected && (!previous || previous.experienceYears !== row.years)
  const revision = { sectorTermId: row.termId, experienceYears: row.years, version: (record?.version ?? 0) + 1 }
  if (!record) {
    await tx.providerSectorExperience.create({ data: { providerProfileId, revisions: { create: revision } } })
  } else {
    if (!changed && record.status === status) return false
    await tx.providerSectorExperience.update({ where: { id: record.id, version: record.version, providerProfileId },
      data: { status, version: { increment: 1 }, revisions: changed ? { create: revision } : undefined } })
  }
  return true
}

async function writeService(tx: Tx, providerProfileId: string, row: Change) {
  const record = row.recordId ? await tx.providerCapability.findFirst({
    where: { id: row.recordId, providerProfileId }, include: { revisions: latest },
  }) : null
  const previous = record?.revisions[0]
  if (row.recordId && !previous) conflict()
  if ((!record && (!row.selected || !row.termId)) || row.years !== null) invalid()
  const status = row.selected ? 'ACTIVE' : 'ARCHIVED'
  const changed = row.selected && (!previous || previous.serviceTermId !== row.termId ||
    previous.specialismTermId !== row.specialismId || !sameModes(previous.deliveryModes, row.modes))
  if (changed) {
    if (!row.modes.length || !(row.termId || row.specialismId)) invalid()
    // A legacy specialism-only record can acquire a service without losing linked qualifications.
    if (previous?.serviceTermId && row.termId !== previous.serviceTermId) invalid()
    if (row.termId && row.termId !== previous?.serviceTermId) await requireTerm(tx, row.termId, ['SERVICE'])
    if (row.specialismId && row.specialismId !== previous?.specialismTermId) await requireTerm(tx, row.specialismId, ['SPECIALISM'])
  }
  const revision = { version: (record?.version ?? 0) + 1, serviceTermId: row.termId, specialismTermId: row.specialismId,
    deliveryModes: row.modes, competencyTermId: previous?.competencyTermId,
    validFrom: previous?.validFrom, validUntil: previous?.validUntil }
  if (!record) {
    await tx.providerCapability.create({ data: { providerProfileId, revisions: { create: revision } } })
  } else {
    if (!changed && record.status === status) return false
    await tx.providerCapability.update({ where: { id: record.id, version: record.version, providerProfileId },
      data: { status, version: { increment: 1 }, revisions: changed ? { create: revision } : undefined } })
  }
  return true
}

async function writeArea(tx: Tx, providerProfileId: string, row: Change) {
  const record = row.recordId ? await tx.providerWorkArea.findFirst({
    where: { id: row.recordId, providerProfileId }, include: { revisions: latest },
  }) : null
  const previous = record?.revisions[0]
  if (row.recordId && !previous) conflict()
  if ((!row.selected && !record) || !row.termId || row.specialismId || row.modes.length ||
      (row.years !== null && (row.years < 0 || row.years > 1000))) invalid()
  if (previous && previous.regionTermId !== row.termId) invalid()
  const changed = row.selected && (!previous || previous.maxTravelDistanceKm !== row.years)
  if (row.selected) {
    const term = await requireTerm(tx, row.termId, ['REGION'])
    if (term && await hasConflictingActiveWorkArea(tx, providerProfileId, term.code, record?.id)) invalid()
  }
  const status = row.selected ? 'ACTIVE' : 'ARCHIVED'
  const revision = { regionTermId: row.termId, maxTravelDistanceKm: row.years, version: (record?.version ?? 0) + 1 }
  if (!record) {
    await tx.providerWorkArea.create({ data: { providerProfileId, revisions: { create: revision } } })
  } else {
    if (!changed && record.status === status) return false
    await tx.providerWorkArea.update({ where: { id: record.id, version: record.version, providerProfileId },
      data: { status, version: { increment: 1 }, revisions: changed ? { create: revision } : undefined } })
  }
  return true
}

export async function saveProviderOffering(userId: string, profileId: string, raw: unknown) {
  const input = parseProviderInput(batchSchema, raw)
  try {
    return await getPrisma().$transaction(async tx => {
      const profile = await requireProviderManager(tx, userId, profileId)
      if (profile.version !== input.version) conflict()
      const touched = new Set<string>()
      for (const kind of new Set(input.changes.map(row => row.kind))) {
        await requireProviderSectionEditable(tx, profileId, kind === 'sector' ? 'SECTOR_EXPERIENCE' : kind === 'service' ? 'CAPABILITIES' : 'WORK_AREA')
      }
      let changed = false
      for (const row of input.changes) {
        const key = row.recordId ?? [row.kind, row.termId, row.specialismId].join(':')
        if (touched.has(key)) invalid()
        touched.add(key)
        const wrote = row.kind === 'sector' ? await writeSector(tx, profileId, row) : row.kind === 'service' ? await writeService(tx, profileId, row) : await writeArea(tx, profileId, row)
        changed ||= wrote
      }
      return changed ? reserveProviderVersion(tx, profileId, profile.version) : profile.version
    }, { isolationLevel: 'Serializable', timeout: 20000 })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && ['P2034', 'P2025'].includes(String(error.code))) conflict()
    throw error
  }
}
