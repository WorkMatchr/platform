// Only fixed classifications leave the transport boundary; never provider messages or payloads.
export type JorttOperation = 'AUTH' | 'CUSTOMER_LOOKUP' | 'CUSTOMER_CREATE' | 'INVOICE_LOOKUP' | 'INVOICE_READ' | 'INVOICE_CREATE' | 'INVOICE_UPDATE' | 'CREDIT_NOTE_CREATE' | 'INVOICE_FINALIZE'

const providerCodes = new Set([
  'access_token.invalid', 'access_token.expired', 'access_token.revoked',
  'scopes.insufficient', 'permissions.insufficient', 'organization.non_existing',
  'organization.requires_mkb_plan', 'organization.not_allowed', 'organization.header_required',
  'user.non_existing', 'user.invalid_credentials', 'two_factor_code.invalid', 'two_factor_code.missing_secret',
  'endpoint.not_found', 'resource.not_found', 'resource.method_not_allowed', 'resource.conflict',
  'params.invalid', 'invalid_params', 'params.invalid_format', 'params.invalid_encoding',
  'operation.invalid', 'operation.year_closed', 'request.throttled', 'server.internal_error',
  'server.maintenance', 'integration.outage',
  'invalid_client', 'invalid_grant', 'invalid_scope', 'unauthorized_client', 'unsupported_grant_type',
])

export class JorttProviderError extends Error {
  readonly diagnostic: Readonly<{
    provider: 'JORTT'; operation: JorttOperation; httpStatus: number | null
    providerErrorCode: string | null; category: string
  }>

  constructor(operation: JorttOperation, status: number | null, providerCode: unknown = null, transport: 'TIMEOUT' | 'NETWORK' | 'INVALID_RESPONSE' | null = null) {
    // Preserve the existing retry/error contract; add detail only to the audit metadata.
    super(transport !== null || status === null ? 'JORTT_PROVIDER_ERROR' : status === 429 || status >= 500 ? 'JORTT_TEMPORARY_PROVIDER_ERROR' : 'JORTT_PROVIDER_REJECTED')
    this.name = 'JorttProviderError'
    this.diagnostic = Object.freeze({
      provider: 'JORTT', operation, httpStatus: status,
      providerErrorCode: typeof providerCode === 'string' && providerCodes.has(providerCode) ? providerCode : null,
      category: transport ? `JORTT_${transport}` : status === 429 ? 'JORTT_RATE_LIMITED' : status !== null && status >= 500 ? 'JORTT_PROVIDER_UNAVAILABLE' : `JORTT_${operation}_REJECTED`,
    })
  }
}

export function jorttOperation(path: string, method = 'GET'): JorttOperation {
  if (path.startsWith('/customers?')) return 'CUSTOMER_LOOKUP'
  if (path === '/customers' && method === 'POST') return 'CUSTOMER_CREATE'
  if (path.startsWith('/invoices?')) return 'INVOICE_LOOKUP'
  if (path.endsWith('/send')) return 'INVOICE_FINALIZE'
  if (path.endsWith('/credit')) return 'CREDIT_NOTE_CREATE'
  if (path === '/invoices' && method === 'POST') return 'INVOICE_CREATE'
  if (method === 'PUT') return 'INVOICE_UPDATE'
  return 'INVOICE_READ'
}

async function errorKey(response: Response): Promise<unknown> {
  // Bounded parsing; unknown keys, free text, details and all other fields are discarded.
  const reader = response.body?.getReader()
  if (!reader) return null
  try {
    let text = ''
    let bytes = 0
    const decoder = new TextDecoder()
    while (true) {
      const part = await reader.read()
      if (part.done) break
      bytes += part.value.byteLength
      if (bytes > 16_384) return null
      text += decoder.decode(part.value, { stream: true })
    }
    const body = JSON.parse(text + decoder.decode())
    return typeof body?.error === 'string' ? body.error : body?.error?.key
  } catch {
    return null
  } finally {
    await reader.cancel().catch(() => undefined)
  }
}

export async function jorttFetch(fetcher: typeof fetch, operation: JorttOperation, url: string, init: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetcher(url, init)
  } catch (error) {
    const timeout = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
    throw new JorttProviderError(operation, null, null, timeout ? 'TIMEOUT' : 'NETWORK')
  }
  if (!response.ok) throw new JorttProviderError(operation, response.status, await errorKey(response))
  return response
}

export async function jorttJson<T>(response: Response, operation: JorttOperation): Promise<T> {
  try {
    return await response.json() as T
  } catch {
    throw new JorttProviderError(operation, response.status, null, 'INVALID_RESPONSE')
  }
}
