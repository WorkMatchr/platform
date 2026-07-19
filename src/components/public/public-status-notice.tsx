import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

export function PublicStatusNotice({ title, description, headingLevel = 'h2' }: { title: string; description: string; headingLevel?: 'h2' | 'h3' }) {
  return <Card variant="subtle" className="shadow-none" role="status"><Heading as={headingLevel} size="h3">{title}</Heading><Text className="mt-2 text-text-secondary">{description}</Text></Card>
}
