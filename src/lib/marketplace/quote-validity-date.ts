const TIME_ZONE = 'Europe/Amsterdam'
const instantFormatter = new Intl.DateTimeFormat('nl-NL', { timeZone: TIME_ZONE, dateStyle: 'long', timeStyle: 'long' })
const offsetFormatter = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'shortOffset' })

// Prisma transports PostgreSQL DATE values as UTC-midnight Date objects.
// Their year, month and day are data; the transport time is not an expiry.
export function parseQuoteValidUntilDate(value: string | Date): Date {
  if (value instanceof Date) {
    if (!value.toISOString().endsWith('T00:00:00.000Z')) throw new RangeError('An exact timestamp cannot be stored in a quote DATE column')
    return value
  }
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Invalid quote validity date')
  const date = new Date(value + 'T00:00:00.000Z')
  if (!Number.isFinite(date.getTime()) || quoteValidityInputDate(date) !== value) {
    throw new RangeError('Invalid quote validity date')
  }
  return date
}

export function quoteValidityInputDate(storedDate: Date): string {
  return storedDate.toISOString().slice(0, 10)
}

export function quoteExpiryFromSqlDate(storedDate: Date): Date {
  const nextMidnightUtc = storedDate.getTime() + 86_400_000
  // Amsterdam switches at 01:00 UTC. At 00:00 UTC the offset still equals
  // the one at local midnight, including the spring and autumn transition days.
  const offsetLabel = offsetFormatter.formatToParts(nextMidnightUtc).find(part => part.type === 'timeZoneName')?.value
  if (offsetLabel === 'GMT') return new Date(nextMidnightUtc)
  const offset = /^GMT([+-])(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?$/.exec(offsetLabel ?? '')
  if (!offset) throw new RangeError('Could not determine Amsterdam timezone offset')
  const seconds = Number(offset[2]) * 3600 + Number(offset[3] ?? 0) * 60 + Number(offset[4] ?? 0)
  const sign = offset[1] === '+' ? 1 : -1
  return new Date(nextMidnightUtc - sign * seconds * 1000)
}

export function isQuoteExpired(storedDate: Date | null, now: Date): boolean {
  return storedDate !== null && quoteExpiryFromSqlDate(storedDate) <= now
}

export function formatQuoteExpiry(storedDate: Date): string {
  return instantFormatter.format(quoteExpiryFromSqlDate(storedDate))
}
