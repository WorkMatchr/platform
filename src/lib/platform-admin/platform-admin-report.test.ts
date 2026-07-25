import { describe, expect, it } from 'vitest'
import { createPlatformReportCsv, escapeCsv } from './platform-admin-report'

describe('platformrapportage', () => {
  it('escapet CSV-waarden veilig', () => {
    expect(escapeCsv('waarde, met "quotes"')).toBe('"waarde, met ""quotes"""')
  })

  it('maakt een reproduceerbaar rapport zonder persoonsgegevens', () => {
    const csv = createPlatformReportCsv({
      generatedAt: new Date('2026-07-25T08:00:00.000Z'),
      dashboard: {
        platform: { organizations: 12 },
        providers: { selectable: 4 },
        assignments: { open: 3 },
        operations: { averageResponseHours: 8.5 },
      },
    })
    expect(csv).toContain('"2026-07-25T08:00:00.000Z"')
    expect(csv).toContain('"Platform","organizations","12"')
    expect(csv).not.toContain('@')
  })
})
