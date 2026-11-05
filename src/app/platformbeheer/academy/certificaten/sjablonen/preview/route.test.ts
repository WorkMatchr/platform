vi.mock('@/lib/learning/certificate-design-preview',()=>({certificatePreviewPng:vi.fn().mockResolvedValue(Buffer.from('synthetic PNG'))}))
import { beforeEach,it,expect,vi } from 'vitest'
const mock=vi.hoisted(()=>({author:vi.fn(),render:vi.fn()}))
vi.mock('@/lib/learning/academy-authoring-service',()=>({requireAuthor:mock.author}))
vi.mock('@/lib/learning/certificate-design-pdf',()=>({renderCertificateDesign:mock.render}))
import { POST } from './route'
import { standardCertificateDesign } from '@/lib/learning/certificate-design-contract'
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('NEXT_PUBLIC_APP_URL','http://127.0.0.1:3077');mock.author.mockResolvedValue({userId:'synthetic'});mock.render.mockResolvedValue(new Uint8Array([37,80,68,70]))})
const request=(body:unknown,origin='http://127.0.0.1:3077')=>new Request('http://127.0.0.1:3077/platformbeheer/academy/certificaten/sjablonen/preview',{method:'POST',headers:{origin},body:JSON.stringify(body)})
it('refuses cross-origin before auth or rendering',async()=>{expect((await POST(request(standardCertificateDesign,'https://example.invalid'))).status).toBe(403);expect(mock.author).not.toHaveBeenCalled()})
it('refuses unauthenticated and disabled runtime access',async()=>{mock.author.mockRejectedValue(Error('ACCESS_DENIED'));expect((await POST(request(standardCertificateDesign))).status).toBe(400);expect(mock.render).not.toHaveBeenCalled()})
it('uses only server-owned synthetic data with no-store',async()=>{const r=await POST(request(standardCertificateDesign));expect(r.status).toBe(200);expect(r.headers.get('Cache-Control')).toContain('no-store');expect(mock.render).toHaveBeenCalledWith(standardCertificateDesign,expect.objectContaining({'deelnemer.naam':'Jan de Vries'}),true)})
it('does not accept injected certificate/person fields',async()=>{expect((await POST(request({...standardCertificateDesign,firstName:'injected',issue:true}))).status).toBe(400);expect(mock.render).not.toHaveBeenCalled()})
it('bounds actual streamed content without trusting Content-Length',async()=>{expect((await POST(request('x'.repeat(100001)))).status).toBe(413);expect(mock.render).not.toHaveBeenCalled()})
