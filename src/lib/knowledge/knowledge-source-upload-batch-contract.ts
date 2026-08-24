export const KNOWLEDGE_SOURCE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024
export const KNOWLEDGE_SOURCE_UPLOAD_MAX_FILES = 10
export const KNOWLEDGE_SOURCE_UPLOAD_MAX_BATCH_BYTES = 50 * 1024 * 1024
export const KNOWLEDGE_SOURCE_UPLOAD_CONCURRENCY = 2

export type KnowledgeUploadFileDescriptor = { name: string; type: string; size: number }

export function validateKnowledgeSourceUploadBatch(files: KnowledgeUploadFileDescriptor[]) {
  if (files.length < 1 || files.length > KNOWLEDGE_SOURCE_UPLOAD_MAX_FILES) return { batchError: 'Selecteer 1 tot en met 10 PDF-bestanden.', fileErrors: new Map<number, string>() }
  if (files.reduce((sum, file) => sum + file.size, 0) > KNOWLEDGE_SOURCE_UPLOAD_MAX_BATCH_BYTES) return { batchError: 'De totale uploadbatch mag maximaal 50 MB groot zijn.', fileErrors: new Map<number, string>() }
  const fileErrors = new Map<number, string>()
  files.forEach((file, index) => {
    if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) fileErrors.set(index, 'Alleen PDF-bestanden zijn toegestaan.')
    else if (!file.size || file.size > KNOWLEDGE_SOURCE_UPLOAD_MAX_BYTES) fileErrors.set(index, 'Dit PDF-bestand moet tussen 1 byte en 10 MB groot zijn.')
  })
  return { batchError: null, fileErrors }
}

export function duplicateChecksumIndexes(checksums: Array<string | null>) {
  const seen = new Set<string>(); const duplicates = new Set<number>()
  checksums.forEach((checksum, index) => { if (!checksum) return; if (seen.has(checksum)) duplicates.add(index); else seen.add(checksum) })
  return duplicates
}
