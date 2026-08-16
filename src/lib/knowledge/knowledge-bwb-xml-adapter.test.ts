import { describe, expect, it } from 'vitest'
import { adaptBwbXmlToStructuredSections, extractBwbXmlFullSource } from './knowledge-bwb-xml-adapter'

const fixture = `<?xml version="1.0" encoding="UTF-8"?>
<toestand bwb-id="BWBR0010346" inwerkingtreding="2026-07-01">
  <wetgeving><citeertitel>Arbeidsomstandighedenwet</citeertitel><wet-besluit>
    <hoofdstuk><kop><label>Hoofdstuk</label><nr>3</nr><titel>Samenwerking</titel></kop>
      <artikel label="Artikel 15"><kop><label>Artikel</label><nr>15</nr><titel>Bedrijfshulpverlening</titel></kop>
        <lid><lidnr>1</lidnr><al>De werkgever laat zich bijstaan.</al></lid>
        <lid><lidnr>2</lidnr><al>De bijstand houdt in:</al><lijst><li><li.nr>a.</li.nr><al>eerste hulp;</al></li><li><li.nr>b.</li.nr><al>brand bestrijden.</al><lijst><li><li.nr>1°.</li.nr><al>subonderdeel.</al></li></lijst></li></lijst></lid>
      </artikel>
    </hoofdstuk>
  </wet-besluit></wetgeving>
</toestand>`

describe('BWB XML-adapter', () => {
  it('behoudt artikel, lid, onderdeel, subonderdeel en volgorde deterministisch', () => {
    const first = adaptBwbXmlToStructuredSections(fixture)
    const replay = adaptBwbXmlToStructuredSections(fixture)
    expect(first).toEqual(replay)
    expect(first.map((section) => section.heading)).toEqual([
      'Arbeidsomstandighedenwet',
      'Hoofdstuk 3 Samenwerking > Artikel 15 Bedrijfshulpverlening > Lid 1',
      'Hoofdstuk 3 Samenwerking > Artikel 15 Bedrijfshulpverlening > Lid 2',
      'Hoofdstuk 3 Samenwerking > Artikel 15 Bedrijfshulpverlening > Lid 2 > Onderdeel a',
      'Hoofdstuk 3 Samenwerking > Artikel 15 Bedrijfshulpverlening > Lid 2 > Onderdeel b',
      'Hoofdstuk 3 Samenwerking > Artikel 15 Bedrijfshulpverlening > Lid 2 > Onderdeel b > Onderdeel 1°',
    ])
    expect(first.at(-1)?.paragraphs).toEqual(['subonderdeel.'])
  })

  it('levert via WORKMATCHR_LEGAL_TEXT een stabiele extractiefingerprint', () => {
    const first = extractBwbXmlFullSource(fixture)
    const replay = extractBwbXmlFullSource(fixture)
    expect(first.extractorName).toBe('WORKMATCHR_LEGAL_TEXT')
    expect(first.configurationVersion).toBe('BWB_XML_2026_1')
    expect(first.extractionFingerprint).toBe(replay.extractionFingerprint)
    expect(first.pages[0].blocks.some((block) => block.sectionPath?.includes('Lid 2 > Onderdeel b'))).toBe(true)
  })

  it('weigert onveilige of niet-herleidbare XML fail-closed', () => {
    expect(() => adaptBwbXmlToStructuredSections('<!DOCTYPE x [<!ENTITY y "z">]><toestand/>')).toThrow('KNOWLEDGE_BWB_XML_UNSAFE_DECLARATION')
    expect(() => adaptBwbXmlToStructuredSections('<toestand bwb-id="BWBR0010346"><wetgeving/></toestand>')).toThrow('KNOWLEDGE_BWB_XML_IDENTITY_INVALID')
  })
})
