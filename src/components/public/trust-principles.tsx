import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

export function TrustPrinciples({ principles }: { principles: readonly { title: string; description: string }[] }) {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {principles.map((principle, index) => (
        <Card key={principle.title} variant="subtle" className="h-full shadow-none">
          <p className="text-sm font-bold text-brand-primary-hover">0{index + 1}</p>
          <Heading as="h3" size="h3" className="mt-3">{principle.title}</Heading>
          <Text className="mt-3 text-text-secondary">{principle.description}</Text>
        </Card>
      ))}
    </div>
  )
}
