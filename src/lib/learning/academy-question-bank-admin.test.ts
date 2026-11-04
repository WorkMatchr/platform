import { beforeEach as enableRuntimeBeforeEach } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseAdminFilter } from './academy-question-bank-admin-model'

const mocks = vi.hoisted(() => ({ current: vi.fn(), user: vi.fn(), course: vi.fn(), courses: vi.fn(), retention: vi.fn() }))
vi.mock('@/lib/authorization', () => ({ getCurrentUser: mocks.current }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => ({ user: { findFirst: mocks.user }, learningCourse: { findUnique: mocks.course, findMany: mocks.courses }, learningRetentionQuestion: { findMany: mocks.retention } }) }))
import { AcademyAdminReadError, listAcademyAdminCourses, readAcademyAdminQuestions } from './academy-question-bank-admin-service'
import { GET } from '@/app/platformbeheer/academy/vragen/export/route'

const question = (version = 1) => ({ code: 'WL001-EX-E17', version, type: 'MULTI_CHOICE', questionText: 'Historische vraagtekst', explanation: 'Canonieke toelichting', status: 'PUBLISHED_PROTOTYPE', knowledgeArea: 'Beoordelen', correctAnswer: version === 1 ? ['A', 'C'] : ['B'], options: ['A', 'B', 'C', 'D'].map((value) => ({ value, text: `Optie ${value}`, isCorrect: (version === 1 ? ['A', 'C'] : ['B']).includes(value) })) })
function course(code = 'WL-001') {
  return { code, title: 'RI&E in de praktijk', slug: 'rie-in-de-praktijk', retentionPrograms: [], versions: [{ version: 'prototype-0.17', status: 'PUBLISHED', sourceMetadata: null,
    chapters: [{ position: 1, contentBlocks: [{ data: { title: 'Oefenen' }, question: question() }, { data: { title: 'Hoofdstukcheck' }, question: null }, { data: {}, question: { ...question(), code: 'CHECK' } }] }],
    examVersions: [1, 2].map((version) => ({ version: `WL-001-EXAM-1.${version - 1}`, status: version === 1 ? 'RETIRED' : 'PUBLISHED', questions: [{ chapterNumber: 4, cognitiveLevel: 'A', code: 'E17', question: question(version) }] })),
  }] }
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.current.mockResolvedValue({ id: 'actor' }); mocks.user.mockResolvedValue({ id: 'actor', memberships: [{ role: 'OWNER', organization: { id: 'platform', systemKey: 'WORKMATCHR_PLATFORM' } }], providerPermissionSubjects: [] })
  mocks.course.mockResolvedValue(course()); mocks.courses.mockResolvedValue([{ code: 'WL-001', title: 'RI&E in de praktijk' }]); mocks.retention.mockResolvedValue([])
})

describe('Academy read-only beheer en autorisatie', () => {
  it.each(['OWNER', 'ADMIN'])('staat actieve platform-%s toe en controleert de volledige databaseguard', async (role) => {
    mocks.user.mockResolvedValue({ id: 'actor', memberships: [{ role, organization: { id: 'platform', systemKey: 'WORKMATCHR_PLATFORM' } }], providerPermissionSubjects: [] })
    expect((await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-001' }))).total).toBe(2)
    expect(mocks.user).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'actor', status: 'ACTIVE', platformRole: 'ADMIN', memberships: { some: { status: 'ACTIVE', organization: { status: 'ACTIVE', organizationType: 'PLATFORM_OPERATOR', systemKey: 'WORKMATCHR_PLATFORM' } } } }) }))
  })
  it.each(['MEMBER', 'STUDENT', 'CLIENT', 'PROFESSIONAL', 'TENANT_ADMIN', 'INACTIVE'])('weigert %s vóór vraagdata wordt gelezen', async (role) => {
    mocks.user.mockResolvedValue(role === 'MEMBER' ? { memberships: [{ role, organization: { systemKey: 'WORKMATCHR_PLATFORM' } }], providerPermissionSubjects: [] } : null)
    await expect(readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-001' }))).rejects.toMatchObject({ status: 403 })
    await expect(listAcademyAdminCourses()).rejects.toBeInstanceOf(AcademyAdminReadError)
    expect(mocks.course).not.toHaveBeenCalled(); expect(mocks.courses).not.toHaveBeenCalled()
    const response = await GET(new Request('http://localhost/platformbeheer/academy/vragen/export?course=WL-001'))
    expect(response.status).toBe(403); expect(await response.text()).not.toContain('Historische vraagtekst')
  })
  it('weigert anoniem ook directe exports zonder gegevens te lezen', async () => {
    mocks.current.mockResolvedValue(null)
    const response = await GET(new Request('http://localhost/platformbeheer/academy/vragen/export?course=WL-001'))
    expect(response.status).toBe(401); expect(mocks.user).not.toHaveBeenCalled(); expect(mocks.course).not.toHaveBeenCalled()
  })
  it('behoudt historische antwoordsleutels en de expliciete examen/vraagversie', async () => {
    const data = await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-001', version: 'WL-001-EXAM-1.0', q: 'E17' }))
    expect(data.rows).toHaveLength(1); expect(data.rows[0]).toMatchObject({ questionVersion: 1, correctAnswer: ['A', 'C'], referenceStatus: 'RETIRED' })
    expect(data.rows[0].options.filter((option) => option.isCorrect).map((option) => option.value)).toEqual(['A', 'C'])
    expect((await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-001', questionVersion: '2' }))).rows[0].correctAnswer).toEqual(['B'])
  })
  it('scheidt formatieve oefeningen en hoofdstukchecks op de opgeslagen blokvolgorde', async () => {
    expect((await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-001', bank: 'FORMATIVE' }))).rows.map((row) => row.code)).toEqual(['WL001-EX-E17'])
    expect((await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-001', bank: 'CHAPTER_CHECK' }))).rows.map((row) => row.code)).toEqual(['CHECK'])
  })
  it('keeps separate WL-002 draft question versions without overwriting either key', async () => {
    const draft = course('WL-002')
    draft.title = 'Preventiemedewerker in de praktijk'; draft.slug = 'preventiemedewerker-in-de-praktijk'
    for (const version of draft.versions) {
      version.status = 'DRAFT'
      for (const exam of version.examVersions) {
        exam.version = exam.version.replace('WL-001', 'WL-002'); exam.status = 'DRAFT'
        for (const mapping of exam.questions) mapping.question.code = mapping.question.code.replace('WL001', 'WL002')
      }
    }
    const snapshot = JSON.stringify(draft); mocks.course.mockResolvedValue(draft)
    const old = await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-002', questionVersion: '1' }))
    const latest = await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-002', questionVersion: '2' }))
    expect(old.rows[0]).toMatchObject({ code: 'WL002-EX-E17', referenceStatus: 'DRAFT', correctAnswer: ['A', 'C'] })
    expect(latest.rows[0].correctAnswer).toEqual(['B']); expect(JSON.stringify(draft)).toBe(snapshot)
  })
  it('begrensde filters en cursusisolatie weigeren vreemde gegevens', async () => {
    expect((await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-002' }))).total).toBe(0)
    expect(mocks.course).toHaveBeenLastCalledWith(expect.objectContaining({ where: { code: 'WL-002' } }))
    expect((await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-001', chapter: '9', type: 'SINGLE_CHOICE', status: 'DRAFT' }))).rows).toEqual([])
    expect(() => parseAdminFilter({ course: '../../', q: 'a'.repeat(161) })).toThrow()
  })
  it('behandelt onbekende cursus, vraag en databasefout zonder uitlekken', async () => {
    expect((await readAcademyAdminQuestions(parseAdminFilter({ course: 'WL-001', q: 'E999' }))).total).toBe(0)
    mocks.course.mockResolvedValue(null)
    expect((await GET(new Request('http://localhost/platformbeheer/academy/vragen/export?course=WL-999'))).status).toBe(404)
    mocks.course.mockRejectedValue(new Error('sensitive database details'))
    const response = await GET(new Request('http://localhost/platformbeheer/academy/vragen/export?course=WL-001'))
    expect(response.status).toBe(500); expect(await response.text()).toBe('Vraagbank niet beschikbaar.')
  })
  it('exporteert uitsluitend de geselecteerde bank met private headers en alle juiste opties', async () => {
    const response = await GET(new Request('http://localhost/platformbeheer/academy/vragen/export?course=WL-001&version=WL-001-EXAM-1.0'))
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('x-robots-tag')).toContain('noindex'); expect(response.headers.get('content-type')).toBe('application/pdf')
    const bytes = new Uint8Array(await response.arrayBuffer()); expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-')
  })
  it('heeft geen muterende endpoints, studentdataqueries of clientimport van geheime services', () => {
    const route = readFileSync('src/app/platformbeheer/academy/vragen/export/route.ts', 'utf8')
    const service = readFileSync('src/lib/learning/academy-question-bank-admin-service.ts', 'utf8')
    expect(route).not.toMatch(/export (?:async )?function (POST|PUT|PATCH|DELETE)/)
    expect(service).not.toMatch(/\.(create|update|delete|upsert|executeRaw|learningExamAttempt|learningExamAnswer)\b/)
    expect(service).toContain("import 'server-only'")
  })
})

enableRuntimeBeforeEach(()=>{vi.stubEnv('LEARNING_RUNTIME_ENABLED','true')})
