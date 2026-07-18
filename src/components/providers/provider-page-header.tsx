import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

export function ProviderPageHeader({
  title,
  description,
  groupLabel,
  readOnly = false,
}: {
  title: string
  description: string
  groupLabel?: string
  readOnly?: boolean
}) {
  return (
    <header className="mb-8">
      {groupLabel && <p className="mb-2 text-sm font-semibold text-brand-primary-hover">{groupLabel}</p>}
      <Heading as="h1" size="h2">{title}</Heading>
      <Text className="mt-3 max-w-3xl text-text-secondary">{description}</Text>
      {readOnly && <p className="mt-4 rounded-control bg-surface-subtle p-3 text-sm font-semibold">Alleen-lezen: vraag een OWNER of ADMIN om wijzigingen uit te voeren.</p>}
    </header>
  )
}
