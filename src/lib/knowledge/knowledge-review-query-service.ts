import 'server-only'

import type {
  KnowledgeClaimType,
  KnowledgePublicationStatus,
  KnowledgeReviewPriority,
  KnowledgeReviewTaskStatus,
  KnowledgeValidationStatus,
} from '@/generated/prisma/enums'
import { getPrisma } from '@/lib/prisma'

export type KnowledgeReviewFilters = {
  sourceCode?: string
  topicSlug?: string
  claimType?: KnowledgeClaimType
  priority?: KnowledgeReviewPriority
  status?: KnowledgeReviewTaskStatus
  validationStatus?: KnowledgeValidationStatus
  publicationStatus?: KnowledgePublicationStatus
  sort?: 'oldest' | 'newest' | 'priority' | 'source' | 'topic'
}

const activeReviewStatuses: KnowledgeReviewTaskStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'DEFERRED',
  'CHANGES_REQUIRED',
]

export async function getKnowledgeReviewOverview(filters: KnowledgeReviewFilters = {}) {
  const database = getPrisma()
  const where = {
    requiresHumanAction: true,
    ...(filters.status ? { status: filters.status } : { status: { in: activeReviewStatuses } }),
    ...(filters.priority ? { priority: filters.priority } : {}),
    claim: {
      ...(filters.claimType ? { claimType: filters.claimType } : {}),
      ...(filters.validationStatus ? { validationStatus: filters.validationStatus } : {}),
      ...(filters.publicationStatus ? { publicationStatus: filters.publicationStatus } : {}),
      ...(filters.topicSlug ? { topic: { slug: filters.topicSlug } } : {}),
      ...(filters.sourceCode ? { citations: { some: { sourceVersion: { source: { code: filters.sourceCode } } } } } : {}),
    },
  }
  const orderBy = filters.sort === 'newest'
    ? [{ createdAt: 'desc' as const }]
    : filters.sort === 'priority'
      ? [{ priority: 'desc' as const }, { createdAt: 'asc' as const }]
      : filters.sort === 'topic'
          ? [{ claim: { topic: { title: 'asc' as const } } }, { createdAt: 'asc' as const }]
          : [{ createdAt: 'asc' as const }]

  const [tasks, total, sources, topics] = await Promise.all([
    database.knowledgeReviewTask.findMany({
      where,
      select: {
        id: true,
        version: true,
        priority: true,
        status: true,
        requiresHumanAction: true,
        controlExceptionType: true,
        controlExceptionReason: true,
        activatedAt: true,
        createdAt: true,
        assignedTo: { select: { displayName: true, email: true } },
        claim: {
          select: {
            externalKey: true,
            statement: true,
            claimType: true,
            validationStatus: true,
            publicationStatus: true,
            controlRisk: true,
            sourceControlStatus: true,
            topic: { select: { slug: true, title: true } },
            citations: {
              select: {
                sourceVersion: { select: { source: { select: { code: true } } } },
                fragment: { select: { pageFrom: true, pageTo: true, sectionPath: true } },
              },
              orderBy: { createdAt: 'asc' },
              take: 1,
            },
          },
        },
      },
      orderBy,
      take: 200,
    }),
    database.knowledgeReviewTask.count({ where }),
    database.knowledgeSource.findMany({ select: { code: true, title: true }, orderBy: { code: 'asc' } }),
    database.knowledgeTopic.findMany({ select: { slug: true, title: true }, orderBy: { title: 'asc' } }),
  ])
  const sortedTasks = filters.sort === 'source'
    ? tasks.toSorted((left, right) =>
      (left.claim.citations[0]?.sourceVersion.source.code ?? '').localeCompare(
        right.claim.citations[0]?.sourceVersion.source.code ?? '',
        'nl-NL',
      ))
    : tasks
  return { tasks: sortedTasks, total, sources, topics }
}

export async function getKnowledgeReviewTask(reviewTaskId: string) {
  return getPrisma().knowledgeReviewTask.findUnique({
    where: { id: reviewTaskId },
    include: {
      assignedTo: { select: { id: true, displayName: true, email: true } },
      lastEditedBy: { select: { displayName: true, email: true } },
      completedBy: { select: { displayName: true, email: true } },
      claim: {
        include: {
          topic: true,
          citations: {
            include: {
              sourceVersion: { include: { source: true } },
              fragment: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          validations: {
            include: { validatorUser: { select: { displayName: true, email: true } } },
            orderBy: { validatedAt: 'desc' },
          },
        },
      },
      decisions: {
        include: { actorUser: { select: { displayName: true, email: true } } },
        orderBy: { sequence: 'desc' },
      },
      sourceReferences: {
        include: {
          actorUser: { select: { displayName: true, email: true } },
          withdrawnByReferences: { select: { id: true } },
          sourceVersion: { include: { source: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

export async function getKnowledgeSourceOptions() {
  return getPrisma().knowledgeSourceVersion.findMany({
    select: {
      id: true,
      versionLabel: true,
      source: { select: { code: true, title: true, temporalStatus: true, authorityLevel: true } },
    },
    orderBy: [{ source: { code: 'asc' } }, { createdAt: 'desc' }],
  })
}

export const knowledgeOpenReviewStatuses = activeReviewStatuses
