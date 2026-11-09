import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { syntheticCourse } from './academy-authoring-fixture'
import { authoringMetadata, prepareBundleRevision, readAuthoringVersion, saveAuthoringCourse, transitionAuthoringCourse } from './academy-authoring-service'
import { buildLearningCertificatePdf } from './learning-certificate-pdf'
import { getPublicLearningCertificate } from './learning-certificate-service'
import { verifyLocalImportMigrations, verifyLocalImportRole } from './academy-import-preflight'
import { bindCertificateDesign, saveCertificateDesign, transitionCertificateDesign } from './certificate-design-service'
import { standardCertificateDesign } from './certificate-design-contract'
import { validateAcademyBundle } from './academy-content-standard'

const state = vi.hoisted(() => ({ actor: '' }))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/authorization', () => ({ getCurrentUser: async () => ({ id: state.actor }) }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => db }))
let db: PrismaClient
let owner: string
let member: string
let outsider: string
const enabled = process.env.ACADEMY_RELEASE03_LOCAL_TEST === '1'
const bundles = ['WL-001_COURSE_1.2_DRAFT', 'WL-002_COURSE_1.3_DRAFT', 'WL-003_COURSE_1.1_DRAFT']
describe.skipIf(!enabled)('V3 Academy-upgrade met bestaande inschrijving en uitgifte', () => {
  beforeAll(async () => {
    const url = new URL(process.env.LEARNING_TEST_DATABASE_URL!)
    if (url.hostname !== '127.0.0.1' || url.username !== 'academy_content_editor' || !/^\/workmatchr_learning_\d+_\d+$/.test(url.pathname)) throw Error('Eigen lokale testdatabase vereist')
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.href }) })
    await verifyLocalImportMigrations(db)
    await verifyLocalImportRole(db)
    const org = await db.organization.create({ data: { name: 'Synthetisch platform', organizationType: 'PLATFORM_OPERATOR', status: 'ACTIVE', systemKey: 'WORKMATCHR_PLATFORM' } })
    const customer = await db.organization.create({ data: { name: 'Synthetische organisatie', organizationType: 'CLIENT', status: 'ACTIVE' } })
    const actors = []
    for (const [organizationId, role] of [[org.id, 'OWNER'], [org.id, 'MEMBER'], [customer.id, 'OWNER']] as const) {
      const user = await db.user.create({ data: { email: randomUUID() + '@example.invalid', status: 'ACTIVE', platformRole: 'ADMIN' } })
      await db.organizationMembership.create({ data: { userId: user.id, organizationId, role, status: 'ACTIVE' } })
      actors.push(user.id)
    }
    ;[owner, member, outsider] = actors
  })
  afterAll(async () => { await db?.$disconnect() })
  it('weigert schrijven door een auditor en beheerder van een andere organisatie', async () => {
    for (const actor of [member, outsider]) {
      state.actor = actor
      await expect(saveAuthoringCourse(syntheticCourse)).rejects.toThrow()
      await expect(saveCertificateDesign({ name: 'Onbevoegd', revision: 0, definition: standardCertificateDesign })).rejects.toThrow()
    }
  })
  it('importeert alle drie de ongewijzigde bundels naast de historische WL-001 en controleert herhaling en revisies', async () => {
    state.actor = owner
    const legacy = await db.learningCourseVersion.findFirstOrThrow({ where: { version: 'prototype-0.17' }, include: { course: true } })
    const historical = await db.learningCertificate.findFirstOrThrow()
    const originalPdf = await buildLearningCertificatePdf(historical)
    const verification = await getPublicLearningCertificate(historical.certificateNumber)
    for (const file of bundles) {
      const bundle = validateAcademyBundle(JSON.parse(await readFile('content/academy/' + file + '.json', 'utf8')))
      const saved = await saveAuthoringCourse(bundle)
      expect(await saveAuthoringCourse(bundle)).toEqual(saved)
      const stored = await readAuthoringVersion(saved.id)
      expect(authoringMetadata(stored.sourceMetadata).authoring.content).toEqual(bundle)
      expect(stored.status).toBe('DRAFT')
      expect(await db.learningAcademyImport.count({ where: { courseVersionId: saved.id } })).toBe(1)
      await expect(saveAuthoringCourse(bundle, saved.id, saved.revision + 7)).rejects.toThrow('STALE_OR_LOCKED_DRAFT')
      const next = await prepareBundleRevision(saved.id, bundle.courseVersion + 'x')
      const successor = await saveAuthoringCourse(next, saved.id, saved.revision)
      expect(successor.id).not.toBe(saved.id)
      await expect(transitionAuthoringCourse(successor.id, 1, 'PUBLISHED', 'Uitsluitend een synthetische controle')).rejects.toThrow('INVALID_TRANSITION')
      await transitionAuthoringCourse(successor.id, 1, 'REVIEW', 'Uitsluitend een synthetische review')
      {
        await transitionAuthoringCourse(successor.id, 2, 'APPROVED', 'Synthetische controle van de overgang')
        await expect(transitionAuthoringCourse(successor.id, 3, 'PUBLISHED', 'Controle van de historische studentroute')).rejects.toThrow(bundle.definition.courseCode === 'WL-001' ? 'HISTORICAL_STUDENT_ROUTE_ACTIVE' : 'STUDENT_EXAM_UNAVAILABLE')
      }
    }
    expect(await db.learningCourseVersion.findUniqueOrThrow({ where: { id: legacy.id }, include: { course: true } })).toEqual(legacy)
    expect(await db.learningCertificate.findUniqueOrThrow({ where: { id: historical.id } })).toEqual(historical)
    expect(await getPublicLearningCertificate(historical.certificateNumber)).toEqual(verification)
    expect(await buildLearningCertificatePdf(historical)).toEqual(originalPdf)
  }, 180000)
  it('bewaart één gelijktijdige conceptbewerking en bewaakt de bestaande publicatie', async () => {
    state.actor=owner
    const created=await saveAuthoringCourse({...syntheticCourse,code:'WL-991',slug:'test-concurrency'})
    const updated={...syntheticCourse,code:'WL-991',slug:'test-concurrency',description:'Gewijzigd controleconcept voor de lokale proeven.'}
    const changes=await Promise.allSettled([saveAuthoringCourse(updated,created.id,1),saveAuthoringCourse(updated,created.id,1)])
    expect(changes.filter(c=>c.status==='fulfilled')).toHaveLength(1)
    for (const [n,status] of [[2,'REVIEW'],[3,'APPROVED']] as const) await transitionAuthoringCourse(created.id,n,status,'Synthetische controle van versieovergangen')
    await expect(transitionAuthoringCourse(created.id,4,'PUBLISHED','Synthetische controle op studenttoegang')).rejects.toThrow('STUDENT_EXAM_UNAVAILABLE')
    const published = await db.learningCourseVersion.findFirstOrThrow({ where: { status: 'PUBLISHED', course: { code: 'WL-001' } } })
    await expect(saveAuthoringCourse({ ...syntheticCourse, code: 'WL-001' },published.id,1)).rejects.toThrow('NEW_VERSION_REQUIRED')
  })
  it('beheert een nieuwe sjabloonbinding zonder een historisch PDF te veranderen', async () => {
    state.actor=owner
    const cert=await db.learningCertificate.findFirstOrThrow()
    const before=await buildLearningCertificatePdf(cert)
    // The local production build has no private Blob binding. A text/QR template
    // exercises real issuing and downloading without credentials or a storage fallback.
    const definition = { ...standardCertificateDesign, elements: standardCertificateDesign.elements.filter(e => e.kind !== 'image') }
    const design=await saveCertificateDesign({name:'Synthetisch tekstontwerp',revision:0,definition})
    for(const [revision,status] of [[1,'REVIEW'],[2,'APPROVED'],[3,'ACTIVE']] as const) await transitionCertificateDesign(design.id,revision,status,'Synthetische controle van het cursusontwerp')
    await bindCertificateDesign(cert.courseId,design.id)
    expect(await buildLearningCertificatePdf(await db.learningCertificate.findUniqueOrThrow({where:{id:cert.id}}))).toEqual(before)
  })
})
