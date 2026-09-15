export const RESPONSE_DEADLINE_POLICY = 'WORKMATCHR_14_CALENDAR_DAYS_V1'
export const RESPONSE_DEADLINE_TIME_ZONE = 'Europe/Amsterdam'

const calendar = new Intl.DateTimeFormat('en-GB', {
  timeZone: RESPONSE_DEADLINE_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

function wallTime(date: Date) {
  const parts = Object.fromEntries(calendar.formatToParts(date).map(p => [p.type, p.value]))
  return Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!, +parts.second!, date.getUTCMilliseconds())
}

/** Fourteen Amsterdam calendar days; preserve wall time across DST. Gaps move forward. */
export function responseDeadline(anchor: Date): Date {
  if (!Number.isFinite(anchor.getTime())) throw new Error('Invalid publication timestamp')
  const desired = new Date(wallTime(anchor))
  desired.setUTCDate(desired.getUTCDate() + 14)
  const target = desired.getTime()
  const first = target - (wallTime(anchor) - anchor.getTime())
  const corrected = target - (wallTime(new Date(first)) - first)
  return new Date(wallTime(new Date(corrected)) === target ? corrected : Math.max(first, corrected))
}
