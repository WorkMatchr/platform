export type AuthFormRequestResult = 'accepted' | 'rate_limited' | 'technical_error'

type AuthClientResponse = {
  error?: {
    status?: number
    statusCode?: number
  } | null
}

function responseStatus(response: AuthClientResponse): number | undefined {
  return response.error?.status ?? response.error?.statusCode
}

export async function runAuthClientRequest(
  request: () => Promise<AuthClientResponse>,
): Promise<AuthFormRequestResult> {
  try {
    const response = await request()
    if (!response.error) return 'accepted'
    return responseStatus(response) === 429 ? 'rate_limited' : 'technical_error'
  } catch {
    return 'technical_error'
  }
}

export async function runRegistrationRequest(
  request: () => Promise<Pick<Response, 'ok' | 'status'>>,
): Promise<AuthFormRequestResult> {
  try {
    const response = await request()
    if (response.ok) return 'accepted'
    return response.status === 429 ? 'rate_limited' : 'technical_error'
  } catch {
    return 'technical_error'
  }
}
