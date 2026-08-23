import { randomUUID, timingSafeEqual } from 'node:crypto'
import { runWithEndpointContext, type AuthEndpointContext } from '@better-auth/core/context'
import { NextResponse } from 'next/server'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { auth } from '@/lib/auth'
import { appendAccountProvisioningEvent, appendOrganizationMembershipEvent } from '@/lib/account-architecture/account-history-service'
import { getPrisma } from '@/lib/prisma'
import { getPlatformContext } from '@/lib/platform-admin/platform-admin-authorization'
import { analyzeKnowledgeSourceUpload, confirmKnowledgeSourceUpload } from '@/lib/knowledge/knowledge-source-upload-service'
import { getKnowledgeSourceUploadStorage } from '@/lib/knowledge/knowledge-source-upload-storage'

const expectedBranch = 'codex/knowledge-source-upload-v1'

function authorized(request: Request) {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.VERCEL_GIT_COMMIT_REF !== expectedBranch) return false
  const configured = process.env.KNOWLEDGE_UPLOAD_ACCEPTANCE_SECRET
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/u, '')
  if (!configured || !supplied) return false
  const left = Buffer.from(configured); const right = Buffer.from(supplied)
  return left.length === right.length && timingSafeEqual(left, right)
}

export async function POST(request: Request) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 })
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email.endsWith('@example.invalid') || password.length < 15) return NextResponse.json({ ok: false }, { status: 400 })
  const database = getPrisma()
  const platform = await database.organization.findUnique({ where: { systemKey: 'WORKMATCHR_PLATFORM' } })
  if (!platform || platform.status !== 'ACTIVE' || platform.organizationType !== 'PLATFORM_OPERATOR') return new NextResponse(null, { status: 404 })
  const existing = await database.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) return NextResponse.json({ ok: true, userId: existing.id, replay: true })
  const context = await auth.$context
  const passwordHash = await runWithEndpointContext(
    { context } as unknown as AuthEndpointContext,
    () => context.password.hash(password),
  )
  const userId = randomUUID(); const membershipId = randomUUID(); const correlationId = `preview-knowledge-upload:${userId}`
  await database.$transaction(async (transaction) => {
    await transaction.user.create({ data: {
      id: userId, email, displayName: 'Preview Knowledge Upload Beheerder', emailVerified: true,
      platformRole: 'ADMIN', status: 'ACTIVE',
      accounts: { create: { id: randomUUID(), accountId: userId, providerId: 'credential', password: passwordHash } },
    } })
    await transaction.organizationMembership.create({ data: { id: membershipId, userId, organizationId: platform.id, role: 'ADMIN', status: 'ACTIVE' } })
    await appendAccountProvisioningEvent(transaction, {
      eventType: 'ACCOUNT_CREATED', subjectUserId: userId, actorUserId: userId, organizationId: platform.id, membershipId,
      reasonCode: 'PREVIEW_KNOWLEDGE_UPLOAD_ACCEPTANCE', correlationId, idempotencyKey: `${correlationId}:account`, metadata: { environment: 'preview', fixture: true },
    })
    await appendOrganizationMembershipEvent(transaction, {
      eventType: 'MEMBERSHIP_CREATED', membershipId, userId, organizationId: platform.id, actorUserId: userId,
      previousRole: null, newRole: 'ADMIN', previousStatus: null, newStatus: 'ACTIVE',
      reasonCode: 'PREVIEW_KNOWLEDGE_UPLOAD_ACCEPTANCE', correlationId, idempotencyKey: `${correlationId}:membership`, metadata: { environment: 'preview', fixture: true },
    })
    await transaction.marketplaceAuditEvent.create({ data: {
      actorUserId: userId, actorRole: 'PLATFORM_ADMIN', organizationId: platform.id,
      action: 'PREVIEW_KNOWLEDGE_UPLOAD_FIXTURE_PROVISIONED', entityType: 'User', entityId: userId,
      correlationKey: `${correlationId}:audit`, metadata: { environment: 'preview', fixture: true },
    } })
  })
  return NextResponse.json({ ok: true, userId, replay: false })
}

export async function PUT(request: Request) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 })
  const body = await request.json().catch(() => null) as { email?: unknown; password?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!email.endsWith('@example.invalid') || password.length < 15) return NextResponse.json({ ok: false }, { status: 400 })
  let stage = 'AUTHENTICATION'
  try {
  const login = await auth.api.signInEmail({ body: { email, password } })
  const administrator = await getPlatformContext(login.user.id)
  const database = getPrisma(); const storage = getKnowledgeSourceUploadStorage()
  stage = 'BASELINE'
  const before = await Promise.all([
    database.knowledgeSource.count(), database.knowledgeSourceVersion.count(), database.knowledgeSourceArtifact.count(),
    database.knowledgeExtractionRun.count(), database.knowledgeSourcePage.count(), database.knowledgeSourceBlock.count(),
    database.knowledgeClaim.count(), database.knowledgeCitation.count(),
  ])
  const pdf = await PDFDocument.create(); const pdfPage = pdf.addPage([595, 842]); const font = await pdf.embedFont(StandardFonts.Helvetica)
  pdfPage.drawText('WorkMatchr Preview private bronacceptatie', { x: 60, y: 760, size: 18, font })
  pdfPage.drawText('Deze inhoud blijft REVIEW_REQUIRED en wordt niet automatisch gepubliceerd.', { x: 60, y: 720, size: 11, font })
  pdfPage.drawText('Unieke passage: private Blob checksum, menselijke metadatareview en audittrail.', { x: 60, y: 680, size: 11, font })
  const bytes = new Uint8Array(await pdf.save()); const sourceCode = `PREVIEW-BLOB-${Date.now()}`
  stage = 'ANALYZE_AND_STORE'
  const preview = await analyzeKnowledgeSourceUpload({ bytes, fileName: `${sourceCode}.pdf`, mediaType: 'application/pdf', storage, database })
  if (preview.duplicate || preview.status !== 'NEEDS_METADATA_REVIEW') throw new Error('PREVIEW_ANALYSIS_INVALID')
  stage = 'CONFIRM_AND_INGEST'
  const result = await confirmKnowledgeSourceUpload({
    preview,
    metadata: {
      sourceCode, title: 'WorkMatchr Preview private bronacceptatie', publisher: 'WorkMatchr Preview Test', versionLabel: 'preview-v1',
      canonicalFamily: 'GOVERNMENT_GUIDANCE', sourceType: 'PROFESSIONAL_GUIDANCE', authorityStatus: 'PROFESSIONAL_REFERENCE',
      temporalStatus: 'HISTORICAL', canonicalUrl: `https://example.invalid/knowledge-upload/${sourceCode.toLowerCase()}`,
      jurisdiction: 'NL', applicabilityScope: 'Uitsluitend geïsoleerde Preview-acceptatie.', scopeCode: 'PREVIEW_ACCEPTANCE',
      scopeEffect: 'APPLIES', topics: ['private storage', 'uploadacceptatie'],
    },
    explicitlyConfirmed: true, actorUserId: administrator.userId, storage, database,
  })
  stage = 'POST_CHECK'
  const version = await database.knowledgeSourceVersion.findUniqueOrThrow({ where: { id: result.sourceVersionId }, include: { artifacts: true, extractionRuns: true } })
  const original = await storage.read(preview.storageKey)
  const duplicate = await analyzeKnowledgeSourceUpload({ bytes, fileName: `${sourceCode}-duplicate.pdf`, mediaType: 'application/pdf', storage, database })
  const after = await Promise.all([
    database.knowledgeSource.count(), database.knowledgeSourceVersion.count(), database.knowledgeSourceArtifact.count(),
    database.knowledgeExtractionRun.count(), database.knowledgeSourcePage.count(), database.knowledgeSourceBlock.count(),
    database.knowledgeClaim.count(), database.knowledgeCitation.count(),
  ])
  const deltas = after.map((value, index) => value - before[index])
  const ok = result.status === 'REVIEW_REQUIRED' && version.reviewStatus === 'REVIEW_REQUIRED'
    && version.extractionRuns.every((run) => run.status === 'COMPLETED') && version.artifacts.length === 1
    && !version.artifacts[0].locator.includes('blob.vercel-storage.com') && original?.bytes.length === bytes.length
    && duplicate.status === 'POSSIBLE_DUPLICATE' && deltas[6] === 0 && deltas[7] === 0
  return NextResponse.json({ ok, sourceVersionId: result.sourceVersionId, reviewRequired: version.reviewStatus === 'REVIEW_REQUIRED', extractionCompleted: version.extractionRuns.every((run) => run.status === 'COMPLETED'), originalReadable: original?.bytes.length === bytes.length, duplicateIdempotent: duplicate.status === 'POSSIBLE_DUPLICATE', noClaims: deltas[6] === 0 && deltas[7] === 0, deltas: deltas.slice(0, 6) })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      stage,
      errorName: error instanceof Error ? error.name : 'Error',
      storageConfig: {
        vercelPreview: process.env.VERCEL_ENV === 'preview',
        blobPreview: process.env.KNOWLEDGE_UPLOAD_BLOB_ENVIRONMENT === 'preview',
        storeIdPresent: Boolean(process.env.KNOWLEDGE_UPLOAD_BLOB_STORE_ID),
        oidcPresent: Boolean(process.env.VERCEL_OIDC_TOKEN),
      },
    }, { status: 500 })
  }
}
