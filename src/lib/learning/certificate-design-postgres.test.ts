import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { randomUUID, createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
const state=vi.hoisted(()=>({db:null as PrismaClient|null,actor:''}))
vi.mock('@/lib/prisma',()=>({getPrisma:()=>state.db}))
vi.mock('@/lib/authorization',()=>({getCurrentUser:async()=>state.actor?{id:state.actor}:null}))
import { saveAuthoringCourse,transitionAuthoringCourse,readAuthoringVersion } from './academy-authoring-service'
import { startFinalExamAttempt,saveFinalExamAnswer,submitFinalExamAttempt,getFinalExamPlayer,getFinalExamResult } from './learning-final-exam-service'
import { ensureCertificateForPassedExam,getOwnedLearningCertificate,getPublicLearningCertificate } from './learning-certificate-service'
import { downloadAcademyCertificate } from './academy-certificate-admin-service'
import { requestAcademyAdminCertificateReview,decideAcademyReview } from './academy-review-service'
vi.mock('@/lib/learning/learning-authorization',()=>({requireLearningUser:async()=>({id:state.actor})}))
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw Error(`REDIRECT:${url}`)}}))
import { startLearningCourseAction,finishLearningBlockAction,submitLearningAnswerAction,completeLearningChapterAction } from '@/app/e-learnings/actions'
import { syntheticCourse as baseCourse } from './academy-authoring-fixture'
import { saveCertificateDesign,duplicateCertificateDesign,transitionCertificateDesign,bindCertificateDesign,listCertificateDesigns } from './certificate-design-service'
import { standardCertificateDesign } from './certificate-design-contract'
const suffix=String(Date.now()).slice(-3)
const syntheticCourse={...baseCourse,attemptLimit:2,code:`WL-${suffix}`,slug:`synthetische-opleiding-${Date.now()}`}
const enabled=process.env.CERTIFICATE_DESIGN_POSTGRES_TEST==='true'
describe.skipIf(!enabled)('Certificate designer isolated PostgreSQL acceptance',()=>{
 let db:PrismaClient,admin:string,student:string,outsider:string,versionId:string,designId:string
 beforeAll(async()=>{
  const url=new URL(process.env.DATABASE_URL??'')
  if(url.hostname!=='127.0.0.1'||url.port!=='5449'||url.pathname!=='/workmatchr_lms20_synthetic'||url.search||process.env.VERCEL||process.env.RESEND_API_KEY||process.env.MOLLIE_API_KEY)throw Error('ISOLATED_TEST_TARGET_REQUIRED')
  db=new PrismaClient({adapter:new PrismaPg({connectionString:url.href})});state.db=db
  expect(await db.$queryRaw`SELECT current_database() name,(current_setting('server_version_num')::int/10000)::int major`).toEqual([{name:'workmatchr_lms20_synthetic',major:18}])
  vi.stubEnv('LEARNING_RUNTIME_ENABLED','true')
  vi.stubEnv('ACADEMY_LOCAL_ACCEPTANCE','true');vi.stubEnv('ACADEMY_TEST_PROJECT_ID','local-synthetic');vi.stubEnv('ACADEMY_TEST_BRANCH_ID','lms20-isolated')
  const users=[]
  for(const role of ['ADMIN','USER','USER'] as const)users.push(await db.user.create({data:{email:`lms-${randomUUID()}@example.invalid`,displayName:'Synthetische testgebruiker',status:'ACTIVE',emailVerified:true,platformRole:role}}))
  ;[admin,student,outsider]=users.map(u=>u.id)
  const org=await db.organization.upsert({where:{systemKey:'WORKMATCHR_PLATFORM'},create:{name:'Synthetisch platform',organizationType:'PLATFORM_OPERATOR',systemKey:'WORKMATCHR_PLATFORM',status:'ACTIVE'},update:{}})
  await db.organizationMembership.create({data:{userId:admin,organizationId:org.id,role:'OWNER',status:'ACTIVE'}})
  await db.learningProfile.create({data:{userId:student,firstName:'Test',lastName:'Cursist'}})
 },30000)
 afterAll(async()=>{await db?.$disconnect();vi.unstubAllEnvs()})
 it('applies every migration with exact checksums and no failures',async()=>{
  const names=readdirSync('prisma/migrations').filter(n=>/^\d/.test(n)).sort()
  const rows=await db.$queryRaw<Array<{migration_name:string;checksum:string;finished_at:Date|null;rolled_back_at:Date|null}>>`SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations ORDER BY migration_name`
  expect(rows.map(r=>r.migration_name)).toEqual(names)
  for(const r of rows){expect(r.finished_at).not.toBeNull();expect(r.rolled_back_at).toBeNull();expect(r.checksum).toBe(createHash('sha256').update(readFileSync(`prisma/migrations/${r.migration_name}/migration.sql`)).digest('hex'))}
 })
 it('refuses unauthorized authoring and creates one fully versioned draft',async()=>{
  state.actor=outsider;await expect(saveAuthoringCourse(syntheticCourse)).rejects.toThrow();state.actor=admin
  const created=await saveAuthoringCourse(syntheticCourse);versionId=created.id
  expect((await readAuthoringVersion(versionId)).chapters).toHaveLength(1)
  await expect(transitionAuthoringCourse(versionId,1,'PUBLISHED','Niet toegestane directe publicatie')).rejects.toThrow('INVALID_TRANSITION')
  await expect(saveAuthoringCourse(syntheticCourse,versionId,0)).rejects.toThrow('STALE_OR_LOCKED_DRAFT')
 })
 it('serializes competing edits, reviews exact content and retains immutable history',async()=>{
  const edits=await Promise.allSettled([saveAuthoringCourse(syntheticCourse,versionId,1),saveAuthoringCourse(syntheticCourse,versionId,1)])
  expect(edits.filter(r=>r.status==='fulfilled')).toHaveLength(1)
  await transitionAuthoringCourse(versionId,2,'REVIEW','Synthetische reviewaanvraag voor testinhoud')
  await expect(saveAuthoringCourse(syntheticCourse,versionId,3)).rejects.toThrow('STALE_OR_LOCKED_DRAFT')
  const block=await db.learningContentBlock.findFirstOrThrow({where:{chapter:{courseVersionId:versionId},type:'TEXT'}})
  const original=block.data
  await db.learningContentBlock.update({where:{id:block.id},data:{data:{title:'Afwijkende inhoud'}}})
  await expect(transitionAuthoringCourse(versionId,3,'APPROVED','Controle van afwijkende opgeslagen inhoud')).rejects.toThrow('REVIEW_CONTENT_DRIFT')
  await db.learningContentBlock.update({where:{id:block.id},data:{data:original!}})
  await transitionAuthoringCourse(versionId,3,'APPROVED','Synthetische menselijke review voor deze testfixture')
  await transitionAuthoringCourse(versionId,4,'PUBLISHED','Uitsluitend publicatie binnen de tijdelijke synthetische database')
  await expect(saveAuthoringCourse(syntheticCourse,versionId,5)).rejects.toThrow('NEW_VERSION_REQUIRED')
  const q=await db.learningQuestion.findFirstOrThrow({where:{code:{startsWith:`AUTH-${versionId}-E`}}})
  await expect(db.learningQuestion.update({where:{id:q.id},data:{explanation:'Verboden historische wijziging'}})).rejects.toThrow()
 })

 it('authorizes, serializes designs, reviews and binds the active version only',async()=>{
  state.actor=outsider
  await expect(listCertificateDesigns()).rejects.toThrow()
  await expect(saveCertificateDesign({name:'Synthetisch',revision:0,definition:standardCertificateDesign})).rejects.toThrow()
  state.actor=admin
  const initial=await saveCertificateDesign({name:'Synthetisch certificaat',revision:0,definition:standardCertificateDesign});designId=initial.id
  const pinned=await db.learningCertificateDesign.findUniqueOrThrow({where:{id:designId}})
  expect(JSON.stringify(pinned.definition)).not.toContain('WORKMATCHR_LOGO')
  await expect(bindCertificateDesign('GLOBAL',designId)).rejects.toThrow()
  await expect(transitionCertificateDesign(designId,1,'ACTIVE','Ongeldige directe activatie')).rejects.toThrow()
  const edits=await Promise.allSettled([saveCertificateDesign({id:designId,revision:1,name:pinned.name,definition:pinned.definition}),saveCertificateDesign({id:designId,revision:1,name:pinned.name,definition:pinned.definition})])
  expect(edits.filter(r=>r.status==='fulfilled')).toHaveLength(1)
  await transitionCertificateDesign(designId,2,'REVIEW','Review uitsluitend voor synthetisch bewijs')
  await expect(saveCertificateDesign({id:designId,revision:3,name:pinned.name,definition:pinned.definition})).rejects.toThrow()
  await transitionCertificateDesign(designId,3,'APPROVED','Synthetische beoordeling van alle afdrukvelden')
  await transitionCertificateDesign(designId,4,'ACTIVE','Synthetische activering op lokale testdatabase')
  await bindCertificateDesign('GLOBAL',designId)
  const version=await db.learningCourseVersion.findUniqueOrThrow({where:{id:versionId}})
  await bindCertificateDesign(version.courseId,designId)
  // Actual WL-001/002/003 bindings are covered by academy-content-postgres.test.ts.
  await expect(transitionCertificateDesign(designId,5,'ARCHIVED','Kan niet zolang gekoppeld')).rejects.toThrow()
  await expect(db.learningCertificateDesign.update({where:{id:designId},data:{definition:{changed:true},revision:{increment:1}}})).rejects.toThrow()
  const duplicate=await duplicateCertificateDesign(designId,false)
  expect((await db.learningCertificateDesign.findUniqueOrThrow({where:{id:duplicate.id}})).state).toBe('DRAFT')
  expect(await db.learningCertificate.count({where:{userId:student}})).toBe(0)
  expect(await db.marketplaceAuditEvent.count({where:{entityType:'LearningCertificateDesign'}})).toBeGreaterThan(8)
 },60000)
 it('fails without certificate, passes once, isolates owners and preserves certificate/PDF history',async()=>{
  const enrollment=await db.learningEnrollment.create({data:{userId:student,courseVersionId:versionId,status:'NOT_STARTED'}})
  const chapters=await db.learningChapter.findMany({where:{courseVersionId:versionId}})
  await expect(startFinalExamAttempt(student,syntheticCourse.slug)).rejects.toThrow('CHAPTERS_INCOMPLETE')
  state.actor=student
  const start=new FormData();start.set('courseSlug',syntheticCourse.slug);start.set('courseVersionId',versionId)
  await expect(startLearningCourseAction(start)).rejects.toThrow('REDIRECT:')
  expect((await db.learningEnrollment.findUniqueOrThrow({where:{id:enrollment.id}})).status).toBe('IN_PROGRESS')
  const blocks=await db.learningContentBlock.findMany({where:{chapterId:chapters[0].id},orderBy:{position:'asc'}})
  state.actor=outsider;expect((await finishLearningBlockAction(blocks[0].id)).ok).toBe(false)
  await db.learningEnrollment.create({data:{userId:outsider,courseVersionId:versionId,status:'IN_PROGRESS',startedAt:new Date('2020-01-01'),accessActivatedAt:new Date('2020-01-01'),accessExpiresAt:new Date('2021-01-01')}})
  expect((await finishLearningBlockAction(blocks[0].id)).ok).toBe(false)
  state.actor=student;expect((await finishLearningBlockAction(blocks[0].id)).ok).toBe(true)
  expect((await submitLearningAnswerAction(blocks[1].id,'1')).ok).toBe(true)
  expect((await completeLearningChapterAction(chapters[0].id)).ok).toBe(true)
  const failed=await startFinalExamAttempt(student,syntheticCourse.slug)
  expect((await submitFinalExamAttempt(student,failed.id)).passed).toBe(false)
  expect((await ensureCertificateForPassedExam(student,syntheticCourse.code)).certificate).toBeNull()
  const attempt=await startFinalExamAttempt(student,syntheticCourse.slug)
  expect(await getFinalExamPlayer(outsider,attempt.id)).toBeNull()
  const player=await getFinalExamPlayer(student,attempt.id);expect(player?.questionCount).toBe(1)
  await expect(saveFinalExamAnswer(outsider,attempt.id,player!.questions[0].id,'1')).rejects.toThrow()
  await saveFinalExamAnswer(student,attempt.id,player!.questions[0].id,'1')
  const results=await Promise.all([submitFinalExamAttempt(student,attempt.id),submitFinalExamAttempt(student,attempt.id)])
  expect(results.every(r=>r.passed)).toBe(true)
  await expect(startFinalExamAttempt(student,syntheticCourse.slug)).rejects.toThrow('ATTEMPT_LIMIT_REACHED')
  const certs=await Promise.all([ensureCertificateForPassedExam(student,syntheticCourse.code),ensureCertificateForPassedExam(student,syntheticCourse.code)])
  expect(certs[0].certificate?.id).toBe(certs[1].certificate?.id)
  const cert=certs[0].certificate!;expect(cert.templateVersion).toBe('ACADEMY-DESIGN-1');expect(cert.designSnapshot).toMatchObject({designId});expect(await db.learningCertificate.count({where:{userId:student}})).toBe(1)
  expect(await getOwnedLearningCertificate(outsider,cert.id)).toBeNull()
  expect((await getPublicLearningCertificate(cert.certificateNumber))?.status).toBe('ACTIVE')
  state.actor=admin;const pdf=await downloadAcademyCertificate(cert.id);expect(Buffer.from(pdf.pdf).subarray(0,5).toString()).toBe('%PDF-')
  expect(await db.notificationOutbox.count({where:{templateKey:'LEARNING_CERTIFICATE_ISSUED',recipientUserId:student}})).toBe(1)
  const oldSnapshot=cert.designSnapshot
  await expect(db.learningCertificate.update({where:{id:cert.id},data:{designSnapshot:{changed:true}}})).rejects.toThrow()
  const newer=await duplicateCertificateDesign(designId,true)
  const draft=await db.learningCertificateDesign.findUniqueOrThrow({where:{id:newer.id}})
  const definition=structuredClone(draft.definition) as unknown as typeof standardCertificateDesign
  definition.background='#ffffff'
  await saveCertificateDesign({id:newer.id,revision:1,name:'Nieuwe synthetische versie',definition})
  await transitionCertificateDesign(newer.id,2,'REVIEW','Nieuwe synthetische review')
  await transitionCertificateDesign(newer.id,3,'APPROVED','Nieuwe synthetische goedkeuring')
  await transitionCertificateDesign(newer.id,4,'ACTIVE','Nieuwe synthetische activering')
  expect((await db.learningCertificateDesignBinding.findUniqueOrThrow({where:{scope:'GLOBAL'}})).designId).toBe(newer.id)
  expect((await db.learningCertificate.findUniqueOrThrow({where:{id:cert.id}})).designSnapshot).toEqual(oldSnapshot)
  expect((await ensureCertificateForPassedExam(student,syntheticCourse.code)).certificate?.id).toBe(cert.id)
  const request={requestKey:randomUUID(),targetId:cert.id,kind:'CERTIFICATE_ERROR',reason:'Synthetische intrekkingscontrole zonder echte certificaten'}
  await expect(requestAcademyAdminCertificateReview(outsider,request)).rejects.toThrow()
  await expect(db.academyReviewEvent.create({data:{...request,requestKey:randomUUID(),caseId:randomUUID(),actorUserId:outsider,subjectUserId:student,action:'REQUESTED',details:{source:'PLATFORM_OPERATOR'}}})).rejects.toThrow()
  const review=await requestAcademyAdminCertificateReview(admin,request)
  const decision={requestKey:randomUUID(),caseId:review.caseId,action:'REVOKED',reason:request.reason}
  await decideAcademyReview(admin,decision);await decideAcademyReview(admin,decision)
  expect((await getPublicLearningCertificate(cert.certificateNumber))?.status).toBe('REVOKED')
  await expect(downloadAcademyCertificate(cert.id)).rejects.toThrow()
  expect((await db.learningExamAttempt.findUniqueOrThrow({where:{id:attempt.id}})).passed).toBe(true)
  expect(await db.academyReviewEvent.count({where:{caseId:review.caseId}})).toBe(2)
  await transitionAuthoringCourse(versionId,5,'RETIRED','Synthetische archivering behoudt bestaande resultaten')
  expect((await getFinalExamResult(student,attempt.id))?.passed).toBe(true)
 },60000)
})
