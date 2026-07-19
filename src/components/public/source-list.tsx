import type { KnowledgeSource } from '@/content/knowledge/types'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'

const sourceTypeLabels = { LAW: 'Wetgeving', OFFICIAL_GUIDANCE: 'Officiële toelichting', ENFORCEMENT_GUIDANCE: 'Toezicht en uitvoering' } as const
const evidenceLabels = { PRIMARY: 'Primair bewijs', AUTHORITATIVE: 'Gezaghebbende uitleg' } as const

export function SourceList({ sources }: { sources: readonly KnowledgeSource[] }) {
  return (
    <section aria-labelledby="sources-title">
      <Heading as="h2" size="h2" id="sources-title">Bronnen en onderbouwing</Heading>
      <ul className="mt-6 space-y-5">
        {sources.map((source) => <li key={source.id} className="border-l-4 border-brand-primary/30 pl-5"><a href={source.location} target="_blank" rel="noreferrer" className="font-semibold text-brand-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">{source.title} <span className="sr-only">(opent in een nieuw venster)</span></a><Text size="sm" className="mt-1 text-text-secondary">{source.owner} · {sourceTypeLabels[source.sourceType]} · {evidenceLabels[source.evidenceLevel]} · {source.validationStatus === 'VALIDATED' ? 'Gecontroleerd' : 'Contextafhankelijk'}</Text><Text size="sm" className="mt-1 text-text-secondary">{source.note}</Text></li>)}
      </ul>
    </section>
  )
}
