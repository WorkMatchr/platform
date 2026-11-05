// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it, afterEach, vi } from 'vitest'
import { validateAcademyBundle } from './academy-content-standard'
import { planAcademyImport } from './academy-import-service'
import { assertAcademyDatabaseTarget } from './academy-database-policy'
import { verifyLocalImportMigrations } from './academy-import-preflight'
import migrations from './academy-import-migrations.json'
import type { PrismaClient } from '@/generated/prisma/client'
const load = (name:string) => JSON.parse(readFileSync(`content/academy/${name}_DRAFT.json`,'utf8'))
const names=['WL-001_COURSE_1.0','WL-001_COURSE_1.1','WL-002_COURSE_1.3','WL-003_COURSE_1.1']
afterEach(()=>vi.unstubAllEnvs())
describe('lossless existing Academy bundles',()=>{
 it.each(names)('%s retains every field in validate/export/import',name=>{
  const raw=load(name); const bundle=validateAcademyBundle(raw)
  expect(bundle).toEqual(raw)
  expect(validateAcademyBundle(JSON.parse(JSON.stringify(bundle)))).toEqual(raw)
  expect(planAcademyImport(raw).bundleHash).toBe(planAcademyImport(JSON.parse(JSON.stringify(bundle))).bundleHash)
  expect(bundle.chapters).toHaveLength(10);expect(bundle.examQuestions).toHaveLength(50);expect(bundle.retentionQuestions).toHaveLength(100)
 })
 it('retains original WL001 and limits the new exam changes to four explicit questions',()=>{
  const old=load(names[0]),next=load(names[1]);const changed=[]
  for(let i=0;i<50;i++){const a={...old.examQuestions[i],version:0};const b={...next.examQuestions[i],version:0};if(JSON.stringify(a)!==JSON.stringify(b))changed.push(i+1)}
  expect(changed).toEqual([8,14,19,40]);expect(next.definition.exam).toEqual(old.definition.exam)
  expect(next.chapters.map((c:{blocks:unknown})=>c.blocks)).toEqual(old.chapters.map((c:{blocks:unknown})=>c.blocks))
 })
 it('explicitly assesses all 104 objectives and never substitutes technical coverage for human approval',()=>{
  const matrix=JSON.parse(readFileSync('docs/academy-content/WL-001-integration-coverage.json','utf8'))
  expect(matrix.objectives).toHaveLength(104);expect(new Set(matrix.objectives.map((x:{objectiveCode:string})=>x.objectiveCode)).size).toBe(104)
  expect(matrix.assessmentCounts).toEqual({DIRECT:61,DIRECT_PROPOSED:6,NOT_EXPLICIT:13,PARTIAL:24})
  const codes=new Set(load(names[1]).examQuestions.map((q:{code:string})=>q.code))
  for(const row of matrix.objectives){expect(row.humanApproval).toBe('OPEN');expect(row.reviewer).toBeNull();expect(row.evidence.length).toBeGreaterThan(30);expect(row.questionCodes.every((c:string)=>codes.has(c))).toBe(true)}
  expect(matrix.selection.questionCount).toBe(50)
 })
 it.each(['duplicate','answer','source','image','video'])('rejects malformed %s before persistence',type=>{
  const b=load(names[1]);if(type==='duplicate')b.examQuestions[1].code=b.examQuestions[0].code
  if(type==='answer')b.examQuestions[0].correctAnswer=['missing']
  if(type==='source')b.examQuestions[0].sourceIds=['missing']
  if(type==='image')b.chapters[0].blocks.push({code:'BAD-IMAGE',type:'IMAGE',data:{src:'https://unapproved.example.invalid/image.webp',alt:'test'}})
  if(type==='video')b.chapters[0].blocks[0].type='VIDEO'
  expect(()=>validateAcademyBundle(b)).toThrow()
 })
})
describe('PG18 local target and exact chain',()=>{
 const input={databaseUrl:'postgresql://academy_content_editor:synthetic@127.0.0.1:5449/workmatchr_lms20_synthetic',projectId:'local-synthetic',branchId:'lms20-isolated',nodeEnv:'test'}
 function isolated(){vi.stubEnv('ACADEMY_LOCAL_ACCEPTANCE','true');for(const key of ['VERCEL','RESEND_API_KEY','MOLLIE_API_KEY','JORTT_CLIENT_SECRET','CRON_SECRET','FINANCIAL_MAINTENANCE_SECRET'])vi.stubEnv(key,'')}
 it('accepts only the pinned synthetic tuple',()=>{isolated();expect(assertAcademyDatabaseTarget(input).database).toBe('workmatchr_lms20_synthetic')})
 it.each(['production','host','query','port','role','database','credential'])('refuses altered %s',kind=>{
  isolated();const bad={...input};if(kind==='production')bad.nodeEnv='production';if(kind==='host')bad.databaseUrl=bad.databaseUrl.replace('127.0.0.1','unapproved.example.invalid');if(kind==='query')bad.databaseUrl+='?host=unapproved.example.invalid';if(kind==='port')bad.databaseUrl=bad.databaseUrl.replace('5449','5432');if(kind==='role')bad.databaseUrl=bad.databaseUrl.replace('academy_content_editor','other');if(kind==='database')bad.databaseUrl=bad.databaseUrl.replace('workmatchr_lms20_synthetic','existing');if(kind==='credential')vi.stubEnv('RESEND_API_KEY','synthetic-forbidden');expect(()=>assertAcademyDatabaseTarget(bad)).toThrow()
 })
 it('requires the complete successful checksum-identical chain',async()=>{
  const rows=migrations.map(m=>({migration_name:m.name,checksum:m.checksums[0],finished_at:new Date(),rolled_back_at:null}))
  const db={$queryRaw:vi.fn().mockResolvedValue(rows)} as unknown as PrismaClient
  await expect(verifyLocalImportMigrations(db)).resolves.toBeUndefined()
  rows[0].checksum='incorrect';await expect(verifyLocalImportMigrations(db)).rejects.toThrow('MIGRATION_MISMATCH')
 })
})
