import {describe,it,expect,vi,beforeEach} from 'vitest'
const service=vi.hoisted(()=>({saveAuthoringCourse:vi.fn(),transitionAuthoringCourse:vi.fn(),prepareBundleRevision:vi.fn()}))
vi.mock('@/lib/learning/academy-authoring-service',()=>service)
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}))
import {saveCourse,changeCourseState} from './actions'
describe('Academy editor veilige foutmeldingen',()=>{
 beforeEach(()=>vi.resetAllMocks())
 it('maakt de bestaande historische identiteitshold begrijpelijk',async()=>{service.saveAuthoringCourse.mockRejectedValue(Error('PUBLISHED_IDENTITY_IMMUTABLE'));expect(await saveCourse({})).toMatchObject({ok:false,message:expect.stringContaining('afzonderlijk versieplan')})})
 it('maakt de actieve cursistenhold zichtbaar',async()=>{service.transitionAuthoringCourse.mockRejectedValue(Error('ACTIVE_ENROLLMENTS_REQUIRE_VERSION_PLAN'));expect(await changeCourseState('synthetic',3,'PUBLISHED','synthetische review')).toMatchObject({ok:false,message:expect.stringContaining('actieve cursisten')})})
 it('lekt geen technische of gevoelige fouten bij opslaan',async()=>{service.saveAuthoringCourse.mockRejectedValue(Error('private-diagnostic-example'));const result=await saveCourse({});expect(result.ok).toBe(false);expect(JSON.stringify(result)).not.toContain('private-diagnostic-example')})
 it('lekt geen technische of gevoelige fouten bij publicatie',async()=>{service.transitionAuthoringCourse.mockRejectedValue(Error('private-diagnostic-example'));const result=await changeCourseState('synthetic',3,'PUBLISHED','synthetische review');expect(result.ok).toBe(false);expect(JSON.stringify(result)).not.toContain('private-diagnostic-example')})
})
