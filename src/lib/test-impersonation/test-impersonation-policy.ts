export const TEST_IMPERSONATION_POLICY_VERSION = 'TEST_IMPERSONATION_V1'

export type TestAccountSwitcherEnvironment = {
  ENABLE_TEST_ACCOUNT_SWITCHER?: string
  NODE_ENV?: string
}

export function isTestAccountSwitcherEnabled(
  environment: TestAccountSwitcherEnvironment = process.env,
) {
  return (
    environment.NODE_ENV !== 'production' &&
    environment.ENABLE_TEST_ACCOUNT_SWITCHER === 'true'
  )
}

export function isRecognizedTestEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const separatorIndex = normalizedEmail.lastIndexOf('@')
  if (separatorIndex <= 0) return false

  const domain = normalizedEmail.slice(separatorIndex + 1)
  return domain === 'example.invalid' || domain.endsWith('.example.invalid')
}

export function canUseAsTestAccount(input: {
  actorUserId: string
  user: {
    id: string
    email: string
    emailVerified: boolean
    status: string
  }
}) {
  return (
    input.user.id !== input.actorUserId &&
    input.user.status === 'ACTIVE' &&
    input.user.emailVerified &&
    isRecognizedTestEmail(input.user.email)
  )
}
