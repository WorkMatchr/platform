import { describe, expect, it } from 'vitest'
import { getObligationBySlug } from './obligations'

const content = (slug: string) => getObligationBySlug(slug)!
const text = (slug: string) => JSON.stringify(content(slug))

describe('A03 wettelijke afbakening', () => {
  it('onderscheidt RI&E-plicht van toetsing en bewaart beide toetsingsuitzonderingen', () => {
    expect(text('rie')).toContain('maximaal 25 werknemers is op zichzelf geen vrijstelling')
    expect(text('rie')).toContain('erkend branche-instrument')
    expect(text('rie')).toContain('cao-model dat aan de wettelijke voorwaarden voldoet')
    expect(text('rie')).toContain('in totaal maximaal 40 personeelsuren per week')
    expect(text('rie')).toContain('geen vrijstelling van de RI&E zelf')
    expect(content('rie').sourceIds).toContain('arbobesluit-current-a03')
  })
  it('maakt planinhoud verplicht en eigenaarschap een uitvoeringshulpmiddel', () => {
    expect(text('plan-van-aanpak')).toContain('maatregelen, hun samenhang en uitvoeringstermijnen')
    expect(text('plan-van-aanpak')).toContain('helpen bij de uitvoering')
  })
  it('bewaart grens, instemming en beperkte externe uitzondering voor preventiebijstand', () => {
    expect(text('preventiemedewerker')).toContain('maximaal 25 werknemers')
    expect(text('preventiemedewerker')).toContain('als er een OR of PVT is, is instemming vereist')
    expect(text('preventiemedewerker')).toContain('Alleen als interne organisatie niet mogelijk is')
  })
  it('houdt BHV risicogericht met één of meer aangewezen hulpverleners', () => {
    expect(text('bhv')).toContain('één of meer BHV’ers')
    expect(text('bhv')).toContain('geen vaste verhouding per aantal werknemers')
    expect(content('bhv').sourceIds).toContain('arboportaal-bhv')
  })
  it('onderscheidt maatwerk van vangnet en voorkomt een toestemmingseis bij preventief consult', () => {
    expect(text('basiscontract')).toContain('schriftelijke overeenstemming met OR of PVT')
    expect(text('basiscontract')).toContain('vangnetregeling met een gecertificeerde arbodienst')
    expect(text('toegang-bedrijfsarts')).toContain('zonder toestemming van de werkgever of leidinggevende')
  })
  it('behoudt aanbieden versus vrijwillige deelname en arbeidsrisicogerichte PAGO-inhoud', () => {
    expect(content('pago').potentiallyRelevantFor).toContain('Werkgevers moeten hun werknemers PAGO aanbieden.')
    expect(text('pago')).toContain('werknemers zijn in beginsel niet verplicht deel te nemen')
    expect(text('pago')).toContain('algemeen leefstijlonderzoek voldoet niet vanzelf')
  })
  it('koppelt PSA aan artikel 2.15 en presenteert het wetsvoorstel niet als geldende plicht', () => {
    expect(content('psa').legalBasis).toContain('artikel 2.15')
    expect(text('psa')).toContain('het wetsvoorstel is nog in behandeling')
    expect(content('psa').sourceIds).toContain('eerstekamer-vertrouwenspersoon-a03')
    expect(content('psa').sourceIds).not.toContain('arbeidsinspectie-sectoren')
  })
  it('onderscheidt direct melden, later bekend letsel en registratie met werkdagen', () => {
    expect(text('arbeidsongevallen')).toContain('overlijden, ziekenhuisopname of blijvend letsel')
    expect(text('arbeidsongevallen')).toContain('meer dan drie werkdagen verzuim')
    expect(text('arbeidsongevallen')).toContain('meld dan alsnog direct')
    expect(text('arbeidsongevallen')).toContain('dagopname')
  })
  it('behoudt instructie én toezicht, zonder e-learning als universeel voldoende te presenteren', () => {
    expect(text('voorlichting-en-onderricht')).toContain('instructie en toezicht')
    expect(content('voorlichting-en-onderricht').faq[0]?.answer).toMatch(/^Nee\./)
  })
})
