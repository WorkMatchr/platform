'use client'

import type { FormEvent } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Heading } from '@/components/ui/heading'
import { Text } from '@/components/ui/text'
import { publicContentTypeLabels } from '@/content/public-content'
import { knowledgeSearchFilters, parseKnowledgeSearchFilter, searchPublicContent, type KnowledgeSearchFilter } from '@/content/knowledge-search'
import { publicRoutes } from '@/content/public-routes'
import { PublicContentCard } from './public-content-card'

function searchHref(query: string, filter: KnowledgeSearchFilter): string {
  const params = new URLSearchParams()
  if (query.trim()) params.set('q', query.trim())
  if (filter !== 'all') params.set('type', filter)
  const value = params.toString()
  return value ? `${publicRoutes.knowledge}?${value}` : publicRoutes.knowledge
}

export function KnowledgeSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const urlFilter = parseKnowledgeSearchFilter(searchParams.get('type'))
  const results = searchPublicContent(urlQuery, urlFilter)
  const hasSearch = Boolean(urlQuery || urlFilter !== 'all')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    router.push(searchHref(String(formData.get('q') ?? ''), urlFilter))
  }
  function selectFilter(filter: KnowledgeSearchFilter) { router.push(searchHref(urlQuery, filter)) }

  return <section aria-labelledby="search-title" className="space-y-8"><div><Heading as="h2" size="h2" id="search-title">Zoeken in publieke informatie</Heading><Text className="mt-3 max-w-3xl text-text-secondary">Zoek in kennis, wettelijke verplichtingen, diensten en sectoren. De resultaten komen uitsluitend uit gecontroleerde, gepubliceerde content.</Text></div><form role="search" onSubmit={submit} className="max-w-3xl space-y-4"><label htmlFor="knowledge-search" className="block font-semibold">Zoekterm</label><div className="flex flex-col gap-3 sm:flex-row"><input key={urlQuery} id="knowledge-search" name="q" defaultValue={urlQuery} type="search" placeholder="Zoek in kennis, verplichtingen, diensten en sectoren" className="min-w-0 flex-1 rounded-control border border-border bg-surface px-4 py-3 text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary" /><button type="submit" className="rounded-control bg-brand-primary px-5 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">Zoeken</button></div></form><fieldset><legend className="font-semibold">Filter op type</legend><div className="mt-3 flex flex-wrap gap-2">{knowledgeSearchFilters.map((filter) => <button key={filter.value} type="button" aria-pressed={urlFilter === filter.value} onClick={() => selectFilter(filter.value)} className={`rounded-full border px-4 py-2 text-body-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${urlFilter === filter.value ? 'border-brand-primary bg-brand-primary text-white' : 'border-border bg-surface text-text-primary hover:border-brand-primary'}`}>{filter.label}</button>)}</div></fieldset>{hasSearch ? <><div aria-live="polite" aria-atomic="true" className="font-semibold">{results.length} {results.length === 1 ? 'resultaat' : 'resultaten'}</div>{results.length > 0 ? <ul className="grid gap-5 md:grid-cols-2">{results.map((result) => <li key={result.id}><PublicContentCard title={result.title} description={result.description} href={result.href} contentTypeLabel={publicContentTypeLabels[result.type]} headingLevel="h3" linkLabel={`Lees ${result.title}`} /></li>)}</ul> : <div className="rounded-card border border-border bg-surface-subtle p-6"><Heading as="h3" size="h3">Geen resultaten gevonden voor deze zoekopdracht.</Heading><Text className="mt-3 text-text-secondary">Probeer een andere zoekterm, herstel de filters of verduidelijk uw situatie met de Advieswijzer.</Text><div className="mt-5 flex flex-wrap gap-4"><Link href={publicRoutes.knowledge} className="font-semibold text-brand-primary underline underline-offset-4">Wis zoekopdracht en filters</Link><Link href={publicRoutes.adviceGuide} className="font-semibold text-brand-primary underline underline-offset-4">Start de Advieswijzer</Link></div></div>}{results.length > 0 && <Link href={publicRoutes.knowledge} className="inline-block font-semibold text-brand-primary underline underline-offset-4">Wis zoekopdracht en filters</Link>}</> : <Text aria-live="polite" className="text-text-secondary">Vul een zoekterm in of kies een contenttype. Hieronder vindt u de gepubliceerde kennisartikelen en categorieën.</Text>}</section>
}
