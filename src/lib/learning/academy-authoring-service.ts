import { isAcademyBundle, bundleHash, saveBundleDraft, verifyBundleDraft, publishBundleQuestions } from './academy-bundle-authoring'
import { validateAcademyBundle, type AcademyCourseBundle } from './academy-content-standard'
import 'server-only'
import { createHash } from 'node:crypto'
import { Prisma } from '@/generated/prisma/client'
import { getPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/authorization'
import { getPlatformOperatorContext } from '@/lib/platform-admin/platform-admin-authorization'
import { isLearningRuntimeEnabled } from './learning-runtime-policy'
import { authoringSchema, canTransition, type AuthoringCourse, type AuthoringState } from './academy-authoring-contract'
import { createAcademyDefinition } from './academy-course-definition'
import { readLearningMedia } from './learning-media-storage'

export type AuthoringMetadata = { authoring: { content: AuthoringCourse | AcademyCourseBundle; state: AuthoringState; revision: number; hash: string; reviewedBy?: string; reviewedAt?: string; reviewReason?: string }; academy: ReturnType<typeof createAcademyDefinition> }
export async function requireAuthor() {
  if (!isLearningRuntimeEnabled()) throw new Error('LEARNING_DISABLED')
  const user = await getCurrentUser()
  if (!user) throw new Error('ACCESS_DENIED')
  return getPlatformOperatorContext(user.id)
}
export function contentHash(content: AuthoringCourse | AcademyCourseBundle) { if (isAcademyBundle(content)) return bundleHash(validateAcademyBundle(content)); return createHash('sha256').update(JSON.stringify(authoringSchema.parse(content))).digest('hex') }
export function authoringMetadata(value: unknown): AuthoringMetadata {
  const metadata = value as AuthoringMetadata & { bundle?: unknown; bundleHash?: string }
  if (!metadata?.authoring && metadata?.bundle) {
    const bundle = validateAcademyBundle(metadata.bundle)
    if (bundleHash(bundle) !== metadata.bundleHash) throw Error('CONTENT_INTEGRITY_FAILED')
    return { academy: bundle.definition, authoring: { content: bundle, state: 'DRAFT', revision: 0, hash: bundleHash(bundle) } } as AuthoringMetadata
  }
  if (!metadata?.authoring || !metadata.academy) throw new Error('LEGACY_VERSION_READ_ONLY')
  const content = isAcademyBundle(metadata.authoring.content) ? validateAcademyBundle(metadata.authoring.content) : authoringSchema.parse(metadata.authoring.content)
  if (contentHash(content) !== metadata.authoring.hash) throw new Error('CONTENT_INTEGRITY_FAILED')
  return metadata
}
function json(value: unknown) { return value as Prisma.InputJsonValue }
export async function readAuthoringCourses() {
  await requireAuthor()
  return getPrisma().learningCourse.findMany({ orderBy: {title:'asc'}, include: { versions: {orderBy:{createdAt:'desc'}} } })
}
export async function readAuthoringVersion(id: string) {
  await requireAuthor()
  return getPrisma().learningCourseVersion.findUniqueOrThrow({where:{id},include:{course:true,chapters:{orderBy:{position:'asc'},include:{contentBlocks:{orderBy:{position:'asc'},include:{question:{include:{options:true}}}}}},enrollments:{select:{id:true,status:true,user:{select:{displayName:true}},examAttempts:{select:{score:true,maxScore:true,passed:true,submittedAt:true}}}}}})
}
export async function saveAuthoringCourse(raw: unknown, versionId?: string, expectedRevision = 0) {
  const actor = await requireAuthor()
  if (isAcademyBundle(raw)) return getPrisma().$transaction(tx => saveBundleDraft(tx, raw, actor.userId, versionId, expectedRevision), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 180000 })
  const input = authoringSchema.parse(raw)
  const db = getPrisma()
  return db.$transaction(async tx => {
    // Serialize all edits/publications for this identity, including first creation.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`academy-author:${input.code}`},0))::text`
    const previous = versionId ? await tx.learningCourseVersion.findUniqueOrThrow({where:{id:versionId},include:{course:true}}) : null
    if(previous && (previous.status!=='DRAFT' || previous.course.code!==input.code)) throw new Error('NEW_VERSION_REQUIRED')
    const old = previous ? authoringMetadata(previous.sourceMetadata) : null
    if(old && (old.authoring.state!=='DRAFT' || old.authoring.revision!==expectedRevision)) throw new Error('STALE_OR_LOCKED_DRAFT')
    let course=await tx.learningCourse.findUnique({where:{code:input.code}})
    if(course && (course.slug!==input.slug || course.title!==input.title || course.description!==input.description)) {
      if(await tx.learningCourseVersion.count({where:{courseId:course.id,status:{not:'DRAFT'}}})) throw new Error('PUBLISHED_IDENTITY_IMMUTABLE')
      course=await tx.learningCourse.update({where:{id:course.id},data:{slug:input.slug,title:input.title,description:input.description}})
    }
    course ??= await tx.learningCourse.create({data:{code:input.code,slug:input.slug,title:input.title,description:input.description}})
    const definition=createAcademyDefinition({code:input.code,slug:input.slug,title:input.title,subtitle:input.category})
    definition.schemaVersion=2
    definition.certificateTemplateVersion='ACADEMY-CERT-2.0'
    definition.chapterCount=input.chapters.length
    definition.exam={code:`${input.code}-FINAL`,questionCount:input.questions.length,passingScore:input.passingScore,passingPercentage:Math.floor(100*input.passingScore/input.questions.length)}
    const metadata:AuthoringMetadata={academy:definition,authoring:{content:input,state:'DRAFT',revision:(old?.authoring.revision??0)+1,hash:contentHash(input)}}
    const version=previous ? await tx.learningCourseVersion.update({where:{id:previous.id},data:{version:input.version,sourceMetadata:json(metadata)}}) : await tx.learningCourseVersion.create({data:{courseId:course.id,version:input.version,sourceMetadata:json(metadata)}})
    if(await tx.learningEnrollment.count({where:{courseVersionId:version.id}})) throw new Error('DRAFT_HAS_ENROLLMENTS')
    const oldChapters=await tx.learningChapter.findMany({where:{courseVersionId:version.id},select:{id:true}})
    const oldExams=await tx.learningExamVersion.findMany({where:{courseVersionId:version.id},select:{id:true}})
    const ids=oldChapters.map(c=>c.id), examIds=oldExams.map(e=>e.id)
    const ownedQuestions=await tx.learningQuestion.findMany({where:{code:{startsWith:`AUTH-${version.id}-`}},select:{id:true}})
    await tx.learningExamQuestion.deleteMany({where:{examVersionId:{in:examIds}}})
    await tx.learningExamVersion.deleteMany({where:{id:{in:examIds}}})
    await tx.learningContentBlock.deleteMany({where:{chapterId:{in:ids}}})
    await tx.learningChapter.deleteMany({where:{id:{in:ids}}})
    await tx.learningQuestionOption.deleteMany({where:{questionId:{in:ownedQuestions.map(q=>q.id)}}})
    await tx.learningQuestion.deleteMany({where:{id:{in:ownedQuestions.map(q=>q.id)}}})
    async function question(q:AuthoringCourse['questions'][number],code:string){return tx.learningQuestion.create({data:{code:`AUTH-${version.id}-${code}`,version:1,knowledgeArea:input.category,learningObjective:input.title,type:q.multiple?'MULTI_CHOICE':'SINGLE_CHOICE',questionText:q.text,explanation:q.explanation,correctAnswer:q.options.flatMap((o,i)=>o.correct?[String(i+1)]:[]),options:{create:q.options.map((o,i)=>({value:String(i+1),text:o.text,isCorrect:o.correct,position:i+1}))}}})}
    for(const [index,ch] of input.chapters.entries()){
      const check=await question(ch.check,`C${index+1}`)
      await tx.learningChapter.create({data:{courseVersionId:version.id,slug:`hoofdstuk-${index+1}`,title:ch.title,position:index+1,estimatedMinutes:ch.minutes,contentBlocks:{create:[
        ...ch.lessons.map((l,i)=>({position:i+1,type:l.type,data:json({title:l.title,paragraphs:l.body.split('\n').filter(Boolean),src:l.media,alt:l.alt,captions:l.captions,transcript:l.body})})),
        {position:ch.lessons.length+1,type:ch.check.multiple?'MULTI_CHOICE':'SINGLE_CHOICE',questionId:check.id,data:{title:'Hoofdstukcheck',prompt:ch.check.text}},
      ]}}})
    }
    const exam=await tx.learningExam.upsert({where:{code:definition.exam.code},create:{code:definition.exam.code,courseId:course.id,title:`Eindtoets — ${input.title}`},update:{}})
    if(exam.courseId!==course.id)throw new Error('EXAM_COURSE_MISMATCH')
    const questions=[]
    for(const [i,q] of input.questions.entries()){const row=await question(q,`E${i+1}`);questions.push({questionId:row.id,position:i+1,code:`E${String(i+1).padStart(2,'0')}`,chapterNumber:1,cognitiveLevel:'T',knowledgeAreas:[input.category]})}
    await tx.learningExamVersion.create({data:{examId:exam.id,courseId:course.id,courseVersionId:version.id,version:input.version,questionCount:questions.length,maxScore:questions.length,passingScore:input.passingScore,passingPercentage:definition.exam.passingPercentage,attemptLimit:input.attemptLimit,questions:{create:questions}}})
    await tx.marketplaceAuditEvent.create({data:{actorUserId:actor.userId,actorRole:'PLATFORM_ADMIN',entityType:'LearningCourseVersion',entityId:version.id,action:'ACADEMY_DRAFT_SAVED',metadata:{revision:metadata.authoring.revision,hash:metadata.authoring.hash}}})
    return {id:version.id,revision:metadata.authoring.revision}
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000})
}
async function verifyStoredContent(tx: Prisma.TransactionClient, id: string, content: AuthoringCourse) {
  const version = await tx.learningCourseVersion.findUniqueOrThrow({
    where: { id },
    include: {
      course: true,
      chapters: {
        orderBy: { position: 'asc' },
        include: {
          contentBlocks: {
            orderBy: { position: 'asc' },
            include: { question: { include: { options: { orderBy: { position: 'asc' } } } } },
          },
        },
      },
    },
  })
  const exams = await tx.learningExamVersion.findMany({
    where: { courseVersionId: id },
    include: { questions: { orderBy: { position: 'asc' }, include: { question: { include: { options: { orderBy: { position: 'asc' } } } } } } },
  })
  const equal = (a:unknown,b:unknown) => { if(JSON.stringify(a)!==JSON.stringify(b))throw new Error('REVIEW_CONTENT_DRIFT') }
  equal([version.version,version.course.code,version.course.slug,version.course.title,version.course.description],[content.version,content.code,content.slug,content.title,content.description])
  equal(version.chapters.length,content.chapters.length)
  const checkQuestion = (q:NonNullable<(typeof version.chapters)[number]['contentBlocks'][number]['question']>, expected:AuthoringCourse['questions'][number]) => {
    equal([q.questionText,q.explanation,q.type,q.correctAnswer,q.options.map(o=>({text:o.text,correct:o.isCorrect,value:o.value,position:o.position}))],
      [expected.text,expected.explanation,expected.multiple?'MULTI_CHOICE':'SINGLE_CHOICE',expected.options.flatMap((o,i)=>o.correct?[String(i+1)]:[]),expected.options.map((o,i)=>({text:o.text,correct:o.correct,value:String(i+1),position:i+1}))])
  }
  for(const [i,ch] of version.chapters.entries()){
    const expected=content.chapters[i]; equal([ch.title,ch.position,ch.estimatedMinutes,ch.contentBlocks.length],[expected.title,i+1,expected.minutes,expected.lessons.length+1])
    for(const [n,l] of expected.lessons.entries()){
      const b=ch.contentBlocks[n]; equal([b.position,b.type,b.questionId],[n+1,l.type,null]);
      const data=b.data as Record<string,unknown>; equal([data.title,data.paragraphs,data.src,data.alt,data.captions,data.transcript],[l.title,l.body.split('\n').filter(Boolean),l.media,l.alt,l.captions,l.body])
    }
    const b=ch.contentBlocks.at(-1)!;equal([b.position,b.type,(b.data as Record<string,unknown>).prompt],[expected.lessons.length+1,expected.check.multiple?'MULTI_CHOICE':'SINGLE_CHOICE',expected.check.text]);if(!b.question)throw Error('REVIEW_CONTENT_DRIFT');checkQuestion(b.question,expected.check)
  }
  equal(exams.length,1);const exam=exams[0]
  equal([exam.version,exam.questionCount,exam.maxScore,exam.passingScore,exam.passingPercentage,exam.attemptLimit,exam.timeLimitMinutes,exam.questions.length],[content.version,content.questions.length,content.questions.length,content.passingScore,Math.floor(100*content.passingScore/content.questions.length),content.attemptLimit,null,content.questions.length])
  exam.questions.forEach((q,i)=>{equal(q.position,i+1);checkQuestion(q.question,content.questions[i])})
  const media = new Set([content.image,...content.chapters.flatMap(ch=>ch.lessons.flatMap(l=>[l.media,l.captions]))].filter(Boolean))
  for(const src of media) if(!await readLearningMedia(src.slice('/learning-media/'.length)))throw Error('MEDIA_NOT_VERIFIED')
}

export async function transitionAuthoringCourse(id:string,revision:number,to:AuthoringState,reason:string){
  const actor=await requireAuthor()
  if(reason.trim().length<10||reason.length>2000)throw new Error('REVIEW_REASON_REQUIRED')
  return getPrisma().$transaction(async tx=>{
    const identity=await tx.learningCourseVersion.findUniqueOrThrow({where:{id},select:{course:{select:{code:true}}}})
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`academy-author:${identity.course.code}`},0))::text`
    const version=await tx.learningCourseVersion.findUniqueOrThrow({where:{id}})
    const meta=authoringMetadata(version.sourceMetadata)
    const from=version.status==='DRAFT'?meta.authoring.state:version.status
    if(meta.authoring.revision!==revision || !canTransition(from,to))throw new Error('INVALID_TRANSITION')
    if(to!=='DRAFT'&&to!=='RETIRED') {
      if(isAcademyBundle(meta.authoring.content)) await verifyBundleDraft(tx,id,meta.authoring.content)
      else await verifyStoredContent(tx,id,meta.authoring.content)
    }
    const next={...meta,authoring:{...meta.authoring,state:to,revision:revision+1}}
    if(to==='APPROVED')Object.assign(next.authoring,{reviewedBy:actor.userId,reviewedAt:new Date().toISOString(),reviewReason:reason.trim()})
    if(to==='DRAFT'){delete next.authoring.reviewedBy;delete next.authoring.reviewedAt;delete next.authoring.reviewReason}
    if(to==='PUBLISHED'){
      if(!meta.authoring.reviewedBy||!meta.authoring.reviewedAt)throw new Error('HUMAN_APPROVAL_REQUIRED')
      // Do not strand existing learners: historical reports remain immutable, but retired
      // exams intentionally cannot receive new attempts. Require a separate transition plan.
      const activePredecessors=await tx.learningEnrollment.count({where:{accessRevokedAt:null,courseVersion:{courseId:version.courseId,status:'PUBLISHED',id:{not:id}},OR:[{examAttempts:{none:{passed:true,status:'SUBMITTED'}}},{examAttempts:{some:{status:'IN_PROGRESS'}}}]}})
      if(activePredecessors)throw Error('ACTIVE_ENROLLMENTS_REQUIRE_VERSION_PLAN')
      // Existing database publication guards validate question/options and completeness.
      if(isAcademyBundle(meta.authoring.content)) await publishBundleQuestions(tx,id,meta.authoring.content)
      else await tx.learningQuestion.updateMany({where:{code:{startsWith:`AUTH-${id}-`}},data:{status:'PUBLISHED'}})
      await tx.learningExamVersion.updateMany({where:{courseId:version.courseId,status:'PUBLISHED',courseVersionId:{not:id}},data:{status:'RETIRED'}})
      await tx.learningExamVersion.updateMany({where:{courseVersionId:id,status:'DRAFT'},data:{status:'PUBLISHED',publishedAt:new Date()}})
      const superseded=await tx.learningCourseVersion.findMany({where:{courseId:version.courseId,status:'PUBLISHED',id:{not:id}},select:{id:true}})
      await tx.learningCourseVersion.updateMany({where:{id:{in:superseded.map(v=>v.id)},status:'PUBLISHED'},data:{status:'RETIRED'}})
      for(const previous of superseded)await tx.marketplaceAuditEvent.create({data:{actorUserId:actor.userId,actorRole:'PLATFORM_ADMIN',entityType:'LearningCourseVersion',entityId:previous.id,action:'ACADEMY_VERSION_SUPERSEDED',metadata:{successorVersionId:id}}})
      await tx.learningCourseVersion.update({where:{id},data:{status:'PUBLISHED',publishedAt:new Date(),sourceMetadata:json(next)}})
      await tx.learningCourse.update({where:{id:version.courseId},data:{status:'PUBLISHED'}})
    }else if(to==='RETIRED'){
      await tx.learningExamVersion.updateMany({where:{courseVersionId:id,status:'PUBLISHED'},data:{status:'RETIRED'}})
      await tx.learningCourseVersion.update({where:{id},data:{status:'RETIRED'}})
    }else await tx.learningCourseVersion.update({where:{id},data:{sourceMetadata:json(next)}})
    await tx.marketplaceAuditEvent.create({data:{actorUserId:actor.userId,actorRole:'PLATFORM_ADMIN',entityType:'LearningCourseVersion',entityId:id,action:'ACADEMY_PUBLICATION_TRANSITION',metadata:{from,to,hash:meta.authoring.hash,reason:reason.trim()}}})
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:30000})
}

/** Prepare an explicit new draft without mutating the source or writing any row. */
export async function prepareBundleRevision(id: string, version: string) {
  await requireAuthor()
  if (!/^[a-zA-Z0-9.-]{1,18}$/.test(version)) throw Error('INVALID_NEW_VERSION')
  const source = await getPrisma().learningCourseVersion.findUniqueOrThrow({ where: { id } })
  const metadata = source.sourceMetadata as Record<string, unknown> | null
  const content = metadata?.bundle ?? (metadata?.authoring as { content?: unknown } | undefined)?.content
  const bundle = structuredClone(validateAcademyBundle(content))
  if (source.version === version) throw Error('NEW_VERSION_REQUIRED')
  bundle.courseVersion = version
  bundle.examVersion = `${bundle.definition.courseCode}-EXAM-${version}`
  bundle.definition.exam.code = `${bundle.definition.courseCode}-FINAL`
  bundle.definition.retention.bankVersion = `${bundle.definition.courseCode}-RETENTION-${version}`
  bundle.definition.retention.programVersion = `${bundle.definition.courseCode}-RETENTION-${version}`
  const all = [...bundle.chapters.flatMap(c => c.questions), ...bundle.examQuestions, ...bundle.retentionQuestions]
  const versions = await getPrisma().learningQuestion.groupBy({ by: ['code'], where: { code: { in: all.map(q => q.code) } }, _max: { version: true } })
  const max = new Map(versions.map(q => [q.code, q._max.version ?? 0]))
  for (const question of all) question.version = Math.max(question.version, max.get(question.code) ?? 0) + 1
  return validateAcademyBundle(bundle)
}
