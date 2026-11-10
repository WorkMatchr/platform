import { z } from 'zod'

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value + 'T00:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
})
export const certificateFilterSchema = z.object({
  q: z.string().trim().max(160).default(''), course: z.string().trim().max(40).default(''),
  status: z.enum(['', 'ACTIVE', 'REVOKED']).default(''),
  from: z.union([z.literal(''), calendarDate]).default(''),
  until: z.union([z.literal(''), calendarDate]).default(''),
  page: z.number().int().min(1).max(100_000).default(1),
}).strict().refine(value => !value.from || !value.until || value.from <= value.until)
export type CertificateFilter = z.infer<typeof certificateFilterSchema>
/** Dutch calendar midnight; sample before either Amsterdam DST transition. */
export function certificateDateBoundary(value: string, followingDay = false) {
  const date = new Date(value + 'T00:00:00Z')
  if (followingDay) date.setUTCDate(date.getUTCDate() + 1)
  const offset = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Amsterdam', timeZoneName: 'shortOffset' })
    .formatToParts(date).find(part => part.type === 'timeZoneName')?.value.match(/GMT([+-])(\d+)(?::(\d+))?/)
  if (!offset) throw new Error('CERTIFICATE_DATE_INVALID')
  const minutes = (Number(offset[2]) * 60 + Number(offset[3] ?? 0)) * (offset[1] === '-' ? -1 : 1)
  return new Date(date.getTime() - minutes * 60_000)
}
export type CertificateRow = {
  id: string; certificateNumber: string; firstName: string; lastName: string
  courseTitle: string; issuedAt: string; status: 'ACTIVE' | 'REVOKED'
}
export type CertificateList = { rows: CertificateRow[]; total: number; page: number; pageCount: number }
const certificateStatusLabels = { ACTIVE: 'Geldig', REVOKED: 'Ingetrokken' } satisfies Record<CertificateRow['status'], string>
export function certificateStatusLabel(status: string) {
  return Object.hasOwn(certificateStatusLabels, status) ? certificateStatusLabels[status as keyof typeof certificateStatusLabels] : 'Status niet beschikbaar'
}
export function certificateDateLabel(value: string | Date) {
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'Europe/Amsterdam' }).format(new Date(value))
}
