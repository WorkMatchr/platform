import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { importAcademyBundle, canonicalAcademyContent, assertExistingAcademyBundle } from './academy-import-service'
import { validateAcademyBundle } from './academy-content-standard'
const state=vi.hoisted(()=>({db:null as PrismaClient|null,actor:''}))
vi.mock('@/lib/prisma',()=>({getPrisma:()=>state.db}))
vi.mock('@/lib/authorization',()=>({getCurrentUser:async()=>state.actor?{id:state.actor}:null}))
vi.mock('@/lib/learning/learning-authorization',()=>({requireLearningUser:async()=>({id:state.actor})}))
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw Error(`REDIRECT:${url}`)}}))
import { saveAuthoringCourse, readAuthoringVersion, authoringMetadata, prepareBundleRevision, transitionAuthoringCourse } from './academy-authoring-service'
import { verifyLocalImportRole } from './academy-import-preflight'
import { startLearningCourseAction, finishLearningBlockAction, submitLearningAnswerAction, completeLearningChapterAction } from '@/app/e-learnings/actions'
import { getFinalExamOverview, startFinalExamAttempt, saveFinalExamAnswer, submitFinalExamAttempt, getFinalExamPlayer } from './learning-final-exam-service'
import { ensureCertificateForPassedExam, getOwnedLearningCertificate, getPublicLearningCertificate } from './learning-certificate-service'
import { saveCertificateDesign, transitionCertificateDesign, bindCertificateDesign, duplicateCertificateDesign } from './certificate-design-service'
import { standardCertificateDesign } from './certificate-design-contract'
import { buildLearningCertificatePdf } from './learning-certificate-pdf'
const enabled=process.env.ACADEMY_CONTENT_POSTGRES_TEST==='true'
const bundles=['WL-001_COURSE_1.2_DRAFT.json','WL-002_COURSE_1.3_DRAFT.json','WL-003_COURSE_1.1_DRAFT.json'].map(f=>validateAcademyBundle(JSON.parse(readFileSync(`content/academy/${f}`,'utf8'))))
describe.skipIf(!enabled)('full Academy content PostgreSQL 18 integration',()=>{
 let db:PrismaClient,admin:string,student:string,outsider:string
 const imports=new Map<string,string>(),edits=new Map<string,string>()
 const editVersion=`it-${Date.now().toString(36)}`
 beforeAll(async()=>{
  const url=new URL(process.env.DATABASE_URL??'')
  if(url.hostname!=='127.0.0.1'||url.port!=='5449'||url.pathname!=='/workmatchr_lms20_synthetic'||url.username!=='academy_content_editor'||url.search||process.env.VERCEL||process.env.RESEND_API_KEY||process.env.MOLLIE_API_KEY||process.env.CRON_SECRET)throw Error('ISOLATED_TEST_TARGET_REQUIRED')
  db=new PrismaClient({adapter:new PrismaPg({connectionString:url.href})});state.db=db
  vi.stubEnv('LEARNING_RUNTIME_ENABLED','true');vi.stubEnv('ACADEMY_LOCAL_ACCEPTANCE','true');vi.stubEnv('ACADEMY_TEST_PROJECT_ID','local-synthetic');vi.stubEnv('ACADEMY_TEST_BRANCH_ID','lms20-isolated');vi.stubEnv('NODE_ENV','test')
  const users=[]
  for(const role of ['ADMIN','USER','USER'] as const)users.push(await db.user.create({data:{email:`content-${randomUUID()}@example.invalid`,displayName:'Synthetische testgebruiker',status:'ACTIVE',emailVerified:true,platformRole:role}}))
  ;[admin,student,outsider]=users.map(u=>u.id)
  const org=await db.organization.upsert({where:{systemKey:'WORKMATCHR_PLATFORM'},create:{name:'Synthetisch platform',organizationType:'PLATFORM_OPERATOR',systemKey:'WORKMATCHR_PLATFORM',status:'ACTIVE'},update:{}})
  await db.organizationMembership.create({data:{userId:admin,organizationId:org.id,role:'OWNER',status:'ACTIVE'}})
  await db.learningProfile.create({data:{userId:student,firstName:'Test',lastName:'Cursist'}})
  state.actor=admin
 },30000)
 afterAll(async()=>{await db?.$disconnect();vi.unstubAllEnvs()})
 it('separates application from migration privileges',async()=>{
  await verifyLocalImportRole(db)
  await expect(db.$executeRawUnsafe('CREATE TABLE public.forbidden_content_ddl(id int)')).rejects.toThrow()
  await expect(db.$executeRawUnsafe('UPDATE _prisma_migrations SET checksum=checksum WHERE false')).rejects.toThrow()
  await expect(db.$executeRawUnsafe('CREATE ROLE forbidden_content_role')).rejects.toThrow()
 })
 for(const bundle of bundles){
  const code=bundle.definition.courseCode
  it(`${code}: imports all content and repeats without any loss or duplicate`,async()=>{
   const first=await importAcademyBundle(db,bundle,{execute:true,operatorReference:'synthetic-content-test'})
   if(!('courseVersionId' in first))throw Error('IMPORT_NOT_EXECUTED');imports.set(code,first.courseVersionId)
   const again=await importAcademyBundle(db,bundle,{execute:true,operatorReference:'synthetic-content-test'})
   expect(again).toMatchObject({courseVersionId:first.courseVersionId,idempotent:true})
   const saved=await readAuthoringVersion(first.courseVersionId)
   expect(authoringMetadata(saved.sourceMetadata).authoring.content).toEqual(bundle)
   expect(saved.chapters).toHaveLength(10)
   await assertExistingAcademyBundle(db,bundle,first.courseVersionId)
  },180000)
  it(`${code}: rejects unauthorized/stale writes, saves revised complete content, preserves the source`,async()=>{
   const id=imports.get(code)!;const original=await readAuthoringVersion(id)
   state.actor=outsider;await expect(saveAuthoringCourse(bundle)).rejects.toThrow();state.actor=admin
   const updated=await prepareBundleRevision(id,editVersion)
   updated.chapters[0].title+=' — bewerkt'
   updated.chapters[0].objectives[0]+=' Zelfstandig toepassen.'
   const text=updated.chapters[0].blocks.find(b=>b.type==='TEXT')!
   text.data={...text.data,title:'Bewerkte synthetische testtitel'}
   updated.chapters[0].questions[0].explanation+=' Synthetische aanvullende feedback.'
   updated.examQuestions[0].explanation+=' Uitleg na redactionele controle.'
   updated.retentionQuestions[0].explanation+=' Gewijzigde kennisbehoudfeedback.'
   updated.definition.schemaVersion=2;updated.definition.certificateTemplateVersion='ACADEMY-CERT-2.0';updated.definition.exam.passingScore=41;updated.definition.exam.passingPercentage=82;updated.examSettings={attemptLimit:2}
   await expect(saveAuthoringCourse(updated,id,9)).rejects.toThrow('STALE_OR_LOCKED_DRAFT')
   const saved=await saveAuthoringCourse(updated,id,0);edits.set(code,saved.id)
   expect(authoringMetadata((await readAuthoringVersion(saved.id)).sourceMetadata).authoring.content).toEqual(updated)
   expect((await readAuthoringVersion(id)).sourceMetadata).toEqual(original.sourceMetadata)
   expect(await saveAuthoringCourse(updated,id,0)).toEqual(saved)
   await assertExistingAcademyBundle(db,updated,saved.id)
   await expect(transitionAuthoringCourse(saved.id,1,'PUBLISHED','Directe publicatie wordt terecht geweigerd')).rejects.toThrow('INVALID_TRANSITION')
  },180000)
 }
 it('rolls back a mid-import question conflict and serializes duplicate imports',async()=>{
  const b=structuredClone(bundles[0]);b.courseVersion='conflict.1';b.examVersion='WL-001-EXAM-conflict.1';b.definition.retention.bankVersion='WL-001-RETENTION-conflict.1';b.definition.retention.programVersion=b.definition.retention.bankVersion
  const all=[...b.chapters.flatMap(c=>c.questions),...b.examQuestions,...b.retentionQuestions];all[0].version=99
  const before=await db.learningQuestion.count()
  await expect(importAcademyBundle(db,b,{execute:true,operatorReference:'synthetic-rollback'})).rejects.toThrow('ACADEMY_QUESTION_VERSION_CONFLICT')
  expect(await db.learningQuestion.count()).toBe(before)
  expect(await db.learningCourseVersion.count({where:{version:'conflict.1'}})).toBe(0)
  const results=await Promise.all([importAcademyBundle(db,bundles[0],{execute:true,operatorReference:'synthetic-concurrency'}),importAcademyBundle(db,bundles[0],{execute:true,operatorReference:'synthetic-concurrency'})])
  expect(results.every(r=>'idempotent' in r&&r.idempotent)).toBe(true)
 },180000)
 for(const bundle of bundles){
  const code=bundle.definition.courseCode
  it(`${code}: actual services progress, fail/retry, pass, single certificate and ownership`,async()=>{
   state.actor=admin;const id=edits.get(code)!
   const design=await saveCertificateDesign({name:`${code} synthetisch certificaat`,revision:0,definition:standardCertificateDesign})
   await transitionCertificateDesign(design.id,1,'REVIEW','Uitsluitend synthetische ontwerpreview')
   await transitionCertificateDesign(design.id,2,'APPROVED','Uitsluitend synthetische ontwerpgoedkeuring')
   await transitionCertificateDesign(design.id,3,'ACTIVE','Uitsluitend lokale testactivering')
   const identity=await db.learningCourseVersion.findUniqueOrThrow({where:{id}})
   await bindCertificateDesign(identity.courseId,design.id)
   await transitionAuthoringCourse(id,1,'REVIEW','Uitsluitend synthetische technische acceptatie; geen juridische goedkeuring')
   await transitionAuthoringCourse(id,2,'APPROVED','Uitsluitend lokale testreview; inhoudelijke productieacceptatie blijft open')
   await transitionAuthoringCourse(id,3,'PUBLISHED','Uitsluitend lokale testpublicatie in geïsoleerde database')
   const enrolled=await db.learningEnrollment.create({data:{userId:student,courseVersionId:id,status:'NOT_STARTED'}})
   const course=await db.learningCourseVersion.findUniqueOrThrow({where:{id},include:{chapters:{orderBy:{position:'asc'},include:{contentBlocks:{orderBy:{position:'asc'},include:{question:true}}}}}})
   state.actor=student;const form=new FormData();form.set('courseSlug',bundle.definition.slug);form.set('courseVersionId',id)
   await expect(startLearningCourseAction(form)).rejects.toThrow('REDIRECT:')
   state.actor=outsider;expect((await finishLearningBlockAction(course.chapters[0].contentBlocks[0].id)).ok).toBe(false);state.actor=student
   await expect(startFinalExamAttempt(student,bundle.definition.slug)).rejects.toThrow('CHAPTERS_INCOMPLETE')
   for(const chapter of course.chapters){for(const block of chapter.contentBlocks){
    const result=block.question?await submitLearningAnswerAction(block.id,block.question.type==='MULTI_CHOICE'?block.question.correctAnswer:(block.question.correctAnswer as string[])[0]):await finishLearningBlockAction(block.id)
    expect(result.ok).toBe(true)
   }expect((await completeLearningChapterAction(chapter.id)).ok).toBe(true)}
   expect((await db.learningEnrollment.findUniqueOrThrow({where:{id:enrolled.id}})).status).not.toBe('NOT_STARTED')
   const failed=await startFinalExamAttempt(student,bundle.definition.slug);expect((await submitFinalExamAttempt(student,failed.id)).passed).toBe(false)
   expect((await ensureCertificateForPassedExam(student,code)).certificate).toBeNull()
   const attempt=await startFinalExamAttempt(student,bundle.definition.slug),player=await getFinalExamPlayer(student,attempt.id)
   expect(player?.questions).toHaveLength(50);expect(await getFinalExamPlayer(outsider,attempt.id)).toBeNull()
   const answers=await db.learningExamQuestion.findMany({where:{examVersionId:attempt.examVersionId},include:{question:true}})
   for(const q of answers)await saveFinalExamAnswer(student,attempt.id,q.questionId,q.question.type==='MULTI_CHOICE'?q.question.correctAnswer:(q.question.correctAnswer as string[])[0])
   const result=await Promise.all([submitFinalExamAttempt(student,attempt.id),submitFinalExamAttempt(student,attempt.id)])
   expect(result.every(r=>r.passed)).toBe(true)
   const certificates=await Promise.all([ensureCertificateForPassedExam(student,code),ensureCertificateForPassedExam(student,code)])
   expect(certificates[0].certificate?.id).toBe(certificates[1].certificate?.id)
   const cert=certificates[0].certificate!;expect(await getOwnedLearningCertificate(outsider,cert.id)).toBeNull();expect((await getPublicLearningCertificate(cert.certificateNumber))?.status).toBe('ACTIVE')
   expect(cert.templateVersion).toBe('ACADEMY-DESIGN-1')
   expect(cert.designSnapshot).toMatchObject({designId:design.id,courseCode:code})
   expect(cert.courseVersion).toBe(editVersion)
   expect(cert.courseTitle).toBe(bundle.definition.title)
   const originalPdf=await buildLearningCertificatePdf(cert)
   expect(Buffer.from(originalPdf).subarray(0,5).toString()).toBe('%PDF-')
   state.actor=admin
   const successor=await duplicateCertificateDesign(design.id,true)
   await transitionCertificateDesign(successor.id,1,'REVIEW','Uitsluitend lokale opvolgreview')
   await transitionCertificateDesign(successor.id,2,'APPROVED','Uitsluitend lokale opvolggoedkeuring')
   await transitionCertificateDesign(successor.id,3,'ACTIVE','Uitsluitend lokale opvolgactivering')
   const historical=await db.learningCertificate.findUniqueOrThrow({where:{id:cert.id}})
   expect(historical.designSnapshot).toEqual(cert.designSnapshot)
   expect(await buildLearningCertificatePdf(historical)).toEqual(originalPdf)
   expect((await db.learningCertificateDesignBinding.findUniqueOrThrow({where:{scope:identity.courseId}})).designId).toBe(successor.id)
   state.actor=student
   await expect(startFinalExamAttempt(student,bundle.definition.slug)).rejects.toThrow('ATTEMPT_LIMIT_REACHED')
   const before=canonicalAcademyContent((await db.learningCourseVersion.findUniqueOrThrow({where:{id}})).sourceMetadata)
   state.actor=admin;const next=await prepareBundleRevision(id,`${editVersion}b`);const nextSaved=await saveAuthoringCourse(next,id,4)
   await transitionAuthoringCourse(nextSaved.id,1,'REVIEW','Synthetische opvolgversie zonder historische mutatie')
   await transitionAuthoringCourse(nextSaved.id,2,'APPROVED','Uitsluitend synthetische technische review')
   const unfinished=await db.learningEnrollment.create({data:{userId:outsider,courseVersionId:id,status:'NOT_STARTED'}})
   await expect(transitionAuthoringCourse(nextSaved.id,3,'PUBLISHED','Onvoltooide cursisten mogen niet worden afgesneden')).rejects.toThrow('ACTIVE_ENROLLMENTS_REQUIRE_VERSION_PLAN')
   await db.learningEnrollment.update({where:{id:unfinished.id},data:{accessRevokedAt:new Date()}})
   await transitionAuthoringCourse(nextSaved.id,3,'PUBLISHED','Uitsluitend lokale publicatie van opvolgversie')
   expect((await db.learningExamVersion.findFirstOrThrow({where:{courseVersionId:id}})).status).toBe('RETIRED')
   expect(await getOwnedLearningCertificate(student,cert.id)).not.toBeNull()
   expect(await getFinalExamOverview(student,bundle.definition.slug,id)).toBeNull()
   expect(canonicalAcademyContent((await db.learningCourseVersion.findUniqueOrThrow({where:{id}})).sourceMetadata)).toBe(before)
   await db.learningEnrollment.create({data:{userId:outsider,courseVersionId:nextSaved.id,status:'NOT_STARTED'}})
   await transitionAuthoringCourse(nextSaved.id,4,'RETIRED','Expliciete intrekking zonder opvolger; geen nieuwe toetsen')
   expect(await getFinalExamOverview(outsider,bundle.definition.slug,nextSaved.id)).toBeNull()
  },240000)
 }
})
