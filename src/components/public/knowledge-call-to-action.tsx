import type { PublicCallToActionContent } from '@/content/knowledge/types'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'

export function KnowledgeCallToAction({ content }: { content: PublicCallToActionContent }) {
  return <Card variant="dark"><Heading as="h2" size="h2">{content.title}</Heading><Text className="mt-4 max-w-2xl text-text-on-dark/80">{content.description}</Text><div className="mt-7 grid gap-5 sm:grid-cols-2"><div><LinkButton href={content.primary.href}>{content.primary.label}</LinkButton>{content.primary.description && <Text className="mt-3 text-sm text-text-on-dark/80">{content.primary.description}</Text>}</div>{content.secondary && <div><LinkButton href={content.secondary.href} variant="outline">{content.secondary.label}</LinkButton>{content.secondary.description && <Text className="mt-3 text-sm text-text-on-dark/80">{content.secondary.description}</Text>}</div>}</div></Card>
}
