// Date-only quote validity is inclusive of the entered calendar day in Amsterdam.
// Store the exclusive start of the next day as a UTC instant. Existing timestamps
// (including older quote versions) are not rewritten or reinterpreted.
const TIME_ZONE = 'Europe/Amsterdam'
const offsetFormatter = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'shortOffset' })

export function parseQuoteValidUntilDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) throw new RangeError('Invalid quote validity date')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (year < 1000 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new RangeError('Invalid quote validity date')
  }

  const nextMidnightUtc = Date.UTC(year, month - 1, day + 1)
  // Dutch DST transitions happen at 01:00 UTC, not at midnight UTC.
  // Thus the offset at midnight UTC matches the offset at the target local midnight.
  const offsetLabel = offsetFormatter.formatToParts(new Date(nextMidnightUtc)).find(part => part.type === 'timeZoneName')?.value
  const offset = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offsetLabel ?? '')
  if (!offset) throw new RangeError('Could not determine Amsterdam timezone offset')
  const minutes = (Number(offset[2]) * 60 + Number(offset[3] ?? 0)) * (offset[1] === '+' ? 1 : -1)
  return new Date(nextMidnightUtc - minutes * 60_000)
}
