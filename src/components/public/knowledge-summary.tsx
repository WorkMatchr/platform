import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

export function KnowledgeSummary({ children }: { children: string }) {
  return <Card variant="subtle" className="shadow-none"><Heading as="h2" size="h3">Kort antwoord</Heading><Text size="lg" className="mt-3">{children}</Text></Card>
}
