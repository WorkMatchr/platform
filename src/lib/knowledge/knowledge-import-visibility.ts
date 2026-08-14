import type { Prisma } from '@/generated/prisma/client'

/** Imported claims are current only while at least one citation points to a leaf import revision. */
export const currentKnowledgeImportClaimWhere = {
  OR: [
    { citations: { none: {} } },
    { citations: { some: { sourceVersion: { supersededByVersion: { is: null } } } } },
  ],
} satisfies Prisma.KnowledgeClaimWhereInput
