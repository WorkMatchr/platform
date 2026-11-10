import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { PlatformAdminAccessError } from '@/lib/platform-admin/platform-admin-authorization'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
import { syntheticCourse } from './academy-authoring-fixture'
import { authoringMetadata, prepareBundleRevision, readAuthoringVersion, saveAuthoringCourse, transitionAuthoringCourse } from './academy-authoring-service'
import { buildLearningCertificatePdf } from './learning-certificate-pdf'
import { getFinalExamOverview, startFinalExamAttempt } from './learning-final-exam-service'
import { getPublishedLearningCourse } from './learning-query-service'
import { recordPilotObservation } from '@/app/e-learnings/pilot/time'
import { currentAcademyAccess } from './academy-access-policy'
import { assignPilot, redeemPilot } from './academy-pilot-service'
import { startPaidPilot } from './academy-paid-checkout'
import { processMolliePayment } from '@/lib/finance/financial-purchase-service'
import { syncFinancialInvoiceToJortt } from '@/lib/finance/jortt-sync-service'
import { reconcileJorttPayment } from '@/lib/finance/jortt-payment-service'
import type { MollieGateway, MolliePaymentSnapshot } from '@/lib/finance/mollie-gateway'
import { publicLearningCatalog } from '@/content/public-learning-catalog'
import { ensureCertificateForPassedExam, getMyLearningCertificate, getPublicLearningCertificate } from './learning-certificate-service'
import { verifyLocalImportMigrations, verifyLocalImportRole } from './academy-import-preflight'
import { bindCertificateDesign, saveCertificateDesign, transitionCertificateDesign } from './certificate-design-service'
import { standardCertificateDesign } from './certificate-design-contract'
import { validateAcademyBundle } from './academy-content-standard'

const state = vi.hoisted(() => ({ actor: '' }))
vi.mock('@/lib/learning/learning-authorization',()=>({requireLearningUser:async()=>({id:state.actor})}))
vi.mock('@/lib/finance/financial-invoice-delivery-service',()=>({deliverFinancialInvoiceEmail:vi.fn(),recordFinancialInvoiceEmailFailure:vi.fn()}))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/authorization', () => ({ getCurrentUser: async () => ({ id: state.actor }) }))
vi.mock('@/lib/prisma', () => ({ getPrisma: () => db }))
let db: PrismaClient
let owner: string
let member: string
let outsider: string
const enabled = process.env.ACADEMY_RELEASE03_LOCAL_TEST === '1'
const assignedPilot = process.env.ACADEMY_TEST_ASSIGNED_PILOT === '1'
const bundles = assignedPilot ? ['release-07/WL-001_COURSE_1.2-r07_DRAFT','release-07/WL-002_COURSE_1.3-r07_DRAFT','release-07/WL-003_COURSE_1.1-r07_DRAFT'] : ['WL-001_COURSE_1.2_DRAFT', 'WL-002_COURSE_1.3_DRAFT', 'WL-003_COURSE_1.1_DRAFT']
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
      await expect(saveAuthoringCourse(syntheticCourse)).rejects.toBeInstanceOf(PlatformAdminAccessError)
      await expect(saveCertificateDesign({ name: 'Onbevoegd', revision: 0, definition: standardCertificateDesign })).rejects.toBeInstanceOf(PlatformAdminAccessError)
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
  it.skipIf(process.env.ACADEMY_STUDENT_PILOT_ENABLED !== 'true')('publiceert de drie pilotversies pas na afronding; bewaart inschrijving, resultaten en historisch PDF', async () => {
    state.actor = owner
    const historical = await db.learningCertificate.findFirstOrThrow()
    const oldPdf = await buildLearningCertificatePdf(historical)
    const oldEnrollment = await db.learningEnrollment.findUniqueOrThrow({where:{id:historical.enrollmentId},include:{progress:{orderBy:{id:'asc'}},examAttempts:{orderBy:{id:'asc'}}}})
    const template = await db.learningCertificateDesignBinding.findUniqueOrThrow({where:{scope:historical.courseId}})
    for (const file of bundles) {
      const bundle = validateAcademyBundle(JSON.parse(await readFile('content/academy/'+file+'.json','utf8')))
      const v = await db.learningCourseVersion.findFirstOrThrow({where:{version:bundle.courseVersion,course:{code:bundle.definition.courseCode}}})
      await transitionAuthoringCourse(v.id,1,'REVIEW','Controle in de geïsoleerde studentpilot')
      await transitionAuthoringCourse(v.id,2,'APPROVED','Uitsluitend technische beoordeling met synthetische cursisten')
      if (bundle.definition.courseCode === 'WL-001') {
        const active = await db.learningEnrollment.create({data:{userId:outsider,courseVersionId:oldEnrollment.courseVersionId,status:'IN_PROGRESS',startedAt:new Date()}})
        await expect(transitionAuthoringCourse(v.id,3,'PUBLISHED','Controle op lopende oude inschrijving')).rejects.toThrow('ACTIVE_ENROLLMENTS_REQUIRE_VERSION_PLAN')
        await db.learningEnrollment.delete({where:{id:active.id}})
      }
      await bindCertificateDesign(v.courseId,template.designId)
      await transitionAuthoringCourse(v.id,3,'PUBLISHED','Alleen in de geïsoleerde technische studentpilot')
      expect(await getFinalExamOverview(oldEnrollment.userId, bundle.definition.slug, v.id)).toBeNull()
      await expect(startFinalExamAttempt(oldEnrollment.userId, bundle.definition.slug, v.id)).rejects.toThrow('ENROLLMENT_REQUIRED')
      expect(await getMyLearningCertificate(oldEnrollment.userId, bundle.definition.courseCode, v.id)).toBeNull()
      expect(await db.learningExamVersion.count({where:{courseVersionId:v.id,status:'PUBLISHED'}})).toBe(1)
    }
    expect(await db.learningEnrollment.findUniqueOrThrow({where:{id:historical.enrollmentId},include:{progress:{orderBy:{id:'asc'}},examAttempts:{orderBy:{id:'asc'}}}})).toEqual(oldEnrollment)
    expect(await db.learningCertificate.findUniqueOrThrow({where:{id:historical.id}})).toEqual(historical)
    const overview = await getFinalExamOverview(oldEnrollment.userId, 'rie-in-de-praktijk', oldEnrollment.courseVersionId)
    expect(overview?.examVersion.status).toBe('RETIRED')
    expect(overview?.attempts.map(a=>a.id)).toEqual(expect.arrayContaining(oldEnrollment.examAttempts.map(a=>a.id)))
    expect(await getMyLearningCertificate(oldEnrollment.userId, 'WL-001', oldEnrollment.courseVersionId)).toMatchObject({id:historical.id})
    expect(await getPublicLearningCertificate(historical.certificateNumber)).toMatchObject({status:'ACTIVE',courseTitle:historical.courseTitle})
    expect(await buildLearningCertificatePdf(historical)).toEqual(oldPdf)
  },180000)

  it.skipIf(!assignedPilot)('bindt kosteloze inschrijving aan persoon, versie, vervaldatum en één gelijktijdig gebruik', async () => {
    const user=await db.user.create({data:{email:randomUUID()+'@example.invalid',emailVerified:true,status:'ACTIVE'}})
    const versions=await db.learningCourseVersion.findMany({where:{status:'PUBLISHED',version:{endsWith:'-r07'}},orderBy:{version:'asc'}})
    expect(versions).toHaveLength(3)
    const [one,two,three]=versions
    const input={email:user.email,versions:[one.id,two.id],maximumUses:1,validUntil:new Date(Date.now()+86400000)}
    await expect(assignPilot(member,input)).rejects.toThrow()
    const before=await db.financialPurchase.count()
    const code=await assignPilot(owner,input)
    expect(await redeemPilot(outsider,one.id,code)).toBe(false)
    expect(await redeemPilot(user.id,three.id,code)).toBe(false)
    const results=await Promise.all([one,two].map(v=>redeemPilot(user.id,v.id,code)))
    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await redeemPilot(user.id,(results[0]?one:two).id,code)).toBe(true)
    expect(await db.learningEnrollment.count({where:{userId:user.id}})).toBe(1)
    expect(await db.financialPurchase.count()).toBe(before)
    const chosen=results[0]?one:two
    const enrollment=await db.learningEnrollment.findFirstOrThrow({where:{userId:user.id,courseVersionId:chosen.id}})
    await db.learningEnrollment.update({where:{id:enrollment.id},data:{status:'IN_PROGRESS',startedAt:new Date()}})
    const chapter=await db.learningChapter.findFirstOrThrow({where:{courseVersionId:chosen.id},orderBy:{position:'asc'},include:{contentBlocks:true}})
    const reading=chapter.contentBlocks.find(b=>!b.questionId)!
    const exercise=chapter.contentBlocks.find(b=>b.questionId)!
    const event={enrollment:enrollment.id,clock:randomUUID(),target:reading.id,exam:false,pause:false}
    vi.useFakeTimers({toFake:['Date']})
    const start=Date.now()
    try {
      state.actor=outsider
      await recordPilotObservation(event)
      expect(await db.learningPilotAssignment.count({where:{enrollmentId:enrollment.id,lastPulseAt:{not:null}}})).toBe(0)
      state.actor=user.id
      await recordPilotObservation(event)
      vi.setSystemTime(start+10000);await recordPilotObservation(event)
      vi.setSystemTime(start+11000);await recordPilotObservation({...event,pause:true})
      vi.setSystemTime(start+71000);await recordPilotObservation({...event,target:exercise.id})
      vi.setSystemTime(start+76000);await recordPilotObservation({...event,target:exercise.id})
      vi.setSystemTime(start+150000);await recordPilotObservation({...event,target:exercise.id})
      const measured=await db.learningPilotAssignment.findFirstOrThrow({where:{enrollmentId:enrollment.id},include:{durations:true}})
      expect(measured.gaps).toBe(1)
      expect(measured.pauses).toBe(1)
      const sum=(prefix:string)=>measured.durations.filter(d=>d.context.startsWith(prefix)).reduce((s,d)=>s+d.activeMs,0)
      expect(sum('les:')).toBe(10000);expect(sum('oefening:')).toBe(5000)
      expect(sum('pauze:')).toBe(60000);expect(sum('onbekend:')).toBe(74000)
    } finally {vi.useRealTimers();state.actor=owner}
    vi.stubEnv('ACADEMY_STUDENT_PILOT_ENABLED','false')
    try {
      expect(await db.learningEnrollment.count({where:{id:enrollment.id,...currentAcademyAccess()}})).toBe(0)
      const identity=await db.learningCourse.findUniqueOrThrow({where:{id:chosen.courseId}})
      expect(await getPublishedLearningCourse(identity.slug,user.id)).toBeNull()
    } finally {vi.unstubAllEnvs()}
    await db.learningEnrollment.update({where:{id:enrollment.id},data:{accessRevokedAt:new Date()}})
    expect(await redeemPilot(user.id,chosen.id,code)).toBe(false)
    const unused=await assignPilot(owner,{...input,versions:[three.id]})
    await db.discountCode.update({where:{code:unused},data:{validFrom:new Date(Date.now()-7200000),validUntil:new Date(Date.now()-3600000)}})
    expect(await redeemPilot(user.id,three.id,unused)).toBe(false)
  })

  it.skipIf(!assignedPilot)('wijst bij twee gelijktijdige aanvragen voor de laatste plaats maximaal twaalf cursisten aan', async () => {
    const version = await db.learningCourseVersion.findFirstOrThrow({
      where: { status: 'PUBLISHED', version: '1.2-r07' },
    })
    const where = { courseVersionId: version.id }
    const occupied = await db.learningPilotAssignment.count({ where })
    const candidates: { id: string; email: string }[] = []
    const grant = (email: string) => assignPilot(owner, {
      email, versions: [version.id], maximumUses: 1, validUntil: new Date(Date.now() + 86400000),
    })
    try {
      for (let i = occupied; i <= 12; i++) {
        const user = await db.user.create({
          data: { email: randomUUID() + '@example.invalid', emailVerified: true, status: 'ACTIVE' },
        })
        candidates.push(user)
        if (i < 11) await grant(user.email)
      }
      const lastSeat = await Promise.allSettled(candidates.slice(-2).map(user => grant(user.email)))
      expect(lastSeat.filter(result => result.status === 'fulfilled')).toHaveLength(1)
      const rejected = lastSeat.find(result => result.status === 'rejected')
      expect(rejected?.reason.message).toBe('PILOT_FULL')
      expect(await db.learningPilotAssignment.count({ where })).toBe(12)
    } finally {
      const own = { ...where, userId: { in: candidates.map(user => user.id) } }
      const grants = await db.learningPilotAssignment.findMany({ where: own })
      await db.learningPilotAssignment.deleteMany({ where: own })
      await db.discountCode.deleteMany({ where: { id: { in: grants.map(grant => grant.discountCodeId) } } })
      await db.user.deleteMany({ where: { id: { in: own.userId.in } } })
    }
  })

  it.skipIf(process.env.ACADEMY_PAID_DB_PROBE !== '1')('verwerkt drie persoonlijke betaalplaatsen, KOR-overgang, factuur, Jortt en terugboeking', async()=>{
    const version = await db.learningCourseVersion.findFirstOrThrow({where:{version:'1.2-r07',status:'PUBLISHED'}})
    const financialBefore = async()=>[await db.creditTransaction.count(),await db.professionalSubscription.count(),await db.professionalSubscriptionPayment.count()]
    const before=await financialBefore()
    const users=await Promise.all(Array.from({length:4},()=>db.user.create({data:{email:randomUUID()+'@example.invalid',emailVerified:true,status:'ACTIVE'}})))
    const grant=(email:string)=>assignPilot(owner,{email,paid:true,versions:[version.id],maximumUses:1,validUntil:new Date(Date.now()+86400000)})
    const first=await grant(users[0].email)
    await grant(users[1].email)
    const last=await Promise.allSettled(users.slice(2).map(u=>grant(u.email)))
    expect(last.filter(r=>r.status==='fulfilled')).toHaveLength(1)
    const request={versionId:version.id,code:first,organizationId:null,confirmed:true,billing:{organizationName:'Synthetische koper',addressLine:'Teststraat 1',postalCode:'1000 AA',city:'Teststad',countryCode:'NL'}}
    let snapshot:MolliePaymentSnapshot
    const fake={createPayment:vi.fn(async(input:Parameters<MollieGateway['createPayment']>[0])=>(snapshot={id:'tr_syntheticAcademy',status:'open',amountValue:input.amountValue,currency:input.currency,metadata:input.metadata,paidAt:null,createdAt:new Date().toISOString(),checkoutUrl:'http://127.0.0.1/checkout',subscriptionId:null,mandateId:null,method:null})),getPayment:async()=>snapshot}
    await expect(startPaidPilot(users[1].id,request,fake)).rejects.toThrow()
    await expect(startPaidPilot(users[0].id,{...request,organizationId:randomUUID()},fake)).rejects.toThrow()
    const checkout=await startPaidPilot(users[0].id,request,fake)
    expect(await startPaidPilot(users[0].id,request,fake)).toBe(checkout)
    expect(fake.createPayment).toHaveBeenCalledTimes(1)
    snapshot={...snapshot!,status:'failed'}
    const webhook=()=>processMolliePayment(snapshot.id,fake as unknown as MollieGateway)
    await webhook()
    snapshot={...snapshot,status:'expired'}
    await webhook()
    expect(await db.learningEnrollment.count({where:{userId:users[0].id}})).toBe(0)
    expect(await db.financialInvoice.count({where:{purchaseId:snapshot.metadata.purchaseId}})).toBe(0)
    const org=await db.organization.findFirstOrThrow({where:{organizationType:'CLIENT',systemKey:null}})
    await db.organizationMembership.create({data:{organizationId:org.id,userId:users[1].id,role:'OWNER',status:'ACTIVE'}})
    const second=await db.learningPilotAssignment.findFirstOrThrow({where:{userId:users[1].id},include:{discountCode:true}})
    const date = new Date().toISOString().slice(0,10)
    const gateway={...fake,createPayment:async(input:Parameters<MollieGateway['createPayment']>[0])=>({...await fake.createPayment(input),id:'tr_paidOrg'})}
    await startPaidPilot(users[1].id,{...request,code:second.discountCode.code,organizationId:org.id},gateway)
    snapshot={...snapshot!,id:'tr_paidOrg',status:'paid',paidAt:new Date().toISOString()}
    const id=snapshot.metadata.purchaseId!
    // Prove a delayed callback uses the confirmed payment date, independent of checkout.
    vi.stubEnv('ACADEMY_CONFIRMED_KOR_END_DATE',date)
    vi.stubEnv('ACADEMY_KOR_END_DECISION_REF','synthetic-confirmation')
    try {
      await webhook(); await webhook()
      const invoice=await db.financialInvoice.findUniqueOrThrow({where:{purchaseId:id}})
      expect(invoice).toMatchObject({organizationId:org.id,customerOrganizationName:org.name,academyTaxTreatment:'NL_STANDARD',amountInclVatCents:149,vatAmountCents:26})
      expect(await db.learningEnrollment.count({where:{userId:users[1].id}})).toBe(1)
      const remoteId=randomUUID(),account=randomUUID()
      await syncFinancialInvoiceToJortt(invoice.id,{submitInvoice:async payload=>{
        expect(payload.amountInclVatCents).toBe(149);expect(payload.vatRateBps).toBe(2100)
        return {externalReference:remoteId,remoteInvoiceNumber:'SYN-001'}
      }})
      const settled=await reconcileJorttPayment({actorUserId:owner,invoiceId:invoice.id,ledgerAccountId:account,bookDate:date,reason:'Synthetische boekingscontrole'},
        {inspectPayment:async()=>({id:remoteId,reference:invoice.invoiceNumber,totalCents:149,dueCents:0,currency:'EUR',allowedLedgerAccounts:[account],bookings:[{id:randomUUID(),description:'workmatchr-payment:'+invoice.id,amountCents:149,ledgerAccountId:account,bookDate:date}]}),registerPayment:async()=>{throw Error('ALREADY_BOOKED')}})
      expect(settled.status).toBe('CONFIRMED')
      snapshot={...snapshot,amountRefunded:{value:'1.49',currency:'EUR'}}
      await webhook()
      expect(await db.learningEnrollment.count({where:{userId:users[1].id,...currentAcademyAccess()}})).toBe(0)
      expect(await financialBefore()).toEqual(before)
      const granted=await db.learningPilotAssignment.findUniqueOrThrow({where:{id:second.id}})
      expect(granted.enrollmentId).not.toBeNull()
    } finally {vi.unstubAllEnvs()}
  })

  it('houdt de negen roadmapcursussen gesloten bij rechtstreeks opvragen van cursus, toets en certificaat', async () => {
    const courses = publicLearningCatalog.filter(course => /^WL-(00[4-9]|01[0-2])$/.test(course.code))
    expect(courses).toHaveLength(9)
    const student = await db.learningEnrollment.findFirstOrThrow({select:{userId:true}})
    for (const {code,slug} of courses) {
      expect(await getPublishedLearningCourse(slug,student.userId)).toBeNull()
      expect(await getFinalExamOverview(student.userId,slug)).toBeNull()
      expect(await ensureCertificateForPassedExam(student.userId,code)).toEqual({certificate:null,needsName:false})
    }
    const reservedCodes = courses.map(course=>course.code)
    expect(await db.learningEnrollment.count({where:{courseVersion:{course:{code:{in:reservedCodes}}}}})).toBe(0)
    expect(await db.learningCertificate.count({where:{course:{code:{in:reservedCodes}}}})).toBe(0)
  })

})
