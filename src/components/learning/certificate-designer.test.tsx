// @vitest-environment jsdom
import { afterEach,beforeEach,it,expect,vi } from 'vitest'
import { cleanup,fireEvent,render,screen } from '@testing-library/react'
const mock=vi.hoisted(()=>({save:vi.fn(),push:vi.fn(),refresh:vi.fn()}))
vi.mock('next/navigation',()=>({useRouter:()=>({push:mock.push,refresh:mock.refresh})}))
vi.mock('@/app/platformbeheer/academy/certificaten/sjablonen/actions',()=>({saveDesign:mock.save,duplicateDesign:vi.fn(),changeDesignState:vi.fn(),selectDesign:vi.fn()}))
import { CertificateDesigner } from './certificate-designer'
beforeEach(()=>{vi.useFakeTimers();vi.clearAllMocks();mock.save.mockResolvedValue({ok:false,message:'Opslaan mislukt; invoer blijft staan.'});vi.stubGlobal('fetch',vi.fn().mockRejectedValue(Error('synthetic offline')))})
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals()})
it('exposes accessible position, typography, upload and placeholder controls without drag dependency',()=>{
 render(<CertificateDesigner data={{designs:[],courses:[],bindings:[]}}/>)
 expect(screen.getByRole('heading',{name:'Certificaatontwerper'})).toBeTruthy()
 expect(screen.getByLabelText('Links')).toBeTruthy();expect(screen.getByLabelText('Breedte')).toBeTruthy()
 fireEvent.change(screen.getByLabelText('Blok bewerken'),{target:{value:'statement'}})
 fireEvent.change(screen.getByLabelText('Invulveld toevoegen'),{target:{value:'cursus.code'}})
 expect((screen.getByLabelText('Tekst') as HTMLTextAreaElement).value).toContain('{{cursus.code}}')
 fireEvent.click(screen.getByRole('button',{name:'Ongedaan maken'}))
 expect((screen.getByLabelText('Tekst') as HTMLTextAreaElement).value).not.toContain('{{cursus.code}}')
 fireEvent.click(screen.getByRole('button',{name:'Opnieuw uitvoeren'}))
 expect((screen.getByLabelText('Tekst') as HTMLTextAreaElement).value).toContain('{{cursus.code}}')
})
it('keeps edited text on errors and warns before leaving a dirty design',async()=>{
 render(<CertificateDesigner data={{designs:[],courses:[],bindings:[]}}/>)
 fireEvent.change(screen.getByLabelText('Sjabloonnaam'),{target:{value:'Mijn lokale ontwerp'}})
 const event=new Event('beforeunload',{cancelable:true});window.dispatchEvent(event);expect(event.defaultPrevented).toBe(true)
 await fireEvent.click(screen.getByRole('button',{name:'Concept opslaan'}))
 await Promise.resolve()
 expect((screen.getByLabelText('Sjabloonnaam') as HTMLInputElement).value).toBe('Mijn lokale ontwerp')
 expect(mock.save).toHaveBeenCalledWith(expect.objectContaining({name:'Mijn lokale ontwerp'}))
})
