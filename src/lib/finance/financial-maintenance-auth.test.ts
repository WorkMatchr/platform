import { afterEach, describe, expect, it } from 'vitest'
import { isFinancialMaintenanceAuthorized, isFinancialMaintenanceCronAuthorized } from './financial-maintenance-auth'

describe('financiële onderhoudsroute', () => {
  afterEach(() => {
    delete process.env.FINANCIAL_MAINTENANCE_SECRET
    delete process.env.CRON_SECRET
  })

  it('weigert wanneer de serversecret ontbreekt of te kort is', () => {
    expect(isFinancialMaintenanceAuthorized('Bearer onbekend')).toBe(false)
    process.env.FINANCIAL_MAINTENANCE_SECRET = 'te-kort'
    expect(isFinancialMaintenanceAuthorized('Bearer te-kort')).toBe(false)
  })

  it('accepteert uitsluitend de exacte bearer-secret', () => {
    process.env.FINANCIAL_MAINTENANCE_SECRET = 'development-maintenance-secret-1234567890'
    expect(isFinancialMaintenanceAuthorized('Bearer fout')).toBe(false)
    expect(isFinancialMaintenanceAuthorized(`Bearer ${process.env.FINANCIAL_MAINTENANCE_SECRET}`)).toBe(true)
  })

  it('houdt het schedulersecret gescheiden van het handmatige onderhoudssecret', () => {
    process.env.CRON_SECRET = 'development-cron-secret-1234567890123456'
    expect(isFinancialMaintenanceCronAuthorized(`Bearer ${process.env.CRON_SECRET}`)).toBe(true)
    expect(isFinancialMaintenanceCronAuthorized('Bearer fout')).toBe(false)
    expect(isFinancialMaintenanceAuthorized(`Bearer ${process.env.CRON_SECRET}`)).toBe(false)
  })
})
