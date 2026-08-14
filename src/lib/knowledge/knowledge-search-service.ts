import type { KnowledgeAccessTier, KnowledgeClaimType, KnowledgeDomain, KnowledgeTemporalStatus } from '@/generated/prisma/enums'
import { getPrisma } from '@/lib/prisma'
import { currentKnowledgeImportClaimWhere } from './knowledge-import-visibility'

const actionableKnowledgeReviewStatuses = ['OPEN', 'IN_PROGRESS', 'DEFERRED', 'CHANGES_REQUIRED'] as const

export type KnowledgeSearchInput = {
  query?: string
  topicSlug?: string
  domain?: KnowledgeDomain
  claimType?: KnowledgeClaimType
  accessTiers: KnowledgeAccessTier[]
  temporalStatus?: KnowledgeTemporalStatus
  language?: string
  jurisdiction?: string
  reviewMode?: boolean
  isPlatformAdministrator?: boolean
  limit?: number
}

export async function searchKnowledge(input: KnowledgeSearchInput) {
  const reviewMode = input.reviewMode === true && input.isPlatformAdministrator === true
  return getPrisma().knowledgeClaim.findMany({
    where: {
      AND: [
        currentKnowledgeImportClaimWhere,
        ...(input.query?.trim() ? [{ OR: [
          { statement: { contains: input.query.trim(), mode: 'insensitive' as const } },
          { normalizedStatement: { contains: input.query.trim(), mode: 'insensitive' as const } },
          { topic: { title: { contains: input.query.trim(), mode: 'insensitive' as const } } },
        ] }] : []),
      ],
      ...(reviewMode ? {} : { publicationStatus: 'PUBLISHED', validationStatus: 'VALIDATED' }),
      accessTier: { in: input.accessTiers },
      ...(input.temporalStatus ? { temporalStatus: input.temporalStatus } : {}),
      ...(input.claimType ? { claimType: input.claimType } : {}),
      ...(input.jurisdiction ? { jurisdiction: input.jurisdiction } : {}),
      topic: {
        ...(input.topicSlug ? { slug: input.topicSlug } : {}),
        ...(input.domain ? { domain: input.domain } : {}),
      },
      ...(input.language ? { citations: { some: { sourceVersion: { source: { language: input.language } } } } } : {}),
    },
    select: {
      id: true, statement: true, claimType: true, temporalStatus: true,
      validationStatus: true, publicationStatus: true, accessTier: true,
      topic: { select: { slug: true, title: true, domain: true } },
    },
    orderBy: [{ topic: { title: 'asc' } }, { createdAt: 'asc' }],
    take: Math.min(Math.max(input.limit ?? 50, 1), 100),
  })
}

export async function getKnowledgeAdminOverview() {
  const database = getPrisma()
  const [
    sources,
    claims,
    reviewTasks,
    conflicts,
    auditEvents,
    sourceCount,
    claimCount,
    reviewTaskCount,
    conflictCount,
    improvementReportCount,
    outdatedSourceCount,
    blockedPublicationCount,
    automaticallyProcessedCount,
    historicalInternalCount,
  ] = await Promise.all([
    database.knowledgeSource.findMany({ select: { id: true, code: true, title: true, publisher: true, publicationDate: true, edition: true, temporalStatus: true, copyrightClassification: true, versions: { select: { id: true, versionLabel: true, checksum: true, extractionStatus: true, reviewStatus: true } } }, orderBy: { code: 'asc' } }),
    database.knowledgeClaim.findMany({
      where: { AND: [currentKnowledgeImportClaimWhere], temporalStatus: { notIn: ['HISTORICAL', 'SUPERSEDED'] } },
      select: {
        id: true, externalKey: true, statement: true, temporalStatus: true,
        validationStatus: true, publicationStatus: true, accessTier: true,
        controlRisk: true, sourceControlStatus: true,
        topic: { select: { title: true } },
        citations: {
          select: {
            sourceVersion: { select: { versionLabel: true, source: { select: { code: true } } } },
            fragment: { select: { pageFrom: true, pageTo: true, sectionPath: true } },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    database.knowledgeReviewTask.findMany({ where: { requiresHumanAction: true, status: { in: [...actionableKnowledgeReviewStatuses] } }, select: { id: true, entityId: true, status: true, priority: true, reviewReason: true, controlExceptionType: true, controlExceptionReason: true, claim: { select: { externalKey: true } } }, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }], take: 50 }),
    database.knowledgeReviewTask.findMany({ where: { requiresHumanAction: true, controlExceptionType: 'SOURCE_CONFLICT', status: { in: [...actionableKnowledgeReviewStatuses] } }, select: { id: true, controlExceptionReason: true, claim: { select: { externalKey: true } } }, take: 50 }),
    database.knowledgeAuditEvent.findMany({ select: { id: true, eventType: true, entityType: true, result: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 50 }),
    database.knowledgeSource.count(),
    database.knowledgeClaim.count({ where: {
      AND: [currentKnowledgeImportClaimWhere],
      temporalStatus: { notIn: ['HISTORICAL', 'SUPERSEDED'] },
      publicationStatus: { not: 'PUBLISHED' },
    } }),
    database.knowledgeReviewTask.count({ where: { requiresHumanAction: true, status: { in: [...actionableKnowledgeReviewStatuses] } } }),
    database.knowledgeReviewTask.count({ where: { requiresHumanAction: true, controlExceptionType: 'SOURCE_CONFLICT', status: { in: [...actionableKnowledgeReviewStatuses] } } }),
    database.knowledgeImprovementReport.count({ where: { status: { in: ['NEW', 'UNDER_INVESTIGATION'] } } }),
    database.knowledgeReviewTask.count({ where: { requiresHumanAction: true, controlExceptionType: 'SOURCE_EXPIRED', status: { in: [...actionableKnowledgeReviewStatuses] } } }),
    database.knowledgeReviewTask.count({ where: { requiresHumanAction: true, controlExceptionType: { in: ['PUBLICATION_BLOCKED', 'HIGH_RISK_PUBLICATION'] }, status: { in: [...actionableKnowledgeReviewStatuses] } } }),
    database.knowledgeClaim.count({ where: {
      AND: [currentKnowledgeImportClaimWhere],
      temporalStatus: { notIn: ['HISTORICAL', 'SUPERSEDED'] },
      reviewTasks: { none: { requiresHumanAction: true, status: { in: [...actionableKnowledgeReviewStatuses] } } },
    } }),
    database.knowledgeClaim.count({ where: {
      AND: [currentKnowledgeImportClaimWhere],
      temporalStatus: { in: ['HISTORICAL', 'SUPERSEDED'] },
      publicationStatus: { not: 'PUBLISHED' },
    } }),
  ])
  return {
    sources,
    claims,
    reviewTasks,
    conflicts,
    auditEvents,
    counts: {
      sources: sourceCount,
      claims: claimCount,
      openReviews: reviewTaskCount,
      conflicts: conflictCount,
      improvementReports: improvementReportCount,
      outdatedSources: outdatedSourceCount,
      blockedForPublication: blockedPublicationCount,
      automaticallyProcessed: automaticallyProcessedCount,
      historicalInternal: historicalInternalCount,
    },
  }
}
