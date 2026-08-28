export const PUBLIC_INTAKE_FLOW_VERSION = 'PUBLIC-INTAKE-1'
export const PUBLIC_HELP_REQUEST_INTAKE_V2_FLOW_VERSION = 'PUBLIC-HELP-REQUEST-2'
export const PUBLIC_HELP_REQUEST_INTAKE_V2_QUESTION_LIMIT = 5
export const PUBLIC_INTAKE_TOKEN_BYTES = 32
export const PUBLIC_INTAKE_ABANDONMENT_DAYS = 30
export const PUBLIC_INTAKE_RESUME_DAYS = 90
export const PUBLIC_INTAKE_RESUME_EVENT_INTERVAL_MINUTES = 15
export const PUBLIC_INTAKE_COOKIE_NAME = 'wm_public_intake'
export const PUBLIC_INTAKE_LEGACY_COOKIE_PATH = '/advieswijzer'

const DAY_IN_MS = 24 * 60 * 60 * 1000

export function publicIntakeExpiryFrom(startedAt: Date): Date {
  return new Date(startedAt.getTime() + PUBLIC_INTAKE_RESUME_DAYS * DAY_IN_MS)
}

export function publicIntakeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PUBLIC_INTAKE_RESUME_DAYS * 24 * 60 * 60,
  }
}

export function publicIntakeLegacyCookieRemovalOptions() {
  return {
    ...publicIntakeCookieRemovalOptions(),
    path: PUBLIC_INTAKE_LEGACY_COOKIE_PATH,
  }
}

export function publicIntakeCookieRemovalOptions() {
  return {
    ...publicIntakeCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  }
}
