/** @vitest-environment jsdom */
import React from 'react'
import {afterEach,describe,it,expect,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
vi.stubGlobal('React',React)
vi.mock('@/app/academy/herroepen/actions',()=>({submitWithdrawal:vi.fn().mockResolvedValue({error:'Controleer uw gegevens.'})}))
import {AcademyWithdrawalForm} from './academy-withdrawal-form'
afterEach(cleanup)
describe('account-independent withdrawal accessibility and explicit confirmation',()=>{
 it('keeps identification data on both steps and does not preselect the declaration',async()=>{
  render(<AcademyWithdrawalForm requestKey="10000000-0000-4000-8000-000000000001"/>)
  expect(screen.queryByRole('checkbox')).toBeNull()
  fireEvent.change(screen.getByLabelText('Aankoopreferentie'),{target:{value:'synthetic-order'}})
  fireEvent.change(screen.getByLabelText('E-mailadres voor ontvangstbevestiging'),{target:{value:'synthetic@example.invalid'}})
  fireEvent.click(screen.getByRole('button',{name:'Verklaring controleren'}))
  const heading=screen.getByRole('heading',{name:'Stap 2 van 2 — Uw verklaring bevestigen'})
  await waitFor(()=>expect(document.activeElement).toBe(heading))
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
  expect((screen.getByLabelText('Aankoopreferentie') as HTMLInputElement).value).toBe('synthetic-order')
  fireEvent.click(screen.getByRole('button',{name:'Gegevens wijzigen'}))
  await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('heading',{name:/Stap 1 van 2/})))
  expect((screen.getByLabelText('E-mailadres voor ontvangstbevestiging') as HTMLInputElement).value).toBe('synthetic@example.invalid')
  expect(screen.queryByRole('checkbox')).toBeNull()
 })
})
