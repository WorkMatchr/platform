import type { ProviderDeliveryMode } from '@/generated/prisma/client'

export type OfferingOption = { id: string; label: string }
export type OfferingKind = 'sector' | 'service' | 'area'
export type OfferingValues = {
  selected: boolean
  termId: string | null
  specialismId: string | null
  modes: ProviderDeliveryMode[]
  years: number | null
}
export type OfferingRow = OfferingValues & {
  key: string
  recordId: string | null
  kind: OfferingKind
  label: string
  specialismLabel?: string
  verification?: string
}
export type Offering = {
  profileId: string
  version: number
  sectors: OfferingOption[]
  services: OfferingOption[]
  specialisms: OfferingOption[]
  areas?: OfferingOption[]
  editArea?: boolean
  editSectors: boolean
  editServices: boolean
  rows: OfferingRow[]
}

export function catalogRow(kind: OfferingKind, option: OfferingOption): OfferingRow {
  return { key: kind + '-' + option.id, recordId: null, kind, label: option.label, termId: option.id,
    selected: false, specialismId: null, modes: [], years: null }
}

export function sameModes(left: ProviderDeliveryMode[], right: ProviderDeliveryMode[]) {
  return left.length === right.length && left.every(mode => right.includes(mode))
}

// A missing row is never an instruction to delete. Unchecking archives only its identity.
export function offeringChanges(initial: OfferingRow[], edited: OfferingRow[]) {
  const previous = new Map(initial.map(row => [row.key, row]))
  return edited.flatMap(row => {
    const old = previous.get(row.key)
    if (!row.selected && !old?.selected) return []
    if (old && row.selected === old.selected && row.termId === old.termId &&
        row.specialismId === old.specialismId && row.years === old.years && sameModes(row.modes, old.modes)) return []
    const { kind, recordId, selected, termId, specialismId, modes, years } = row
    return [{ kind, recordId, selected, termId, specialismId, modes, years }]
  })
}
