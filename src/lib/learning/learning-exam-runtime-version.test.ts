import { afterEach, expect, it, vi } from 'vitest'
import { allowsStudentPilot } from './learning-exam-runtime-version'

afterEach(() => vi.unstubAllEnvs())
it('houdt de drie exacte cursusversies uitsluitend open voor de afgeschermde lokale pilot', () => {
  vi.stubEnv('VERCEL', '').stubEnv('VERCEL_ENV', '').stubEnv('ACADEMY_STUDENT_PILOT_ENABLED', 'true')
  vi.stubEnv('DATABASE_URL','postgresql://academy_content_editor@127.0.0.1/workmatchr_learning_123_456')
  for (const [code, version] of [['WL-001','1.2'],['WL-002','WL-002-COURSE-1.3'],['WL-003','WL-003-COURSE-1.1']]) expect(allowsStudentPilot(code,version)).toBe(true)
  expect(allowsStudentPilot('WL-001','1.3')).toBe(false)
  vi.stubEnv('VERCEL_ENV','preview')
  expect(allowsStudentPilot('WL-001','1.2')).toBe(false)
  vi.stubEnv('VERCEL_ENV','').stubEnv('DATABASE_URL','postgresql://academy_content_editor@remote.invalid/workmatchr_learning_123_456')
  expect(allowsStudentPilot('WL-001','1.2')).toBe(false)
  vi.stubEnv('DATABASE_URL','postgresql://owner@127.0.0.1/workmatchr_learning_123_456')
  expect(allowsStudentPilot('WL-001','1.2')).toBe(false)
})
