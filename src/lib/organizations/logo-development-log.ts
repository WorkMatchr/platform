type LogoLogDetails = Record<string, boolean | number | string | null | undefined>

export function logoErrorDetails(error: unknown): LogoLogDetails {
  if (!(error instanceof Error)) return { errorType: typeof error }
  const nodeError = error as NodeJS.ErrnoException
  return {
    errorName: error.name,
    errorMessage: error.message,
    errorCode: nodeError.code,
  }
}

export function logLogoDevelopment(
  phase: 'database' | 'processing' | 'storage' | 'upload',
  event: string,
  details: LogoLogDetails = {},
): void {
  if (process.env.NODE_ENV !== 'development') return
  console.info(`[organization-logo] ${JSON.stringify({ phase, event, ...details })}`)
}
