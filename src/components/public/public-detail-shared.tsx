import type { ReactNode } from 'react'
import { Section } from '@/components/layout/section'
import { Badge } from '@/components/ui/badge'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import type { PublicContentBase, PublicFaq, PublicSource } from '@/content/public-content-model'
import { LastReviewed } from './last-reviewed'

export function PublicDetailBody({ children }: { children: ReactNode }) {
  return <Section containerSize="narrow" spacing="compact" containerClassName="space-y-10 sm:space-y-12">{children}</Section>
}

export function PublicContentStatus({ content }: { content: PublicContentBase }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" aria-label="Inhoudsstatus">
        <Badge variant="neutral">Gepubliceerd</Badge>
        <Badge variant="neutral">{content.validationStatus === 'VALIDATED' ? 'Bronnen gecontroleerd' : 'Afhankelijk van uw situatie'}</Badge>
      </div>
      <LastReviewed date={content.lastReviewed} />
    </div>
  )
}

export function PublicTextSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section aria-labelledby={`${id}-title`}><Heading as="h2" size="h2" id={`${id}-title`}>{title}</Heading><div className="mt-4 space-y-4 text-text-secondary">{children}</div></section>
}

export function PublicBulletList({ items }: { items: readonly string[] }) {
  return <ul className="list-disc space-y-2 pl-6 text-body leading-7 text-text-secondary">{items.map((item) => <li key={item}>{item}</li>)}</ul>
}

export function PublicSteps({ items }: { items: readonly string[] }) {
  return <ol className="space-y-3 text-text-secondary">{items.map((item, index) => <li key={item} className="flex gap-3"><span className="font-semibold text-brand-primary" aria-hidden="true">{index + 1}.</span><span>{item}</span></li>)}</ol>
}

export function PublicFaqList({ faq }: { faq: readonly PublicFaq[] }) {
  if (faq.length === 0) return null
  return <section aria-labelledby="faq-title"><Heading as="h2" size="h2" id="faq-title">Veelgestelde vragen</Heading><dl className="mt-6 space-y-6">{faq.map((item) => <div key={item.id}><dt className="font-semibold text-text-primary">{item.question}</dt><dd className="mt-2 text-body leading-7 text-text-secondary">{item.answer}</dd></div>)}</dl></section>
}

const sourceTypeLabels = {
  LAW: 'Wetgeving',
  OFFICIAL_GUIDANCE: 'Officiële toelichting',
  ENFORCEMENT_GUIDANCE: 'Toezicht en uitvoering',
  OFFICIAL_RESEARCH: 'Officieel onderzoek',
} as const

export function PublicSourceList({ sources }: { sources: readonly PublicSource[] }) {
  return <section aria-labelledby="sources-title"><Heading as="h2" size="h2" id="sources-title">Bronnen en onderbouwing</Heading><ul className="mt-6 space-y-5">{sources.map((source) => <li key={source.id} className="border-l-4 border-brand-primary/30 pl-5"><a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-brand-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-primary">{source.title}<span className="sr-only"> (opent in een nieuw venster)</span></a><Text size="sm" className="mt-1 text-text-secondary">{source.publisher} · {sourceTypeLabels[source.type]} · {source.evidenceLevel === 'PRIMARY' ? 'Primaire bron' : 'Gezaghebbende bron'}</Text><Text size="sm" className="mt-1 text-text-secondary">{source.note}</Text></li>)}</ul></section>
}
