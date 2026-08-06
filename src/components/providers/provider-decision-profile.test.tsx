import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('opdrachtgebonden dienstverlenersprofiel', () => {
  const component = fs.readFileSync(path.join(process.cwd(), 'src/components/providers/provider-decision-profile.tsx'), 'utf8')
  const route = fs.readFileSync(path.join(process.cwd(), 'src/app/opdrachten/[assignmentId]/dienstverleners/[providerProfileId]/page.tsx'), 'utf8')
  const service = fs.readFileSync(path.join(process.cwd(), 'src/lib/providers/provider-decision-profile-service.ts'), 'utf8')

  it('gebruikt een compacte kernkolom en mobiele lineaire volgorde', () => {
    expect(component).toContain('lg:grid-cols-[minmax(17rem,0.34fr)_minmax(0,0.66fr)]')
    expect(component).toContain('lg:sticky')
    expect(component).toContain('min-w-0')
  })

  it('toont verificatie alleen met een expliciet statuslabel', () => {
    expect(component).toContain("label === 'Geverifieerd door WorkMatchr'")
    expect(service).toContain("return 'Zelf opgegeven'")
  })

  it('biedt geen vrij contact- of zoekpad', () => {
    expect(component).not.toContain('contactEmail')
    expect(component).not.toContain('generalEmail')
    expect(component).not.toContain('phone')
    expect(component).not.toContain('Vraag direct')
    expect(route).toContain('getAssignmentProviderDecisionProfile')
  })
})
