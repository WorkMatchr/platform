import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sessieweergave in beheerlijsten', () => {
  it.each(['src/app/platformbeheer/gebruikers/page.tsx', 'src/app/platformbeheer/platformbeheerders/page.tsx'])(
    'leidt uit een ontbrekende sessie geen ontbrekende loginhistorie af: %s', (path) => {
      const page = readFileSync(path, 'utf8')
      expect(page).toContain('Geen sessie beschikbaar')
      expect(page).not.toContain('Nog niet ingelogd')
    },
  )
})
