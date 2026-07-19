import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

export function SectorPreviewCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="h-full p-6 shadow-none sm:p-6">
      <Heading as="h3" size="h3">{title}</Heading>
      <Text className="mt-3 text-text-secondary">{description}</Text>
    </Card>
  )
}
