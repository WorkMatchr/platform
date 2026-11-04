import { afterEach, describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { prepareLearningMedia, learningMediaLimit } from './learning-media-storage'
import { academyDefinitionSchema,createAcademyDefinition } from './academy-course-definition'
import { POST } from '@/app/platformbeheer/academy/media/route'
const mocks=vi.hoisted(()=>({author:vi.fn(),save:vi.fn()}))
vi.mock('./academy-authoring-service',()=>({requireAuthor:mocks.author}))
// Keep the real format validator while isolating route storage writes.
vi.mock('./learning-media-storage',async original=>({...await original<typeof import('./learning-media-storage')>(),saveLearningMedia:mocks.save}))
afterEach(()=>{vi.unstubAllEnvs();vi.clearAllMocks()})
describe('LMS media and immutable version boundaries',()=>{
 it('retains legacy counts and requires an explicit v2 contract',()=>{
   const legacy=createAcademyDefinition({code:'WL-991',slug:'test-cursus',title:'Test cursus',subtitle:''})
   expect(academyDefinitionSchema.safeParse({...legacy,chapterCount:1}).success).toBe(false)
   expect(academyDefinitionSchema.safeParse({...legacy,schemaVersion:2,chapterCount:1,exam:{...legacy.exam,questionCount:1,passingScore:1,passingPercentage:100},certificateTemplateVersion:'ACADEMY-CERT-2.0'}).success).toBe(true)
 })
 it('decodes and re-encodes an image with a content-addressed name',async()=>{
   const png=await sharp({create:{width:8,height:8,channels:3,background:'#116699'}}).png().toBuffer()
   const result=await prepareLearningMedia(new File([new Uint8Array(png)],'synthetic.png',{type:'image/png'}))
   expect(result.key).toMatch(/^[a-f0-9]{64}\.webp$/);expect(result.mediaType).toBe('image/webp')
 })
 it('rejects fake images, active content and oversized files',async()=>{
   await expect(prepareLearningMedia(new File(['<script>bad</script>'],'image.png',{type:'image/png'}))).rejects.toThrow()
   await expect(prepareLearningMedia(new File(['WEBVTT\n<script>bad</script>'],'captions.vtt'))).rejects.toThrow('MEDIA_FORMAT')
   await expect(prepareLearningMedia(new File([new Uint8Array(learningMediaLimit+1)],'large.mp4',{type:'video/mp4'}))).rejects.toThrow('MEDIA_SIZE')
 })
 it('accepts captions without external resources',async()=>expect((await prepareLearningMedia(new File(['WEBVTT\n\n00:00.000 --> 00:01.000\nSynthetisch'],'test.vtt',{type:'text/vtt'}))).mediaType).toBe('text/vtt'))
 it('blocks cross-origin and unauthenticated uploads before storage',async()=>{
   vi.stubEnv('NEXT_PUBLIC_APP_URL','http://127.0.0.1:3072')
   const forbidden=await POST(new Request('http://127.0.0.1:3072/platformbeheer/academy/media',{method:'POST',headers:{origin:'https://untrusted.example'}}))
   expect(forbidden.status).toBe(403);expect(mocks.author).not.toHaveBeenCalled()
   mocks.author.mockRejectedValueOnce(Error('ACCESS_DENIED'))
   const denied=await POST(new Request('http://127.0.0.1:3072/platformbeheer/academy/media',{method:'POST',headers:{origin:'http://127.0.0.1:3072'}}))
   expect(denied.status).toBe(400);expect(mocks.save).not.toHaveBeenCalled()
 })
})
