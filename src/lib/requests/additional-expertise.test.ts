import { describe, expect, it } from 'vitest'
import { additionalExpertiseMatrix, directAdditionalExpertises, retainAdditionalExpertises } from './additional-expertise'
import { simpleAdviceSchema, requestedExpertiseOptions } from './simple-advice-contract'
import { additionalExpertiseIntroduction, additionalExpertiseReason } from '@/content/additional-expertise-context'

const expected = {
HVK:'MVK,ARBEIDSHYGIENIST,INCIDENTONDERZOEK', MVK:'HVK,MACHINEVEILIGHEID,ERGONOMIE_FYSIEKE_BELASTING',
ARBEIDSHYGIENIST:'GEVAARLIJKE_STOFFEN,GELUIDSDESKUNDIGE,STRALINGSDESKUNDIGE', A_EN_O_DESKUNDIGE:'ARBEIDSPSYCHOLOOG,VERTROUWENSPERSOON',
BEDRIJFSARTS:'CASEMANAGER_VERZUIM,ARBEIDSPSYCHOLOOG,A_EN_O_DESKUNDIGE', ERGONOMIE_FYSIEKE_BELASTING:'ARBEIDSHYGIENIST,MVK,BEDRIJFSARTS',
MACHINEVEILIGHEID:'MVK,HVK', GEVAARLIJKE_STOFFEN:'ARBEIDSHYGIENIST,EXPLOSIEVEILIGHEID', EXPLOSIEVEILIGHEID:'GEVAARLIJKE_STOFFEN,ARBEIDSHYGIENIST,BRANDVEILIGHEID',
INCIDENTONDERZOEK:'HVK,MVK,MACHINEVEILIGHEID', BRANDVEILIGHEID:'BHV_DESKUNDIGE,EXPLOSIEVEILIGHEID', GELUIDSDESKUNDIGE:'ARBEIDSHYGIENIST', STRALINGSDESKUNDIGE:'ARBEIDSHYGIENIST',
ARBEIDSPSYCHOLOOG:'A_EN_O_DESKUNDIGE,BEDRIJFSARTS,VERTROUWENSPERSOON', VERTROUWENSPERSOON:'A_EN_O_DESKUNDIGE,ARBEIDSPSYCHOLOOG', CASEMANAGER_VERZUIM:'BEDRIJFSARTS,ARBODIENST',
PREVENTIEMEDEWERKER:'MVK,HVK,ARBEIDSHYGIENIST,ERGONOMIE_FYSIEKE_BELASTING,A_EN_O_DESKUNDIGE', BHV_DESKUNDIGE:'BRANDVEILIGHEID,MVK', ARBODIENST:'BEDRIJFSARTS,ARBEIDSHYGIENIST,A_EN_O_DESKUNDIGE,HVK', KEURINGSINSTANTIE:'MACHINEVEILIGHEID',
}
const input = {routeChoice:'KNOWS_EXPERTISE',requestedExpertise:'HVK',requestTitle:'Veilige werkplek',requestDescription:'Wij zoeken hulp bij een veilige werkplek.',desiredOutcome:'ADVICE',workLocationMode:'REMOTE',desiredStartMode:'LATER'}
describe('goedgekeurde directe matrix',()=>{
 it('omvat exact de bestaande twintig identiteiten',()=>expect(Object.keys(additionalExpertiseMatrix).sort()).toEqual(requestedExpertiseOptions.map(o=>o.value).sort()))
 it.each(requestedExpertiseOptions)('$value bevat uitsluitend goedgekeurde directe opties',({value})=>{
  const options=directAdditionalExpertises(value)
  expect(options).toEqual(expected[value].split(','));expect(options).not.toContain(value);expect(new Set(options).size).toBe(options.length)
  for(const id of options) expect(additionalExpertiseReason(value,id)).not.toMatch(/u heeft.*nodig|verplicht|tweede keus|reserve/i)
 })
 it.each([[],['MVK'],['MVK','ARBEIDSHYGIENIST']])('staat expliciete keuze %j toe',(...ids)=>{
  const v=simpleAdviceSchema.parse({...input,additionalExpertises:ids});expect(v.additionalExpertises).toEqual(ids);expect(v.primaryExpertise).toBe('HVK');expect(v.expertiseSelectionSource).toBe('USER_SELECTED')
 })
 it.each([['MVK','ARBEIDSHYGIENIST','INCIDENTONDERZOEK'],['MVK','MVK'],['HVK'],['BEDRIJFSARTS']])('weigert ongeldige keuze %j',(...ids)=>expect(simpleAdviceSchema.safeParse({...input,additionalExpertises:ids}).success).toBe(false))
 it('houdt Route B zonder expertise en verwerpt aanvullende input',()=>{
  const b={...input,routeChoice:'NEEDS_TOPIC',helpTopic:'UNKNOWN'}
  expect(simpleAdviceSchema.parse(b)).toMatchObject({primaryExpertise:null,requestedExpertise:null,additionalExpertises:[]})
  expect(simpleAdviceSchema.safeParse({...b,additionalExpertises:['MVK']}).success).toBe(false)
 })
 it('weigert conflicterende primaire snapshotprojectie',()=>expect(simpleAdviceSchema.safeParse({...input,primaryExpertise:'MVK'}).success).toBe(false))
 it('behoudt uitsluitend compatibele expliciete keuzes na primary-wijziging',()=>expect(retainAdditionalExpertises('ERGONOMIE_FYSIEKE_BELASTING',['MVK','INCIDENTONDERZOEK'])).toEqual(['MVK']))
 it('activeert geen conditionele relaties',()=>{expect(directAdditionalExpertises('ERGONOMIE_FYSIEKE_BELASTING')).not.toContain('HVK');expect(directAdditionalExpertises('ARBEIDSHYGIENIST')).not.toContain('ERGONOMIE_FYSIEKE_BELASTING');expect(directAdditionalExpertises('EXPLOSIEVEILIGHEID')).not.toContain('HVK')})
 it('gebruikt bijzondere introducties',()=>{expect(additionalExpertiseIntroduction('PREVENTIEMEDEWERKER').text).toContain('interne rol');expect(additionalExpertiseIntroduction('ARBODIENST').title).toBe('Beschikbare aanvullende disciplines');expect(additionalExpertiseIntroduction('KEURINGSINSTANTIE').title).toBe('Mogelijk aanvullende expertise')})
})

it('houdt snapshotserialisatie stabiel bij herhaald inlezen',()=>{for(const raw of [input,{...input,routeChoice:'NEEDS_TOPIC',helpTopic:'UNKNOWN'}]){const parsed=simpleAdviceSchema.parse(raw);expect(JSON.stringify(simpleAdviceSchema.parse(parsed))).toBe(JSON.stringify(parsed))}})
