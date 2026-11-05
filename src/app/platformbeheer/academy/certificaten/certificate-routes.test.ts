import {beforeEach,describe,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({list:vi.fn(),download:vi.fn(),request:vi.fn()}))
vi.mock('@/lib/learning/academy-certificate-admin-service',()=>({
 AcademyCertificateAdminError:class extends Error { constructor(public status:number){super('Unavailable')} },
 listAcademyCertificates:mocks.list,downloadAcademyCertificate:mocks.download,requestAcademyCertificateResend:mocks.request,
}))
import {AcademyCertificateAdminError} from '@/lib/learning/academy-certificate-admin-service'
import {POST} from './zoeken/route'
import {GET} from './[certificateId]/pdf/route'
import {requestCertificateResendAction} from './actions'
beforeEach(()=>{vi.clearAllMocks()})
describe('private certificate routes',()=>{
 it('returns no-store and noindex for search; does not use URL personal data',async()=>{
  mocks.list.mockResolvedValue({rows:[],total:0,page:1,pageCount:1})
  const r=await POST(new Request('http://127.0.0.1/zoeken',{method:'POST',body:JSON.stringify({q:'student@example.invalid'})}))
  expect(r.status).toBe(200);expect(r.headers.get('Cache-Control')).toContain('no-store');expect(r.headers.get('X-Robots-Tag')).toContain('noindex')
  expect(mocks.list).toHaveBeenCalledWith({q:'student@example.invalid'})
 })
 it.each([401,403,404,409])('keeps status %i generic for PDF',async status=>{
  mocks.download.mockRejectedValue(new AcademyCertificateAdminError(status))
  const r=await GET(new Request('http://127.0.0.1/pdf'),{params:Promise.resolve({certificateId:'fixture'})})
  expect(r.status).toBe(status);expect(await r.text()).not.toMatch(/student|email|token|score/)
 })
 it('serves the existing PDF with attachment and private headers',async()=>{
  mocks.download.mockResolvedValue({pdf:new Uint8Array(Buffer.from('%PDF-fixture')),filename:'Certificaat-test.pdf'})
  const r=await GET(new Request('http://127.0.0.1/pdf'),{params:Promise.resolve({certificateId:'fixture'})})
  expect(r.status).toBe(200);expect(r.headers.get('content-type')).toBe('application/pdf');expect(r.headers.get('content-disposition')).toContain('Certificaat-test.pdf')
 })
 it('requires confirmed input in the server action and ignores a client supplied recipient',async()=>{
  const form=new FormData();form.set('certificateId','fixture');form.set('requestId','request');form.set('recipientFingerprint','fingerprint');form.set('email','other@example.invalid')
  mocks.request.mockRejectedValue(new AcademyCertificateAdminError(400))
  expect((await requestCertificateResendAction({},form)).queued).toBeUndefined()
  expect(mocks.request).toHaveBeenCalledWith({certificateId:'fixture',requestId:'request',recipientFingerprint:'fingerprint',confirmed:false})
 })
 it('reports queued rather than falsely claiming delivery',async()=>{
  mocks.request.mockResolvedValue({queued:true});const form=new FormData();form.set('confirmed','on')
  expect(await requestCertificateResendAction({},form)).toEqual({queued:true,message:'Het herverzendverzoek is opgeslagen.'})
 })
})
