'use server'

import { getPrisma } from '@/lib/prisma'
import { requirePlatformAdministrator } from '@/lib/platform-admin/platform-admin-authorization'
import {
  analyzeKnowledgeSourceUpload,
  confirmKnowledgeSourceUpload,
  KnowledgeSourceUploadError,
  type KnowledgeSourceUploadMetadata,
  type KnowledgeSourceUploadPreview,
} from '@/lib/knowledge/knowledge-source-upload-service'
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

export async function confirmKnowledgeSourceUploadAction(input: {
  preview: KnowledgeSourceUploadPreview
  metadata: KnowledgeSourceUploadMetadata
  explicitlyConfirmed: boolean
}) {
  const administrator = await requirePlatformAdministrator(returnTo)
  try {
    const result = await confirmKnowledgeSourceUpload({
      ...input,
      actorUserId: administrator.userId,
      storage: getKnowledgeSourceUploadStorage(),
      database: getPrisma(),
    })
    return { ok: true as const, result }
  } catch (error) {
    return { ok: false as const, message: message(error) }
  }
}
