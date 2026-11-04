import { describe, expect, it } from 'vitest'
import { authoringSchema, canTransition } from './academy-authoring-contract'
import { safeLearningMedia } from './learning-media-policy'
import { syntheticCourse } from './academy-authoring-fixture'
describe('LMS authoring contract',()=>{
 it('accepts a generic course without fixed chapter/question counts',()=>expect(authoringSchema.parse(syntheticCourse).chapters).toHaveLength(1))
 it.each([0,2])('rejects impossible passing score %s',score=>expect(authoringSchema.safeParse({...syntheticCourse,passingScore:score}).success).toBe(false))
 it('requires a correct answer and no ambiguous single-choice answers',()=>{for(const options of [[{text:'A',correct:false},{text:'B',correct:false}],[{text:'A',correct:true},{text:'B',correct:true}]])expect(authoringSchema.safeParse({...syntheticCourse,questions:[{...syntheticCourse.questions[0],options}]}).success).toBe(false)})
 it('requires review and approval and prevents editing published states',()=>{expect(canTransition('DRAFT','PUBLISHED')).toBe(false);expect(canTransition('REVIEW','PUBLISHED')).toBe(false);expect(canTransition('APPROVED','PUBLISHED')).toBe(true);expect(canTransition('PUBLISHED','DRAFT')).toBe(false)})
 it.each(['https://tracker.example/pixel.png','//tracker.example/p.png','javascript:alert(1)','/learning-media/../secret.png','/learning-media/test.svg'])('rejects unsafe media %s',src=>expect(safeLearningMedia(src)).toBeNull())
 it('requires video captions and transcript',()=>expect(authoringSchema.safeParse({...syntheticCourse,chapters:[{...syntheticCourse.chapters[0],lessons:[{...syntheticCourse.chapters[0].lessons[0],type:'VIDEO',media:'/learning-media/test.mp4',alt:'Video',captions:''}]}]}).success).toBe(false))
})
