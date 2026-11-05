/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('next/link',()=>({default:({href,children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=><a href={href} {...props}>{children}</a>}))
vi.mock('@/app/platformbeheer/academy/certificaten/actions',()=>({requestCertificateResendAction:vi.fn()}))
import {AcademyCertificateList} from './academy-certificate-list'
import {AcademyCertificateResendDialog} from './academy-certificate-resend-dialog'
const certificateId='10000000-0000-4000-8000-000000000003'
const certificateNumber='WM-RIE-2026-0123456789ABCDEF01234567'
beforeEach(()=>{
 Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','')}})
 Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:function(){this.removeAttribute('open');this.dispatchEvent(new Event('close'))}})
})
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
describe('certificate resend confirmation',()=>{
 function open(){
  render(<AcademyCertificateResendDialog certificateId={certificateId} requestId="10000000-0000-4000-8000-000000000006" recipientFingerprint={'a'.repeat(64)} recipientEmail="student@example.invalid" name="Johannes Cornelis van den Berg-Smit" courseTitle="RI&E in de praktijk" certificateNumber={certificateNumber}/>)
  const trigger=screen.getByRole('button',{name:'Certificaat opnieuw versturen'});trigger.focus();fireEvent.click(trigger)
  return {trigger,dialog:screen.getByRole('dialog',{name:'Certificaat opnieuw versturen'})}
 }
 it('shows original snapshot and verified address, without a prechecked confirmation',()=>{
  const {dialog}=open()
  expect(within(dialog).getByText('Johannes Cornelis van den Berg-Smit')).toBeDefined()
  expect(within(dialog).getByText('student@example.invalid')).toBeDefined()
  expect((within(dialog).getByRole('checkbox') as HTMLInputElement).checked).toBe(false)
  expect(within(dialog).getByRole('checkbox').hasAttribute('required')).toBe(true)
  expect(document.activeElement).toBe(within(dialog).getByRole('button',{name:'Annuleren'}))
 })
 it('restores focus on cancel and preserves the original confirmation data on reopening',()=>{
  const {dialog,trigger}=open();fireEvent.click(within(dialog).getByRole('button',{name:'Annuleren'}));expect(document.activeElement).toBe(trigger)
  fireEvent.click(trigger);expect(within(screen.getByRole('dialog')).getByText(certificateNumber)).toBeDefined()
 })
 it('allows native Escape cancellation and has bounded mobile scrolling',()=>{
  const {dialog,trigger}=open()
  const event=new Event('cancel',{cancelable:true});dialog.dispatchEvent(event);if(!event.defaultPrevented)(dialog as HTMLDialogElement).close()
  expect(document.activeElement).toBe(trigger)
  expect(dialog.className).toContain('overflow-y-auto');expect(dialog.className).toContain('max-h-[90dvh]')
 })
})
describe('private certificate search UI',()=>{
 it('posts personal search input in the body, retains filters and pages server-side',async()=>{
  const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({rows:[],total:26,page:1,pageCount:2})});vi.stubGlobal('fetch',fetcher)
  render(<AcademyCertificateList courses={[{code:'WL-001',title:'RI&E in de praktijk'}]} initial={{rows:[],total:0,page:1,pageCount:1}}/>)
  fireEvent.change(screen.getByLabelText('Naam, e-mailadres of certificaatnummer'),{target:{value:'student@example.invalid'}})
  fireEvent.click(screen.getByRole('button',{name:'Zoeken en filteren'}))
  await waitFor(()=>expect(fetcher).toHaveBeenCalledOnce())
  const [url,options]=fetcher.mock.calls[0]
  expect(url).toBe('/platformbeheer/academy/certificaten/zoeken');expect(url).not.toContain('student')
  expect(JSON.parse(options.body)).toMatchObject({q:'student@example.invalid',page:1})
  await waitFor(()=>expect(document.activeElement).toBe(screen.getByRole('heading',{name:'Gevonden certificaten'})))
  fireEvent.click(screen.getByRole('button',{name:'Volgende pagina'}))
  await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2))
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toMatchObject({q:'student@example.invalid',page:2})
 })
 it('keeps input and previous result on a network error and provides retry',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('offline')))
  render(<AcademyCertificateList courses={[]} initial={{rows:[],total:0,page:1,pageCount:1}}/>)
  const input=screen.getByLabelText('Naam, e-mailadres of certificaatnummer') as HTMLInputElement
  fireEvent.change(input,{target:{value:'Voorbeeld'}});fireEvent.click(screen.getByRole('button',{name:'Zoeken en filteren'}))
  await waitFor(()=>expect(screen.getByRole('alert')).toBeDefined());expect(input.value).toBe('Voorbeeld')
  expect(screen.getByRole('button',{name:'Zoeken en filteren'}).hasAttribute('disabled')).toBe(false)
 })
})
