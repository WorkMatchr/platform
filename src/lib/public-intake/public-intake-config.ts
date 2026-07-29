export const PUBLIC_INTAKE_FLOW_VERSION = 'PUBLIC-INTAKE-1'
export const PUBLIC_INTAKE_TOKEN_BYTES = 32
export const PUBLIC_INTAKE_ABANDONMENT_DAYS = 30
export const PUBLIC_INTAKE_RESUME_DAYS = 90
export const PUBLIC_INTAKE_RESUME_EVENT_INTERVAL_MINUTES = 15
export const PUBLIC_INTAKE_COOKIE_NAME = 'wm_public_intake'

const DAY_IN_MS = 24 * 60 * 60 * 1000

export function publicIntakeExpiryFrom(startedAt: Date): Date {
  return new Date(startedAt.getTime() + PUBLIC_INTAKE_RESUME_DAYS * DAY_IN_MS)
}

export function publicIntakeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/advieswijzer',
    maxAge: PUBLIC_INTAKE_RESUME_DAYS * 24 * 60 * 60,
  }
}

export function publicIntakeCookieRemovalOptions() {
  return {
    ...publicIntakeCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  }
}
