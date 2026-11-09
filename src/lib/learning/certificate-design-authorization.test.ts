import { it,expect,vi } from 'vitest'
const mock=vi.hoisted(()=>({authorize:vi.fn(),db:vi.fn()}))
vi.mock('./academy-authoring-service',()=>({requireAuthor:mock.authorize}))
vi.mock('@/lib/prisma',()=>({getPrisma:mock.db}))
import {listCertificateDesigns,saveCertificateDesign,duplicateCertificateDesign,bindCertificateDesign,transitionCertificateDesign} from './certificate-design-service'
it.each([
 ['list',()=>listCertificateDesigns()],['save',()=>saveCertificateDesign({})],
 ['duplicate',()=>duplicateCertificateDesign('untrusted',false)],
 ['bind',()=>bindCertificateDesign('GLOBAL','untrusted')],
 ['activate',()=>transitionCertificateDesign('untrusted',1,'ACTIVE','untrusted')],
] as const)('requires current platform author before %s and any database access',async(_name,operation)=>{
 mock.db.mockClear();mock.authorize.mockRejectedValue(Error('ACCESS_DENIED'))
 await expect(operation()).rejects.toThrow('ACCESS_DENIED');expect(mock.db).not.toHaveBeenCalled()
})
