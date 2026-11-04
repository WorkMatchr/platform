import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { assertAcademyDatabaseTarget } from './academy-database-policy'
import { importAcademyBundle } from './academy-import-service'
import { wl002CourseBundle as original } from './wl002-course-bundle'
import { wl002RemediatedCourseBundle as revised } from './wl002-content-v1-2'

describe.skipIf(process.env.WL002_REMEDIATION_RUNTIME !== '1')('WL-002 immutable DRAFT version import in isolated Academy PostgreSQL', () => {
  let db: PrismaClient
  beforeAll(async () => {
    assertAcademyDatabaseTarget({ databaseUrl: process.env.DATABASE_URL, projectId: process.env.ACADEMY_TEST_PROJECT_ID, branchId: process.env.ACADEMY_TEST_BRANCH_ID, nodeEnv: process.env.NODE_ENV })
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) })
    const identity = await db.$queryRaw<{database:string;version:number}[]>`SELECT current_database() AS database,current_setting('server_version_num')::int AS version`
    expect(identity[0].database).toBe('neondb');expect(Math.floor(identity[0].version/10000)).toBe(17)
  })
  afterAll(async()=>{await db?.$disconnect()})
  it('imports the new version twice while preserving every existing question, course, attempt, answer and certificate', async()=>{
    const oldQuestions=await db.learningQuestion.findMany({include:{options:{orderBy:{position:'asc'}}},orderBy:{id:'asc'}})
    const oldVersions=await db.learningCourseVersion.findMany({include:{chapters:{orderBy:{position:'asc'},include:{contentBlocks:{orderBy:{position:'asc'}}}}},orderBy:{id:'asc'}})
    const oldExams=await db.learningExamVersion.findMany({include:{questions:{orderBy:{position:'asc'}}},orderBy:{id:'asc'}})
    const attempts=await db.learningExamAttempt.findMany({include:{answers:{orderBy:{questionId:'asc'}}},orderBy:{id:'asc'}})
    const certificates=await db.learningCertificate.findMany({orderBy:{id:'asc'}})
    const enrollments=await db.learningEnrollment.count(), outbox=await db.notificationOutbox.count()
    const authAccounts=await db.account.count(),sessions=await db.session.count()
    const a=await importAcademyBundle(db,revised,{execute:true,operatorReference:'wl002-remediation-v1'})
    const b=await importAcademyBundle(db,revised,{execute:true,operatorReference:'wl002-remediation-v1-replay'})
    if (a.mode === 'DRY_RUN' || b.mode === 'DRY_RUN') throw new Error('Runtime verification requires an executed isolated import')
    expect(b).toMatchObject({idempotent:true,courseVersionId:a.courseVersionId})
    expect(a.bundleHash).toBe(b.bundleHash)
    expect(await db.learningQuestion.findMany({where:{id:{in:oldQuestions.map((entry)=>entry.id)}},include:{options:{orderBy:{position:'asc'}}},orderBy:{id:'asc'}})).toEqual(oldQuestions)
    expect(await db.learningCourseVersion.findMany({where:{id:{in:oldVersions.map((entry)=>entry.id)}},include:{chapters:{orderBy:{position:'asc'},include:{contentBlocks:{orderBy:{position:'asc'}}}}},orderBy:{id:'asc'}})).toEqual(oldVersions)
    expect(await db.learningExamVersion.findMany({where:{id:{in:oldExams.map((entry)=>entry.id)}},include:{questions:{orderBy:{position:'asc'}}},orderBy:{id:'asc'}})).toEqual(oldExams)
    expect(await db.learningExamAttempt.findMany({include:{answers:{orderBy:{questionId:'asc'}}},orderBy:{id:'asc'}})).toEqual(attempts)
    expect(await db.learningCertificate.findMany({orderBy:{id:'asc'}})).toEqual(certificates)
    expect(await db.learningEnrollment.count()).toBe(enrollments);expect(await db.notificationOutbox.count()).toBe(outbox)
    expect(await db.account.count()).toBe(authAccounts);expect(await db.session.count()).toBe(sessions)
    const version=await db.learningCourseVersion.findFirstOrThrow({where:{version:revised.courseVersion},include:{chapters:{include:{contentBlocks:true}},examVersions:{include:{questions:{include:{question:true}}}}}})
    expect(version.status).toBe('DRAFT');expect(version.chapters).toHaveLength(10)
    expect(version.chapters.reduce((sum,chapter)=>sum+chapter.contentBlocks.length,0)).toBe(320)
    expect(version.examVersions[0]).toMatchObject({status:'DRAFT',questionCount:50,passingScore:40,passingPercentage:80})
    expect(version.examVersions[0].questions.every((mapping)=>mapping.question.version===3&&mapping.question.status==='DRAFT')).toBe(true)
    expect(await db.learningQuestion.count({where:{code:{startsWith:'WL002-'},version:3,status:'DRAFT'}})).toBe(240)
    expect(await db.learningRetentionQuestion.count({where:{bankVersion:revised.definition.retention.bankVersion,status:'DRAFT'}})).toBe(100)
    expect(await db.learningAcademyImport.count({where:{courseVersionId:version.id}})).toBe(1)
    expect(await db.learningCourseVersion.count({where:{version:original.courseVersion}})).toBe(1)
  },180_000)
})
