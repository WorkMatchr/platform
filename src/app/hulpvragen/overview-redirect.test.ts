import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('hulpvragen-overzichtcompatibiliteit', () => {
  it('stuurt het oude overzicht server-side door naar Mijn opdrachten', () => {
    const page = readFileSync(join(process.cwd(), 'src/app/hulpvragen/page.tsx'), 'utf8')

    expect(page).toContain("import { redirect } from 'next/navigation'")
    expect(page).toContain("redirect('/opdrachten')")
    expect(page).not.toContain("'use client'")
  })
})
