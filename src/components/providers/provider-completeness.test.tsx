import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import { expect, it } from 'vitest'
import type { ProviderCompletenessAssessment } from '@/lib/providers/provider-dossier-completeness'
import { ProviderCompleteness } from './provider-completeness'

it('houdt ingevulde en optionele dossiergegevens bereikbaar zonder hun status te wijzigen', () => {
  const assessment: ProviderCompletenessAssessment = {
    sections: { CAPABILITIES: 'REQUIRED_COMPLETE', WORK_AREA: 'REQUIRED_OPEN',
      PROFESSIONALS: 'OPTIONAL_EMPTY', INSURANCE: 'OPTIONAL_OPEN', EVIDENCE: 'OPTIONAL_COMPLETE',
      CAPACITY: 'NOT_APPLICABLE' },
    policyVersion: 'test', sourceProfileVersion: 1, required: 2, completed: 1, actionRequired: 1,
    expired: 0, notStarted: 0, percentage: 50, blockingSections: ['WORK_AREA'], warnings: [],
    reasons: [], editableSections: [], isSubmittable: false, checksum: 'test',
  }
  const html = renderToStaticMarkup(<ProviderCompleteness assessment={assessment} />)
  const rows = Array.from(new JSDOM(html).window.document.querySelectorAll('li'))
  for (const [label, status, href] of [
    ['Diensten', 'Verplicht · afgerond', '/aanbiedersdossier/diensten-en-ervaring#diensten'],
    ['Werkgebied', 'Verplicht · nog afronden', '/aanbiedersdossier/diensten-en-ervaring#werkgebied'],
    ['Professionals', 'Optioneel · niet ingevuld', '/aanbiedersdossier/professionals'],
    ['Verzekeringen', 'Optioneel · nog afronden', '/aanbiedersdossier/verzekeringen'],
    ['Bewijsstukken', 'Optioneel · afgerond', '/aanbiedersdossier/bewijsstukken'],
    ['Beschikbaarheid', 'Niet van toepassing', null],
  ] as const) {
    const row = rows.find(item => item.textContent === label + status)
    expect(row, label).toBeDefined()
    expect(row?.querySelector('a')?.getAttribute('href') ?? null).toBe(href)
  }
})
