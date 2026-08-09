import type { ProcessStepContent } from '@/content/public-homepage'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { IconContainer } from '@/components/ui/icon-container'
import { Text } from '@/components/ui/text'

export function ProcessSteps({ steps }: { steps: readonly ProcessStepContent[] }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
      {steps.map((step, index) => (
        <li key={step.title} className="relative min-w-0">
          <Card className="h-full !p-6 shadow-none sm:!p-7">
            <IconContainer className="font-bold">{index + 1}</IconContainer>
            <Heading as="h3" size="h3" className="mt-5 break-words">{step.title}</Heading>
            <Text className="mt-3 text-text-secondary">{step.description}</Text>
          </Card>
        </li>
      ))}
    </ol>
  )
}
