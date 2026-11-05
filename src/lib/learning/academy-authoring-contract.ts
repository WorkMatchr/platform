import { z } from 'zod'
export const mediaPath = z.string().regex(/^\/learning-media\/[a-f0-9]{64}\.webp$/)
const optionalMedia = z.union([z.literal(''), mediaPath])
export const authorQuestion = z.object({ text: z.string().trim().min(5).max(4000), explanation: z.string().trim().min(5).max(4000), options: z.array(z.object({ text: z.string().trim().min(1).max(1000), correct: z.boolean() }).strict()).min(2).max(8), multiple: z.boolean() }).strict().refine(q => q.options.some(o=>o.correct) && (q.multiple || q.options.filter(o=>o.correct).length===1), 'Kies de juiste antwoorden.')
export const authorLesson = z.object({ title: z.string().trim().min(1).max(240), type: z.enum(['TEXT','IMAGE']), body: z.string().max(20000), media: optionalMedia, alt: z.string().max(1000), captions: optionalMedia }).strict().superRefine((l,c)=>{ if(l.type==='TEXT'&&!l.body.trim())c.addIssue({code:'custom',message:'Lesinhoud ontbreekt.'}); if(l.type!=='TEXT'&&(!l.media||!l.alt.trim()))c.addIssue({code:'custom',message:'Media en tekstalternatief ontbreken.'}); if(l.type==='IMAGE'&&!l.media.endsWith('.webp'))c.addIssue({code:'custom',message:'Gebruik een geverifieerde afbeelding.'}) })
export const authoringSchema = z.object({
 code:z.string().regex(/^WL-\d{3}$/), slug:z.string().regex(/^[a-z0-9-]{3,120}$/), title:z.string().trim().min(3).max(240), description:z.string().trim().min(10).max(8000), image:optionalMedia, category:z.string().trim().min(2).max(100), level:z.string().trim().min(2).max(100), version:z.string().regex(/^[a-zA-Z0-9.-]{1,30}$/),
 chapters:z.array(z.object({ title:z.string().trim().min(3).max(240), minutes:z.number().int().min(1).max(600), lessons:z.array(authorLesson).min(1).max(100), check:authorQuestion }).strict()).min(1).max(100),
 questions:z.array(authorQuestion).min(1).max(99), passingScore:z.number().int().min(1), attemptLimit:z.number().int().min(1).max(100).nullable(), certificate:z.literal(true),
}).strict().refine(x=>!x.image || x.image.endsWith('.webp'),'Gebruik een cursusafbeelding.').refine(x=>x.passingScore<=x.questions.length,'De cesuur is hoger dan het aantal vragen.')
export type AuthoringCourse=z.infer<typeof authoringSchema>
export const authoringStates=['DRAFT','REVIEW','APPROVED','PUBLISHED','RETIRED'] as const
export type AuthoringState=typeof authoringStates[number]
export const authoringLabels:Record<AuthoringState,string>={DRAFT:'Concept',REVIEW:'Review',APPROVED:'Goedgekeurd',PUBLISHED:'Gepubliceerd',RETIRED:'Gearchiveerd'}
export function canTransition(from:AuthoringState,to:AuthoringState){return ({DRAFT:['REVIEW'],REVIEW:['DRAFT','APPROVED'],APPROVED:['DRAFT','PUBLISHED'],PUBLISHED:['RETIRED'],RETIRED:[]} as Record<AuthoringState,string[]>)[from].includes(to)}
