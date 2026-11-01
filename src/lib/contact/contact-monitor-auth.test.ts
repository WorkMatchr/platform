import { afterEach, expect, it, vi } from 'vitest'
import { isContactMonitorAuthorized } from './contact-monitor-auth'
import { isFinancialMaintenanceAuthorized, isFinancialMaintenanceCronAuthorized } from '@/lib/finance/financial-maintenance-auth'
const key = 'a'.repeat(64), cron = 'b'.repeat(64), finance = 'c'.repeat(64)
afterEach(() => vi.unstubAllEnvs())
it('requires a dedicated, valid key; never accepts CRON as monitor authority', () => {
  vi.stubEnv('CONTACT_MONITOR_SECRET', ''); vi.stubEnv('CRON_SECRET', cron)
  expect(isContactMonitorAuthorized(`Bearer ${cron}`)).toBe(false)
  vi.stubEnv('CONTACT_MONITOR_SECRET', key)
  expect(isContactMonitorAuthorized(`Bearer ${cron}`)).toBe(false)
  expect(isContactMonitorAuthorized(null)).toBe(false)
  expect(isContactMonitorAuthorized(`Bearer ${key} `)).toBe(false)
  expect(isContactMonitorAuthorized(`Bearer ${key}`)).toBe(true)
})
it.each([cron, finance, 'short', 'A'.repeat(64), 'a'.repeat(63)])('rejects shared/invalid configuration', value => {
  vi.stubEnv('CRON_SECRET', cron); vi.stubEnv('FINANCIAL_MAINTENANCE_SECRET', finance)
  vi.stubEnv('CONTACT_MONITOR_SECRET', value)
  expect(isContactMonitorAuthorized(`Bearer ${value}`)).toBe(false)
})
it('does not authorize mutation routes and preserves existing cron authentication', () => {
  vi.stubEnv('CONTACT_MONITOR_SECRET', key); vi.stubEnv('CRON_SECRET', cron)
  vi.stubEnv('FINANCIAL_MAINTENANCE_SECRET', finance)
  expect(isFinancialMaintenanceCronAuthorized(`Bearer ${key}`)).toBe(false)
  expect(isFinancialMaintenanceAuthorized(`Bearer ${key}`)).toBe(false)
  expect(isFinancialMaintenanceCronAuthorized(`Bearer ${cron}`)).toBe(true)
  expect(isFinancialMaintenanceAuthorized(`Bearer ${finance}`)).toBe(true)
})
it('retains Preview isolation', () => {
  vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('PREVIEW_INFRASTRUCTURE_APPROVED', '')
  vi.stubEnv('CONTACT_MONITOR_SECRET', key)
  expect(isContactMonitorAuthorized(`Bearer ${key}`)).toBe(false)
})
