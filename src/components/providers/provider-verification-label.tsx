import { Badge } from '@/components/ui/badge'

export function ProviderVerificationLabel({ label }: { label: string }) {
  return <Badge variant="neutral" aria-label={`Verificatieniveau: ${label}`}>{label}</Badge>
}
