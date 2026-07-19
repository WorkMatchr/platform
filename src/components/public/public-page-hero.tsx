import { Badge } from '@/components/ui/badge'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

type PublicPageHeroProps = { eyebrow?: string; title: string; description: string }

export function PublicPageHero({ eyebrow, title, description }: PublicPageHeroProps) {
  return (
    <header className="max-w-3xl py-10 sm:py-14">
      {eyebrow && <Badge variant="neutral">{eyebrow}</Badge>}
      <Heading as="h1" size="h1" className="mt-5 min-w-0 break-words">{title}</Heading>
      <Text size="lg" className="mt-5 max-w-2xl text-text-secondary">{description}</Text>
    </header>
  )
}
