import type { KnowledgeSourceManifest } from './knowledge-source-manifest'
import { verifyManifestSource } from './knowledge-source-manifest'

export type KnowledgeExtractionCandidate = {
  sourceCode: string
  status: 'READY_FOR_MANUAL_EXTRACTION' | 'UNSUPPORTED_FOR_EXTRACTION'
  uncertainties: string[]
}

export interface KnowledgeExtractor {
  supports(format: KnowledgeSourceManifest['sources'][number]['format']): boolean
  inspect(source: KnowledgeSourceManifest['sources'][number]): Promise<KnowledgeExtractionCandidate>
}

export class LocalPdfInspectionExtractor implements KnowledgeExtractor {
  supports(format: KnowledgeSourceManifest['sources'][number]['format']) {
    return format === 'PDF'
  }

  async inspect(source: KnowledgeSourceManifest['sources'][number]) {
    if (!this.supports(source.format)) {
      return { sourceCode: source.code, status: 'UNSUPPORTED_FOR_EXTRACTION' as const, uncertainties: ['Legacy DOC wordt in v1 niet geopend of geconverteerd.'] }
    }
    await verifyManifestSource(source)
    return {
      sourceCode: source.code,
      status: 'READY_FOR_MANUAL_EXTRACTION' as const,
      uncertainties: ['Tekstextractie en inhoudelijke validatie vereisen afzonderlijke gecontroleerde stappen.'],
    }
  }
}
