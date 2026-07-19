import type { KnowledgeCallToActionContent } from '@/content/knowledge/types'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'

export function KnowledgeCallToAction({ content }: { content: KnowledgeCallToActionContent }) {
  return <Card variant="dark"><Heading as="h2" size="h2">{content.title}</Heading><Text className="mt-4 max-w-2xl text-text-on-dark/80">{content.description}</Text><div className="mt-7 flex flex-col gap-3 sm:flex-row"><LinkButton href={content.primary.href}>{content.primary.label}</LinkButton>{content.secondary && <LinkButton href={content.secondary.href} variant="outline">{content.secondary.label}</LinkButton>}</div></Card>
}
