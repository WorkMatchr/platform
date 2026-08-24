export type FinancialSearchParams = Record<string, string | string[] | undefined>

export function singleParam(params: FinancialSearchParams, key: string) {
  const value = params[key]
  return Array.isArray(value) ? value[0] : value
}

export function parsePage(value?: string) {
  const page = Number(value)
  return Number.isSafeInteger(page) && page > 0 ? page : 1
}

export function parseDateBoundary(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function paginationHref(pathname: string, params: FinancialSearchParams, page: number) {
  const query = new URLSearchParams()
  for (const [key, rawValue] of Object.entries(params)) {
    if (key === 'page') continue
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue
    if (value) query.set(key, value)
  }
  if (page > 1) query.set('page', String(page))
  const suffix = query.toString()
  return suffix ? `${pathname}?${suffix}` : pathname
}

export function formatPlatformDate(value: Date) {
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'medium', timeZone: 'Europe/Amsterdam' }).format(value)
}
