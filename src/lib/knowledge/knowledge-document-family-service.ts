import { randomUUID } from 'node:crypto'
import type { KnowledgeDocumentFamilyRole } from '@/generated/prisma/enums'
import { getPrisma } from '@/lib/prisma'

type DatabaseClient = ReturnType<typeof getPrisma>
export type KnowledgeDocumentFamilyInput = {
  code: string
  title: string
  members: Array<{ sourceVersionId: string; role: KnowledgeDocumentFamilyRole; sequence: number }>
}

function canonicalInput(input: KnowledgeDocumentFamilyInput) {
  const code = input.code.trim()
  const title = input.title.trim()
  const members = [...input.members].sort((left, right) => left.sequence - right.sequence)
  if (!code || !title || members.length < 2) throw new Error('KNOWLEDGE_DOCUMENT_FAMILY_INVALID')
  if (new Set(members.map((member) => member.sourceVersionId)).size !== members.length) throw new Error('KNOWLEDGE_DOCUMENT_FAMILY_DUPLICATE_VERSION')
  if (members.some((member, index) => member.sequence !== index + 1)) throw new Error('KNOWLEDGE_DOCUMENT_FAMILY_SEQUENCE_INVALID')
  return { code, title, members }
}

export async function storeKnowledgeDocumentFamily(input: KnowledgeDocumentFamilyInput, database: DatabaseClient = getPrisma()) {
  const data = canonicalInput(input)
  return database.$transaction(async (tx) => {
    const existing = await tx.knowledgeDocumentFamily.findUnique({ where: { code: data.code }, include: { members: { orderBy: { sequence: 'asc' } } } })
    if (existing) {
      const same = existing.title === data.title && existing.members.length === data.members.length && existing.members.every((member, index) => member.sourceVersionId === data.members[index].sourceVersionId && member.role === data.members[index].role && member.sequence === data.members[index].sequence)
      if (!same) throw new Error('KNOWLEDGE_DOCUMENT_FAMILY_CONFLICT')
      return { documentFamilyId: existing.id, created: false }
    }
    const versions = await tx.knowledgeSourceVersion.count({ where: { id: { in: data.members.map((member) => member.sourceVersionId) } } })
    if (versions !== data.members.length) throw new Error('KNOWLEDGE_DOCUMENT_FAMILY_SOURCE_VERSION_MISSING')
    const id = randomUUID()
    await tx.knowledgeDocumentFamily.create({ data: { id, code: data.code, title: data.title, members: { create: data.members.map((member) => ({ id: randomUUID(), ...member })) } } })
    return { documentFamilyId: id, created: true }
  }, { isolationLevel: 'Serializable' })
}
