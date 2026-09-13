import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@/generated/prisma/client'
import { createRequestEligibilitySnapshot } from './request-eligibility-service'
import { selectedExpertiseMatchPresentation } from './request-interest-contract'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { RequestMatchExplanation } from '@/components/requests/request-match-explanation'

const projection=(id:string,codes:string[])=>({id,providerProfileId:id,sha256:'fixture',sourceVersion:1,schemaVersion:1,providerProfile:{organizationId:id},payload:{capabilities:codes.map(specialismCode=>({serviceCode:'SAFETY_ADVICE',specialismCode,deliveryModes:['ON_SITE']})),sectors:[],workAreas:[{regionCode:'NATIONWIDE'}]}})
const request={id:'request',regionCode:null,sectorCode:null,primaryExpertise:'Hogere veiligheidskundige (HVK)',primaryExpertiseCodes:['HVK'],additionalExpertise:['Middelbare veiligheidskundige (MVK)','Arbeidshygiënist'],additionalExpertiseCodes:['MVK','ARBEIDSHYGIENIST'],possibleExpertise:[],possibleExpertiseCodes:[]}
describe('expliciete doelgroep binnen bestaande eligibility',()=>{
 it('matcht alleen gekozen codes, koppelt juiste labels en geeft primair voorrang',async()=>{
  const create=vi.fn().mockResolvedValue({});const tx={trustedProviderProjection:{findMany:vi.fn().mockResolvedValue([projection('primary',['HVK']),projection('additional',['MVK']),projection('both',['HVK','MVK']),projection('hygiene',['ARBEIDSHYGIENIST']),projection('outside',['BEDRIJFSARTS'])])},requestEligibleProvider:{create}}
  expect(await createRequestEligibilitySnapshot(tx as unknown as Prisma.TransactionClient,request,new Date(),{primaryExpertise:'HVK',additionalExpertises:['MVK','ARBEIDSHYGIENIST'],expertiseSelectionSource:'USER_SELECTED'})).toBe(4)
  const rows=create.mock.calls.map(([v])=>v.data)
  expect(rows.find(r=>r.providerProfileId==='additional').matchedExpertise).toEqual(['ADDITIONAL:Middelbare veiligheidskundige (MVK)'])
  expect(rows.find(r=>r.providerProfileId==='hygiene').matchedExpertise).toEqual(['ADDITIONAL:Arbeidshygiënist'])
  expect(rows.find(r=>r.providerProfileId==='both').eligibilityBasis.matchType).toBe('PRIMARY')
  expect(rows.find(r=>r.providerProfileId==='additional').eligibilityBasis).toMatchObject({matchType:'ADDITIONAL',expertiseSelectionSource:'USER_SELECTED'})
  expect(rows.some(r=>r.providerProfileId==='outside')).toBe(false)
 })
 it('zonder aanvullend blijft alleen primary over; Route B maakt geen doelgroep',async()=>{
  const create=vi.fn().mockResolvedValue({});const findMany=vi.fn().mockResolvedValue([projection('primary',['HVK']),projection('other',['MVK'])]);const tx={trustedProviderProjection:{findMany},requestEligibleProvider:{create}}
  expect(await createRequestEligibilitySnapshot(tx as unknown as Prisma.TransactionClient,request,new Date(),{primaryExpertise:'HVK',additionalExpertises:[],expertiseSelectionSource:'USER_SELECTED'})).toBe(1)
  expect(await createRequestEligibilitySnapshot(tx as unknown as Prisma.TransactionClient,request,new Date(),{primaryExpertise:null,additionalExpertises:[],expertiseSelectionSource:'USER_SELECTED'})).toBe(0)
  expect(findMany).toHaveBeenCalledTimes(1)
 })
 it('presenteert primary precedence en aanvullende uitleg zonder rangorde-oordeel',()=>{
  const basis={expertiseSelectionSource:'USER_SELECTED'}
  expect(selectedExpertiseMatchPresentation('HVK',['ADDITIONAL:MVK','PRIMARY:HVK'],basis)?.title).toBe('Primaire match')
  const html=renderToStaticMarkup(createElement(RequestMatchExplanation,{primary:'HVK',matches:['ADDITIONAL:MVK'],basis}))
  expect(html).toContain('Aanvullende match');expect(html).toContain('primair HVK geselecteerd en daarnaast MVK');expect(html).not.toMatch(/reserve|tweede keus|minder geschikt/i)
  expect(selectedExpertiseMatchPresentation('HVK',['PRIMARY:HVK'],{})).toBeNull()
 })
})
