import type { Prisma } from '@/generated/prisma/client'

/** Canonical Requests never expose a second, internal Assignment identifier. */
export function externalAssignmentWhere(id: string): Prisma.AssignmentWhereInput {
  return { OR: [{ requestId: id }, { id, requestId: null }] }
}

export function ownedAssignmentWhere(userId: string): Prisma.AssignmentWhereInput {
  return { OR: [{ intake: { createdByUserId: userId } }, { request: { adviceDossier: { ownerUserId: userId } } }] }
}

export function externalAssignmentId(assignment: { id: string; requestId?: string | null }) {
  return assignment.requestId ?? assignment.id
}
