import { beforeEach, expect, it, vi } from 'vitest'
const read=vi.hoisted(()=>vi.fn())
const state=vi.hoisted(()=>({enabled:false,authorize:vi.fn()}))
beforeEach(()=>{state.enabled=false;read.mockClear();state.authorize.mockReset()})
vi.mock('@/lib/platform-admin/platform-admin-authorization',()=>({requirePlatformOperator:state.authorize}))
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('NOT_FOUND')}}))
vi.mock('@/lib/learning/learning-runtime-policy',()=>({isLearningRuntimeEnabled:()=>state.enabled}))
vi.mock('@/lib/learning/academy-authoring-service',()=>({readAuthoringCourses:read,readAuthoringVersion:read,authoringMetadata:vi.fn()}))
vi.mock('@/components/learning/academy-course-editor',()=>({AcademyCourseEditor:()=>null}))
vi.mock('@/components/learning/academy-course-review',()=>({AcademyCourseReview:()=>null}))
import Courses from './page'
import Version from './[versionId]/page'
it('closes the list before querying authoring data',async()=>{await expect(Courses()).rejects.toThrow('NOT_FOUND');expect(read).not.toHaveBeenCalled()})
it('closes the version before querying authoring data',async()=>{await expect(Version({params:Promise.resolve({versionId:'synthetic'})})).rejects.toThrow('NOT_FOUND');expect(read).not.toHaveBeenCalled()})

it.each(['list','version'])('redirects an unauthorized MEMBER before reading the %s', async route => { state.enabled=true;state.authorize.mockRejectedValue(new Error('REDIRECT:/account'));await expect(route==='list'?Courses():Version({params:Promise.resolve({versionId:'synthetic'})})).rejects.toThrow('REDIRECT:/account');expect(read).not.toHaveBeenCalled() })
