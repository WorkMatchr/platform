import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ProviderOfferingForm } from '@/components/providers/provider-offering-form'
import { catalogRow, offeringChanges, type Offering } from '@/lib/providers/provider-offering'

const sector = { id: 'sector', label: 'Bouw' }
const legacy = { ...catalogRow('service', { id: 'old', label: 'Bestaand specialisme' }),
  key: 'record', recordId: 'record', termId: null, selected: true, specialismId: 'historic',
  specialismLabel: 'Historisch', modes: ['HYBRID' as const] }
const initial: Offering = { profileId: 'profile', version: 3, editSectors: true, editServices: true,
  sectors: [sector], services: [], specialisms: [], rows: [catalogRow('sector', sector), legacy] }
describe('gecombineerd dienstverlenersprofiel', () => {
  it('biedt één opslagactie en bewaart een geselecteerd historisch specialisme bij ontbrekende catalogi', () => {
    const html = renderToStaticMarkup(<ProviderOfferingForm initial={initial} save={vi.fn()} />)
    expect(html.match(/type="submit"/g)).toHaveLength(1)
    expect(html).toContain('catalogus voor diensten bevat momenteel geen beschikbare keuzes')
    expect(html).toContain('Historisch (bestaande keuze)')
    expect(html).toContain('Bouw')
    expect(html).toContain('checked=""')
    expect(html).toContain('Leveringsvormen voor Bestaand specialisme')
  })
  it('toont leden alleen de opgeslagen keuzes zonder opslagknop', () => {
    const html = renderToStaticMarkup(<ProviderOfferingForm initial={{ ...initial, editSectors: false, editServices: false }} save={vi.fn()} />)
    expect(html).not.toContain('type="submit"')
    expect(html).not.toContain('Bouw')
    expect(html).toContain('Bestaand specialisme')
  })
  it('verstuurt alleen expliciet gewijzigde records; weglaten archiveert niets', () => {
    const selected = { ...initial.rows[0], selected: true, years: 0 }
    expect(offeringChanges(initial.rows, [legacy])).toEqual([])
    expect(offeringChanges(initial.rows, [selected, legacy])).toEqual([
      { kind: 'sector', selected: true, years: 0, recordId: null, modes: [], specialismId: null, termId: 'sector' },
    ])
    expect(offeringChanges(initial.rows, [{ ...legacy, selected: false }])[0]).toMatchObject({ recordId: 'record', selected: false })
  })
})
