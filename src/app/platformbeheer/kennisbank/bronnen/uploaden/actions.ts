'use server'

import { getPrisma } from '@/lib/prisma'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import {
  analyzeKnowledgeSourceUpload,
  analyzeKnowledgeSourceUploadPreviews,
  analyzeStoredKnowledgeSourceUpload,
  confirmKnowledgeSourceUpload,
  KnowledgeSourceUploadError,
  type KnowledgeSourceUploadMetadata,
  type KnowledgeSourceUploadPreview,
} from '@/lib/knowledge/knowledge-source-upload-service'
import { storeKnowledgeDocumentFamily, type KnowledgeDocumentFamilyInput } from '@/lib/knowledge/knowledge-document-family-service'
import {
  getKnowledgeSourceUploadStorage,
  KnowledgeSourceUploadStorageUnavailableError,
} from '@/lib/knowledge/knowledge-source-upload-storage'

const returnTo = '/platformbeheer/kennisbank/bronnen/uploaden'

function message(error: unknown) {
  if (error instanceof KnowledgeSourceUploadError || error instanceof KnowledgeSourceUploadStorageUnavailableError) return error.message
  return 'De bron kon niet veilig worden verwerkt. Controleer het bestand en probeer het opnieuw.'
}

export async function analyzeKnowledgeSourceUploadAction(formData: FormData) {
  await requirePlatformAdministrator(returnTo)
  try {
    const file = formData.get('file')
    if (!(file instanceof File)) throw new KnowledgeSourceUploadError('FILE_REQUIRED', 'Selecteer een PDF-bestand.')
    const preview = await analyzeKnowledgeSourceUpload({
      bytes: new Uint8Array(await file.arrayBuffer()),
      fileName: file.name,
      mediaType: file.type,
      storage: getKnowledgeSourceUploadStorage(),
      database: getPrisma(),
    })
    return { ok: true as const, preview }
  } catch (error) {
    return { ok: false as const, message: message(error) }
  }
}

export async function analyzeStoredKnowledgeSourceUploadAction(input: { storageKey: string; fileName: string; mediaType: string }) {
  await requirePlatformAdministrator(returnTo)
  try {
    const preview = await analyzeStoredKnowledgeSourceUpload({ ...input, storage: getKnowledgeSourceUploadStorage(), database: getPrisma() })
    return { ok: true as const, preview }
  } catch (error) {
    return { ok: false as const, message: message(error) }
  }
}

export async function analyzeKnowledgeSourceUploadBatchAction(input: { previews: KnowledgeSourceUploadPreview[] }) {
  await requirePlatformAdministrator(returnTo)
  try {
    return { ok: true as const, analysis: analyzeKnowledgeSourceUploadPreviews(input.previews) }
  } catch {
    return { ok: false as const, message: 'De gezamenlijke analyse kon niet veilig worden uitgevoerd.' }
  }
}

export async function confirmKnowledgeSourceUploadAction(input: {
  preview: KnowledgeSourceUploadPreview
  metadata: KnowledgeSourceUploadMetadata
  explicitlyConfirmed: boolean
  relationshipReviewed: boolean
  relationship?: { existingSourceVersionId: string; existingSourceCode: string; existingSourceTitle: string; role: 'BACKGROUND_EVIDENCE' | 'APPENDIX' | 'SUMMARY' }
}) {
  const administrator = await requirePlatformAdministrator(returnTo)
  try {
    const result = await confirmKnowledgeSourceUpload({
      ...input,
      actorUserId: administrator.userId,
      storage: getKnowledgeSourceUploadStorage(),
      database: getPrisma(),
    })
    const familyResult = input.relationship ? await storeKnowledgeDocumentFamily({
      code: `RELATED-${input.relationship.existingSourceCode}-${input.metadata.sourceCode}`.toUpperCase().replace(/[^A-Z0-9-]+/gu, '-').slice(0, 160),
      title: `${input.relationship.existingSourceTitle} — documentfamilie`.slice(0, 300),
      members: [
        { sourceVersionId: input.relationship.existingSourceVersionId, role: 'PRIMARY_GUIDELINE', sequence: 1 },
        { sourceVersionId: result.sourceVersionId, role: input.relationship.role, sequence: 2 },
      ],
    }, getPrisma()) : null
    return { ok: true as const, result, familyResult }
  } catch (error) {
    return { ok: false as const, message: message(error) }
  }
}

export async function confirmKnowledgeDocumentFamilyAction(input: KnowledgeDocumentFamilyInput) {
  await requirePlatformAdministrator(returnTo)
  try {
    return { ok: true as const, result: await storeKnowledgeDocumentFamily(input, getPrisma()) }
  } catch {
    return { ok: false as const, message: 'De documentfamilie kon niet veilig worden vastgelegd.' }
  }
}
