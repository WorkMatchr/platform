import Link from 'next/link'
import type { SituationContent } from '@/content/public-homepage'
import { Card } from '@/components/ui/card'
import { Heading } from '@/components/ui/heading'
import { IconContainer } from '@/components/ui/icon-container'
import { Text } from '@/components/ui/text'
import { PublicIcon } from './public-icon'

export function SituationCard({ situation }: { situation: SituationContent }) {
  return (
    <Card className="group relative h-full shadow-none transition-colors duration-normal hover:border-brand-primary">
      <IconContainer><PublicIcon name={situation.icon} /></IconContainer>
      <Heading as="h3" size="h3" className="mt-5">{situation.title}</Heading>
      <Text className="mt-3 pb-12 text-text-secondary">{situation.description}</Text>
      <Link href={situation.href} className="absolute inset-x-7 bottom-7 inline-flex min-h-11 items-center rounded-control font-semibold text-brand-primary-hover after:absolute after:inset-0 after:rounded-card">
        {situation.label}<span aria-hidden="true" className="ml-2">→</span>
      </Link>
    </Card>
  )
}
