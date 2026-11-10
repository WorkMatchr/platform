import 'server-only'
import { Prisma } from '@/generated/prisma/client'
import { createHash } from 'node:crypto'
import { canonicalAcademyContent, writeAcademyBundle, assertExistingAcademyBundle } from './academy-import-service'
import { validateAcademyBundle, type AcademyCourseBundle } from './academy-content-standard'
import { readLearningMedia } from './learning-media-storage'

export const bundleHash = (bundle: AcademyCourseBundle) => createHash('sha256').update(canonicalAcademyContent(bundle)).digest('hex')
export { isAcademyBundle } from './academy-bundle-contract'

/** Edits create a new draft; the source, import receipt and every historical row remain unchanged. */
export async function saveBundleDraft(tx: Prisma.TransactionClient, raw: unknown, actor: string, sourceId?: string, revision = 0) {
  const bundle = validateAcademyBundle(raw)
  const hash = bundleHash(bundle)
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`academy-author:${bundle.definition.courseCode}`},0))::text`
  const source = sourceId ? await tx.learningCourseVersion.findUniqueOrThrow({ where: { id: sourceId }, include: { course: true } }) : null
  if (source && source.course.code !== bundle.definition.courseCode) throw Error('COURSE_IDENTITY_CONFLICT')
  const sourceMeta = source?.sourceMetadata as { authoring?: { revision: number; hash: string } } | null
  if (source && (sourceMeta?.authoring?.revision ?? 0) !== revision) throw Error('STALE_OR_LOCKED_DRAFT')
  const course = await tx.learningCourse.findUnique({ where: { code: bundle.definition.courseCode } })
  // A bundle describes one version. Never write its copy into an existing course:
  // historical enrollments and certificates still reference that catalog identity.
  if (course && (course.slug !== bundle.definition.slug || course.title !== bundle.definition.title)) {
    throw Error('PUBLISHED_IDENTITY_IMMUTABLE')
  }
  const existing = course ? await tx.learningCourseVersion.findUnique({ where: { courseId_version: { courseId: course.id, version: bundle.courseVersion } } }) : null
  if (existing) {
    const meta = existing.sourceMetadata as { authoring?: { hash: string; revision: number } } | null
    if (meta?.authoring?.hash !== hash) throw Error('ACADEMY_NEW_VERSION_REQUIRED')
    await assertExistingAcademyBundle(tx, bundle, existing.id)
    return { id: existing.id, revision: meta.authoring.revision }
  }
  // The exact question versions are explicit in the exported bundle. Reuse is
  // rejected by the shared writer; published questions are never rewritten.
  const result = await writeAcademyBundle(tx, bundle, hash, `author:${actor}`, course)
  const metadata = { catalogDescriptionAtImport: course?.description ?? bundle.description, academy: bundle.definition, bundleHash: hash, reviewFlags: bundle.reviewFlags,
    authoring: { content: bundle, state: 'DRAFT', revision: 1, hash } }
  await tx.learningCourseVersion.update({ where: { id: result.courseVersionId }, data: { sourceMetadata: metadata as unknown as Prisma.InputJsonValue } })
  await tx.marketplaceAuditEvent.create({ data: { actorUserId: actor, actorRole: 'PLATFORM_ADMIN', entityType: 'LearningCourseVersion', entityId: result.courseVersionId,
    action: 'ACADEMY_DRAFT_SAVED', metadata: { revision: 1, hash, sourceVersionId: sourceId ?? null } } })
  return { id: result.courseVersionId, revision: 1 }
}

export async function verifyBundleDraft(tx: Prisma.TransactionClient, id: string, raw: AcademyCourseBundle) {
  const bundle = validateAcademyBundle(raw)
  await assertExistingAcademyBundle(tx, bundle, id)
  const version = await tx.learningCourseVersion.findUniqueOrThrow({ where: { id }, include: { course: true } })
  const metadata = version.sourceMetadata as { catalogDescriptionAtImport?: string; bundleHash?: string } | null
  if (metadata?.bundleHash !== bundleHash(bundle)) throw Error('REVIEW_CONTENT_DRIFT')
  if (version.version !== bundle.courseVersion || version.course.code !== bundle.definition.courseCode
    || version.course.title !== bundle.definition.title || version.course.slug !== bundle.definition.slug
    || version.course.description !== (metadata.catalogDescriptionAtImport ?? bundle.description)) throw Error('REVIEW_CONTENT_DRIFT')
  const exam = await tx.learningExamVersion.findFirstOrThrow({ where: { courseVersionId: id } })
  if (exam.attemptLimit !== (bundle.examSettings?.attemptLimit ?? null) || exam.passingScore !== bundle.definition.exam.passingScore
    || exam.questionCount !== 50 || exam.maxScore !== 50 || exam.passingPercentage !== bundle.definition.exam.passingPercentage) throw Error('REVIEW_CONTENT_DRIFT')
  for (const block of bundle.chapters.flatMap(c => c.blocks)) {
    if (block.type === 'IMAGE' && !await readLearningMedia(String(block.data.src).slice('/learning-media/'.length))) throw Error('MEDIA_NOT_VERIFIED')
  }
}

export async function publishBundleQuestions(tx: Prisma.TransactionClient, id: string, bundle: AcademyCourseBundle) {
  const all = [...bundle.chapters.flatMap(c => c.questions), ...bundle.examQuestions, ...bundle.retentionQuestions]
  await tx.learningQuestion.updateMany({ where: { OR: all.map(q => ({ code: q.code, version: q.version })) }, data: { status: 'PUBLISHED_PROTOTYPE' } })
  await tx.learningRetentionQuestion.updateMany({ where: { bankVersion: bundle.definition.retention.bankVersion }, data: { status: 'PUBLISHED' } })
  // Retention mail enrollment/activation stays separate and requires its existing consent flow.
  void id
}
