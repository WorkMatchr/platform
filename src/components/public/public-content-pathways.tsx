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

function PathwayContent({ contentId, primaryHref }: { contentId: PublicContentId; primaryHref: InternalHref }) {
  const related = resolvePublicContentRelations(contentId).filter((item) => item.type !== 'tool')
  const populatedGroups = groups
    .map((group) => ({ ...group, items: related.filter((item) => belongsToGroup(item, group.key)) }))
    .filter((group) => group.items.length > 0)

  return (
    <>
      <div>
        <Heading as="h2" size="h2" id={`${contentId}-pathways-title`}>Verder met uw vraag</Heading>
        <Text className="mt-3 max-w-3xl text-text-secondary">Bekijk samenhangende informatie of verduidelijk wat voor uw situatie relevant is.</Text>
      </div>
      {populatedGroups.length > 0 ? (
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
      ) : null}
      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold text-text-primary">Wilt u weten wat voor uw situatie relevant is?</p>
        <LinkButton href={primaryHref} className="shrink-0">Stel uw vraag</LinkButton>
      </div>
    </>
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
        <PathwayContent contentId={contentId} primaryHref={primaryHref} />
      </section>
    )
  }

  return (
    <Section spacing="compact" className="bg-surface-subtle" containerClassName="grid gap-6" aria-labelledby={`${contentId}-pathways-title`}>
      <PathwayContent contentId={contentId} primaryHref={primaryHref} />
    </Section>
  )
}
