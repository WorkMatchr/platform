// Original WL-001: existing enrollments stay pinned to this immutable version.
export const COURSE_CODE = 'WL-001'
export const COURSE_SLUG = 'rie-in-de-praktijk'
export const COURSE_VERSION = 'prototype-0.17'

const pilotVersions: Readonly<Record<string, string>> = {
  'WL-001': '1.2', 'WL-002': 'WL-002-COURSE-1.3', 'WL-003': 'WL-003-COURSE-1.1',
}
// Self-enrollment in draft candidates is restricted to the disposable acceptance
// database. Publishing in a real classroom requires a separate release decision.
export function allowsStudentPilot(code: string, version: string): boolean {
  return pilotVersions[code] === version && isLocalPilot()
}

export const assignedPilotVersions: Readonly<Record<string,string>> = {
  'WL-001':'1.2-r07', 'WL-002':'1.3-r07', 'WL-003':'1.1-r07',
}
export function allowsAssignedPilot(code:string, version:string) {
  return assignedPilotVersions[code] === version && isLocalPilot()
}

export function isLocalPilot() {
  if (process.env.ACADEMY_STUDENT_PILOT_ENABLED !== 'true' || process.env.VERCEL || process.env.VERCEL_ENV) return false
  try {
    const url = new URL(process.env.DATABASE_URL ?? '')
    return url.protocol === 'postgresql:' && !url.search && !url.hash && url.hostname === '127.0.0.1' && url.username === 'academy_content_editor'
      && /^\/workmatchr_learning_\d+_\d+$/.test(url.pathname)
  } catch { return false }
}
