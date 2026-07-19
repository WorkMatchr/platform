import { Heading } from '@/components/ui/heading'
import {
  publicContentTypeLabels,
  type PublicContentId,
  type ResolvedPublicContentRelation,
} from '@/content/public-content'
import { PublicContentCard } from './public-content-card'

type RelatedTopicsProps = {
  currentContentId: PublicContentId
  topics: readonly ResolvedPublicContentRelation[]
  title?: string
  limit?: number
}

export function RelatedTopics({
  currentContentId,
  topics,
  title = 'Verder vanuit dit onderwerp',
  limit = 3,
}: RelatedTopicsProps) {
  const uniqueTopics = [...new Map(
    topics
      .filter((topic) => topic.id !== currentContentId)
      .map((topic) => [topic.id, topic]),
  ).values()].slice(0, Math.max(0, limit))

  if (uniqueTopics.length === 0) return null

  return (
    <section aria-labelledby={`${currentContentId}-related-title`}>
      <Heading as="h2" size="h2" id={`${currentContentId}-related-title`}>{title}</Heading>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {uniqueTopics.map((topic) => (
          <PublicContentCard
            key={topic.id}
            title={topic.title}
            description={topic.description}
            href={topic.href}
            contentTypeLabel={publicContentTypeLabels[topic.type]}
            headingLevel="h3"
            linkLabel={`Ga naar ${topic.title}`}
          />
        ))}
      </div>
    </section>
  )
}
