import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('platformbeheercockpit', () => {
  const source = readFileSync(join(process.cwd(), 'src/app/platformbeheer/page.tsx'), 'utf8')

  it('presenteert acties vóór kerncijfers, wachtrijen, trends en platformgezondheid', () => {
    const headings = ['Actie vereist', 'Kerncijfers', 'Wachtrijen', 'Trends', 'Platformgezondheid']
    const positions = headings.map((heading) => source.indexOf(`title="${heading}"`))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((left, right) => left - right))
  })

  it('toont ernst niet alleen met kleur en maakt iedere actie toetsenbordbereikbaar', () => {
    expect(source).toContain("CRITICAL: { label: 'Kritiek'")
    expect(source).toContain("HIGH: { label: 'Hoog'")
    expect(source).toContain("NORMAL: { label: 'Normaal'")
    expect(source).toContain('<Link')
    expect(source).toContain('Handel af')
    expect(source).toContain('/platformbeheer/actiecentrum')
  })

  it('claimt geen zoektrends zolang privacyveilige telemetrie niet operationeel is', () => {
    expect(source).toContain('Zoekgedrag wordt nog niet getoond')
    expect(source).toContain('searchTelemetryAvailable')
  })

  it('gebruikt een responsieve DOM-volgorde zonder client-side herschikking', () => {
    expect(source).toContain('grid-cols-2')
    expect(source).toContain('sm:grid-cols-2')
    expect(source).toContain('xl:grid-cols-4')
    expect(source).not.toContain("'use client'")
  })

  it('stuurt een platformauditor server-side direct naar de beperkte auditoromgeving', () => {
    expect(source).toContain("requirePlatformAuditor('/platformbeheer')")
    expect(source).toContain("if (administrator.membershipRole === 'MEMBER') redirect('/platformbeheer/auditor')")
    expect(source).not.toContain('requirePlatformAdministrator')
    expect(source).not.toContain('setTimeout')
  })
})
