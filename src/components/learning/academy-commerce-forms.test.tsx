/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({prepare:vi.fn(),payment:vi.fn(),invite:vi.fn(),accept:vi.fn(),withdraw:vi.fn(),cancel:vi.fn()}))
vi.mock('@/app/e-learnings/commerce-actions',()=>({prepareAcademyOrderAction:mocks.prepare,startAcademyPaymentAction:mocks.payment,inviteAcademySeatAction:mocks.invite,acceptAcademySeatAction:mocks.accept,withdrawAcademyOrderAction:mocks.withdraw,cancelAcademyOrderAction:mocks.cancel}))
import { AcademyOrderForm, AcademyCommerceActionForm } from './academy-commerce-forms'
beforeEach(()=>vi.clearAllMocks());afterEach(cleanup)
const renderOrder=()=>render(<AcademyOrderForm courses={[{code:'WL-001',title:'RI&E in de praktijk'}]} organizationId="organization" requestId="fixture-request-id"/>)
describe('Academy sandboxformulieren: expliciet akkoord en invoerbehoud',()=>{
 it('vinkt contractverklaringen en persoonlijk voordeel niet vooraf aan',()=>{
  renderOrder();expect(screen.getAllByRole('checkbox').every(c=>!(c as HTMLInputElement).checked)).toBe(true)
  expect(screen.getByText(/Volgende stap: controleer uw definitieve prijs/)).toBeTruthy()
  expect(screen.getAllByText(/TAX REVIEW REQUIRED/).length).toBeGreaterThan(0)
 })
 it('behoudt factuurgegevens, accountcontext en keuzes na een serverfout en focust de melding',async()=>{
  mocks.prepare.mockResolvedValue({ok:false,message:'Controleer de ingevulde gegevens.'})
  const {container}=renderOrder()
  fireEvent.change(screen.getByRole('textbox',{name:'Volledige factuurnaam'}),{target:{value:'Fictieve Testkoper'}})
  fireEvent.change(screen.getByRole('textbox',{name:'Adres'}),{target:{value:'Teststraat 1'}})
  fireEvent.submit(container.querySelector('form')!)
  const error=await screen.findByRole('alert')
  expect((screen.getByRole('textbox',{name:'Volledige factuurnaam'}) as HTMLInputElement).value).toBe('Fictieve Testkoper')
  expect((screen.getByRole('textbox',{name:'Adres'}) as HTMLInputElement).value).toBe('Teststraat 1')
  await waitFor(()=>expect(document.activeElement).toBe(error))
  expect(mocks.payment).not.toHaveBeenCalled()
 })
 it('vraagt vijf deelnemers afzonderlijk voor het gemengde alumni-pakket',()=>{
  renderOrder();fireEvent.change(screen.getByRole('combobox',{name:'Aankoop'}),{target:{value:'BUSINESS'}})
  fireEvent.change(screen.getByRole('combobox',{name:'Aantal plaatsen'}),{target:{value:'5'}})
  fireEvent.click(screen.getByRole('checkbox',{name:/De vijf deelnemers nu aanwijzen/}))
  expect(screen.getAllByRole('textbox').filter(t=>(t as HTMLInputElement).type==='email')).toHaveLength(5)
 })
 it('vereist een afzonderlijke betaalbevestiging en een afzonderlijke plaatsaanvaarding',()=>{
  const {unmount}=render(<AcademyCommerceActionForm kind="payment" id="order"/>)
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
  expect(screen.getByRole('button',{name:'Bestelling bevestigen en afronden'})).toBeTruthy();unmount()
  render(<AcademyCommerceActionForm kind="accept" id="seat"/>)
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
  expect(mocks.accept).not.toHaveBeenCalled()
 })
})
