export function getSafeReturnUrl(value: string | null | undefined, fallback = '/account'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return fallback
  }

  try {
    const url = new URL(value, 'https://workmatchr.local')
    return url.origin === 'https://workmatchr.local' ? `${url.pathname}${url.search}${url.hash}` : fallback
  } catch {
    return fallback
  }
}
