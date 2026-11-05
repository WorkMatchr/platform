import { beforeEach, expect, it, vi } from 'vitest'
const state=vi.hoisted(()=>({db:null as unknown}))
vi.mock('@/lib/prisma',()=>({getPrisma:()=>state.db}))
vi.mock('@/lib/learning/learning-authorization',()=>({requireLearningUser:async()=>({id:'fixture-user'})}))
vi.mock('next/navigation',()=>({redirect:(path:string)=>{throw new Error('REDIRECT:'+path)}}))
import {startLearningCourseAction} from '@/app/e-learnings/actions'
function setup(enrolled:boolean){
 const tx={
  $queryRaw:vi.fn().mockResolvedValue([]),
  learningEnrollment:{findUnique:vi.fn().mockResolvedValue(enrolled?{id:'fixture-enrollment',status:'NOT_STARTED'}:null),update:vi.fn()},
  learningProfile:{upsert:vi.fn()},
  learningChapterProgress:{findUnique:vi.fn().mockResolvedValue(null),create:vi.fn()},
 }
 state.db={learningCourseVersion:{findFirst:vi.fn().mockResolvedValue({id:'fixture-version',version:'1.2',chapters:[{id:'fixture-chapter',slug:'inleiding'}]})},$transaction:async(work:(t:typeof tx)=>unknown)=>work(tx)}
 return tx
}
beforeEach(()=>vi.clearAllMocks())
it('preserves the main user lock while refusing to create an entitlement',async()=>{
 const tx=setup(false),form=new FormData();form.set('courseSlug','preventiemedewerker')
 await expect(startLearningCourseAction(form)).rejects.toThrow('REDIRECT:/e-learnings/mijn?melding=geen-toegang')
 expect(tx.$queryRaw).toHaveBeenCalledOnce()
 expect(tx.learningProfile.upsert).not.toHaveBeenCalled()
 expect(tx.learningChapterProgress.create).not.toHaveBeenCalled()
 expect(tx.learningEnrollment.update).not.toHaveBeenCalled()
 expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.learningEnrollment.findUnique.mock.invocationCallOrder[0])
})
it.each(['rie-in-de-praktijk','preventiemedewerker'])('starts only the existing course entitlement for %s',async slug=>{
 const tx=setup(true),form=new FormData();form.set('courseSlug',slug)
 await expect(startLearningCourseAction(form)).rejects.toThrow('REDIRECT:/e-learnings/'+slug+'/leren/inleiding?version=1.2')
 expect(tx.$queryRaw).toHaveBeenCalledOnce()
 expect(tx.learningEnrollment.findUnique).toHaveBeenCalledWith({where:{userId_courseVersionId:{userId:'fixture-user',courseVersionId:'fixture-version'},accessRevokedAt:null,OR:[{accessExpiresAt:null},{accessExpiresAt:{gt:expect.any(Date)}}]}})
 expect(tx.learningChapterProgress.create).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({enrollmentId:'fixture-enrollment',courseVersionId:'fixture-version'})}))
})
