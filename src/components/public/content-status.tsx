import type { KnowledgeContentStatus, ValidationStatus } from '@/content/knowledge/types'
import { Badge } from '@/components/ui/badge'

export function ContentStatus({ status, validationStatus }: { status: KnowledgeContentStatus; validationStatus?: ValidationStatus }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Inhoudsstatus">
      <Badge variant="neutral">{status === 'PUBLISHED' ? 'Gepubliceerd' : 'In beoordeling'}</Badge>
      {validationStatus && <Badge variant="neutral">{validationStatus === 'VALIDATED' ? 'Bronnen gecontroleerd' : 'Afhankelijk van uw situatie'}</Badge>}
    </div>
  )
}
