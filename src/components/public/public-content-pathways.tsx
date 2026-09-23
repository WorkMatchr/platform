import Link from 'next/link'
import { Section } from '@/components/layout/section'
import { Heading } from '@/components/ui/heading'
import { LinkButton } from '@/components/ui/link-button'
import { Text } from '@/components/ui/text'
import {
  resolvePublicContentRelations,
  type PublicContentId,
  type ResolvedPublicContentRelation,
} from '@/content/public-content'
import type { InternalHref } from '@/content/public-homepage'
import { publicRoutes } from '@/content/public-routes'

const groups = [
  { key: 'knowledge', title: 'Gerelateerde kennis' },
  { key: 'service', title: 'Gerelateerde diensten' },
  { key: 'sector', title: 'Gerelateerde sectoren' },
  { key: 'obligation', title: 'Gerelateerde wettelijke verplichtingen' },
] as const

function belongsToGroup(item: ResolvedPublicContentRelation, key: typeof groups[number]['key']) {
  return item.type === key || item.id === `overview:${key === 'service' ? 'services' : key === 'sector' ? 'sectors' : key === 'obligation' ? 'obligations' : 'knowledge'}`
}

function resolvePopulatedGroups(contentId: PublicContentId, includeSectors = true) {
  const related = resolvePublicContentRelations(contentId).filter((item) => item.type !== 'tool')
  return groups
    .filter((group) => includeSectors || group.key !== 'sector')
    .map((group) => ({ ...group, items: related.filter((item) => belongsToGroup(item, group.key)) }))
    .filter((group) => group.items.length > 0)
}

function PathwayRelations({ contentId, includeSectors = true, title = 'Verder met uw vraag' }: { contentId: PublicContentId; includeSectors?: boolean; title?: string }) {
  const populatedGroups = resolvePopulatedGroups(contentId, includeSectors)
  if (populatedGroups.length === 0) return null

  return (
    <>
      <div>
        <Heading as="h2" size="h2" id={`${contentId}-pathways-title`}>{title}</Heading>
        <Text className="mt-3 max-w-3xl text-text-secondary">Bekijk samenhangende informatie of verduidelijk wat voor uw situatie relevant is.</Text>
      </div>
      <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {populatedGroups.map((group) => (
          <section key={group.key} aria-labelledby={`${contentId}-${group.key}-title`}>
            <h3 className="text-sm font-bold uppercase tracking-wide text-brand-dark" id={`${contentId}-${group.key}-title`}>{group.title}</h3>
            <ul className="mt-2 space-y-1">
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link className="group inline-flex min-h-10 items-center gap-2 rounded-control font-semibold text-brand-primary hover:text-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary" href={item.href}>
                    <span>{item.title}</span><span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}

export function PublicContentRelations({ contentId, title }: { contentId: PublicContentId; title?: string }) {
  if (resolvePopulatedGroups(contentId, false).length === 0) return null
  return (
    <section className="grid gap-6 rounded-card border border-border bg-surface-subtle p-5 sm:p-6" aria-labelledby={`${contentId}-pathways-title`}>
      <PathwayRelations contentId={contentId} includeSectors={false} title={title} />
    </section>
  )
}

export function PublicContentCallToAction({
  primaryHref = publicRoutes.adviceGuide,
  linkLabel = 'Start de Advieswijzer',
  variant = 'default',
}: {
  primaryHref?: InternalHref
  linkLabel?: string
  variant?: 'default' | 'prominent'
}) {
  const prominent = variant === 'prominent'
  return (
    <section className={`flex flex-col rounded-card border ${prominent ? 'gap-5 border-brand-dark bg-brand-dark p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8' : 'gap-3 border-brand-primary/30 bg-brand-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6'}`} aria-labelledby="public-content-cta-title">
      <div>
        <Heading as="h2" size={prominent ? 'h2' : 'h3'} className={prominent ? 'text-text-on-dark' : ''} id="public-content-cta-title">Hulp nodig bij uw situatie?</Heading>
        <Text className={`mt-2 max-w-3xl ${prominent ? 'text-text-on-dark' : 'text-text-secondary'}`}>Weet u niet zeker wat deze informatie voor uw organisatie betekent? Vertel kort waar u tegenaan loopt. Via de Advieswijzer kunt u direct aangeven welke ondersteuning u zoekt.</Text>
      </div>
      <LinkButton href={primaryHref} variant={prominent ? 'outline' : 'primary'} className={`shrink-0 ${prominent ? 'w-full border-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-text-on-dark sm:w-auto' : ''}`}>{linkLabel}</LinkButton>
    </section>
  )
}

export function PublicContentPathways({
  contentId,
  primaryHref = publicRoutes.adviceGuide,
  embedded = false,
}: {
  contentId: PublicContentId
  primaryHref?: InternalHref
  embedded?: boolean
}) {
  if (embedded) {
    return (
      <section className="grid gap-6 rounded-card border border-border bg-surface-subtle p-5 sm:p-6" aria-labelledby={`${contentId}-pathways-title`}>
        <PathwayRelations contentId={contentId} />
        <PublicContentCallToAction primaryHref={primaryHref} linkLabel="Stel uw vraag" />
      </section>
    )
  }

  return (
    <Section spacing="compact" className="bg-surface-subtle" containerClassName="grid gap-6" aria-labelledby={`${contentId}-pathways-title`}>
      <PathwayRelations contentId={contentId} />
      <PublicContentCallToAction primaryHref={primaryHref} linkLabel="Stel uw vraag" />
    </Section>
  )
}
