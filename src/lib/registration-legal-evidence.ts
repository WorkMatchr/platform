import { createHash } from 'node:crypto'
import { legalDocuments, REGISTRATION_LEGAL_VERSION } from '@/content/legal-documents'

export function registrationLegalEvidence(input: { acceptedTerms?: unknown; legalVersion?: unknown }) {
  if (input.acceptedTerms !== true || input.legalVersion !== REGISTRATION_LEGAL_VERSION) throw new Error('REGISTRATION_DOCUMENT_VERSION_REQUIRED')
  return { context: 'REGISTRATION', status: 'PLACEHOLDER_NOT_APPROVED', documents: Object.entries(legalDocuments).map(([id, content]) => ({
    id, version: REGISTRATION_LEGAL_VERSION, kind: id === 'terms' ? 'CONTRACT_ACCEPTANCE' : 'INFORMATION_PRESENTED',
    content, sha256: createHash('sha256').update(JSON.stringify(content)).digest('hex'),
  })) }
}
