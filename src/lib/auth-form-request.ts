export type AuthFormRequestResult = 'accepted' | 'rate_limited' | 'technical_error'
export type NewPasswordRequestResult = AuthFormRequestResult | 'password_rejected' | 'password_check_unavailable'

type AuthClientResponse = {
  error?: {
    status?: number
    statusCode?: number
    code?: string
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

export async function runNewPasswordRequest(
  request: () => Promise<AuthClientResponse>,
): Promise<NewPasswordRequestResult> {
  try {
    const response = await request()
    if (!response.error) return 'accepted'
    if (response.error.code === 'PASSWORD_COMPROMISED' || response.error.code === 'PASSWORD_POLICY_REJECTED') return 'password_rejected'
    const status = responseStatus(response)
    if (status === 429) return 'rate_limited'
    if (status && status >= 500) return 'password_check_unavailable'
    return 'technical_error'
  } catch {
    return 'password_check_unavailable'
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

export async function runNewPasswordRegistrationRequest(
  request: () => Promise<Response>,
): Promise<NewPasswordRequestResult> {
  try {
    const response = await request()
    if (response.ok) return 'accepted'
    if (response.status === 429) return 'rate_limited'
    const error = await response.json().catch(() => null) as { code?: unknown } | null
    if (error?.code === 'PASSWORD_COMPROMISED' || error?.code === 'PASSWORD_POLICY_REJECTED') return 'password_rejected'
    if (response.status >= 500) return 'password_check_unavailable'
    return 'technical_error'
  } catch {
    return 'password_check_unavailable'
  }
}
