import { Badge } from '@/components/ui/badge'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

type PublicPageHeroProps = {
  eyebrow?: string
  title: string
  description: string
  compact?: boolean
}

export function PublicPageHero({
  eyebrow,
  title,
  description,
  compact = false,
}: PublicPageHeroProps) {
  return (
    <header className={`${compact ? 'max-w-5xl py-5 sm:py-7' : 'max-w-3xl py-10 sm:py-14'}`}>
      {eyebrow && <Badge variant="neutral">{eyebrow}</Badge>}
      <Heading
        as="h1"
        size="h1"
        className={`min-w-0 break-words ${
          compact ? 'mt-3 !text-[clamp(2.25rem,3.5vw,3rem)]' : 'mt-5'
        }`}
      >
        {title}
      </Heading>
      <Text
        size="lg"
        className={`${compact ? 'mt-3 max-w-3xl' : 'mt-5 max-w-2xl'} text-text-secondary`}
      >
        {description}
      </Text>
    </header>
  )
}
