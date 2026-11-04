// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
const actions=vi.hoisted(()=>({price:vi.fn(),promotion:vi.fn(),preview:vi.fn()}))
vi.mock('@/app/platformbeheer/academy/prijzen/actions',()=>({savePriceAction:actions.price,savePromotionAction:actions.promotion,previewPriceAction:actions.preview}))
import {AcademyPriceForm,AcademyPromotionForm,AcademyPricingPreview} from './academy-pricing-admin-forms'
import {defaultAcademyPrices} from '@/lib/learning/academy-pricing-policy'
const users=[{id:'11111111-1111-4111-8111-111111111111',displayName:'Fictieve koper',email:'buyer@example.invalid'}],organizations=[{id:'22222222-2222-4222-8222-222222222222',name:'Fictieve organisatie'}],courses=[{id:'33333333-3333-4333-8333-333333333333',code:'WL-001',title:'RI&E in de praktijk'}]
afterEach(cleanup)
beforeEach(()=>{vi.clearAllMocks();actions.price.mockResolvedValue({ok:false,message:'Controleer de ingevoerde prijzen.'});actions.promotion.mockResolvedValue({ok:true,message:'De korting is opgeslagen.'});actions.preview.mockResolvedValue({ok:true,message:'Voorbeeld: €134,10. Geen bestelling gemaakt.'})})
describe('Academy prijsbeheer semantiek, feedback en formulierbehoud',()=>{
 it('biedt vier benoemde eurovelden en een expliciete fiscale reviewstatus',()=>{render(<AcademyPriceForm prices={defaultAcademyPrices} courseId={null} expectedVersionId={null}/>);expect(screen.getByRole('textbox',{name:'Individueel (€ totaal)'})).toBeTruthy();expect(screen.getByRole('textbox',{name:'Vijf deelnemers (€ totaal)'})).toBeTruthy();expect((screen.getByRole('combobox',{name:'Review'}) as HTMLSelectElement).value).toBe('TAX_REVIEW_REQUIRED')})
 it('behoudt gewijzigde prijs bij fout en verplaatst focus naar tekstuele foutmelding',async()=>{render(<AcademyPriceForm prices={defaultAcademyPrices} courseId={null} expectedVersionId={null}/>);const field=screen.getByRole('textbox',{name:'Individueel (€ totaal)'}) as HTMLInputElement;fireEvent.change(field,{target:{value:'173,45'}});fireEvent.submit(field.closest('form')!);await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Controleer'));expect(field.value).toBe('173,45');expect(document.activeElement).toBe(screen.getByRole('alert'))})
 it('gebruikt native keuzes, percentagegrenzen en expliciete opleidingsscope',()=>{render(<AcademyPromotionForm courses={courses} users={users} organizations={organizations} requestKey={users[0].id}/>);const percent=screen.getByRole('spinbutton',{name:'Korting (%)'}) as HTMLInputElement;expect(percent.min).toBe('0');expect(percent.max).toBe('100');expect(screen.getByRole('checkbox',{name:'WL-001 — RI&E in de praktijk'})).toBeTruthy();fireEvent.change(screen.getByRole('combobox',{name:'Regeling'}),{target:{value:'ACCOUNT'}});expect(screen.getByRole('combobox',{name:'Account'})).toBeTruthy();expect(screen.queryByRole('textbox',{name:'Actiecode'})).toBeNull()})
 it('prijsvoorbeeld is een afzonderlijke actie en kondigt het resultaat tekstueel aan',async()=>{render(<AcademyPricingPreview courses={courses} users={users} organizations={organizations}/>);fireEvent.submit(screen.getByRole('button',{name:'Prijsvoorbeeld berekenen'}).closest('form')!);await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('Geen bestelling'));expect(actions.price).not.toHaveBeenCalled();expect(actions.promotion).not.toHaveBeenCalled()})
})

it('preserves historical course and account targets outside the current selector',()=>{
 const legacyCourse='44444444-4444-4444-8444-444444444444',legacyUser='55555555-5555-4555-8555-555555555555'
 const promotion={id:legacyCourse,creationKey:legacyUser,revision:1,kind:'ACCOUNT' as const,label:'Bestaande korting',code:null,userId:legacyUser,organizationId:null,percentage:10,courseIds:[legacyCourse],active:true,validFrom:null,validUntil:null,maximumUses:null,maximumPerAccount:null,quantity:null}
 const {container}=render(<AcademyPromotionForm courses={courses} users={users} organizations={organizations} requestKey={legacyUser} promotion={promotion}/>)
 const form=container.querySelector('form')!;const data=new FormData(form)
 expect(data.getAll('courseId')).toEqual([legacyCourse]);expect(data.get('userId')).toBe(legacyUser)
 expect((screen.getByRole('combobox',{name:'Account'}) as HTMLSelectElement).value).toBe(legacyUser)
 expect(screen.getByText(/Bestaande opleidingskoppelingen/)).toBeTruthy()
})
