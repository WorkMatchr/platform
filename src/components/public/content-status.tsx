import type { PublicContentStatus, ValidationStatus } from '@/content/public-content-model'
import { Badge } from '@/components/ui/badge'

export function ContentStatus({ status, validationStatus }: { status: PublicContentStatus; validationStatus?: ValidationStatus }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Inhoudsstatus">
      <Badge variant="neutral">{status === 'PUBLISHED' ? 'Gepubliceerd' : 'In beoordeling'}</Badge>
      {validationStatus && <Badge variant="neutral">{validationStatus === 'VALIDATED' ? 'Bronnen gecontroleerd' : 'Afhankelijk van uw situatie'}</Badge>}
    </div>
  )
}
