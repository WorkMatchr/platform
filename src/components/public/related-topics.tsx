import type { KnowledgeLink } from '@/content/knowledge/types'
import { Heading } from '@/components/ui/heading'
import { PublicContentCard } from './public-content-card'

export function RelatedTopics({ topics }: { topics: readonly KnowledgeLink[] }) {
  return <section aria-labelledby="related-title"><Heading as="h2" size="h2" id="related-title">Gerelateerde onderwerpen</Heading><div className="mt-6 grid gap-5 md:grid-cols-2">{topics.map((topic) => <PublicContentCard key={topic.href} {...topic} headingLevel="h3" linkLabel="Bekijk dit onderwerp" />)}</div></section>
}
