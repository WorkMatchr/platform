import type { ProcessStepContent } from '@/content/public-homepage'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { IconContainer } from '@/components/ui/icon-container'
import { Text } from '@/components/ui/text'

export function ProcessSteps({ steps }: { steps: readonly ProcessStepContent[] }) {
  return (
    <ol className="grid gap-5 lg:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step.title} className="relative">
          <Card className="h-full shadow-none">
            <IconContainer className="font-bold">{index + 1}</IconContainer>
            <Heading as="h3" size="h3" className="mt-5">{step.title}</Heading>
            <Text className="mt-3 text-text-secondary">{step.description}</Text>
          </Card>
        </li>
      ))}
    </ol>
  )
}
