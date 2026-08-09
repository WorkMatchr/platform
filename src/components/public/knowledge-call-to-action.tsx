import type { PublicCallToActionContent } from '@/content/knowledge/types'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'

export function KnowledgeCallToAction({ content }: { content: PublicCallToActionContent }) {
  return <Card variant="dark" className="!p-5 sm:!p-6"><Heading as="h2" size="h2">{content.title}</Heading><Text className="mt-3 max-w-2xl text-text-on-dark-muted">{content.description}</Text><div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap"><LinkButton href={content.primary.href} className="w-full sm:w-auto">{content.primary.label}</LinkButton>{content.secondary && <LinkButton href={content.secondary.href} variant="outline" className="w-full border-text-on-dark bg-transparent text-text-on-dark hover:bg-text-on-dark hover:text-brand-dark sm:w-auto">{content.secondary.label}</LinkButton>}</div>{content.primary.description && <Text className="mt-3 text-sm text-text-on-dark-muted">{content.primary.description}</Text>}{content.secondary?.description && <Text className="mt-2 text-sm text-text-on-dark-muted">{content.secondary.description}</Text>}</Card>
}
