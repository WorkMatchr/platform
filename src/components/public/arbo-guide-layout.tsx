import type { ReactNode } from 'react'
import { Section } from '@/components/layout/section'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'
import { PublicPageLayout } from '@/components/public/public-page-layout'
import { publicRoutes, type PublicRoute } from '@/content/public-routes'

type ArboGuidePageLayoutProps = Readonly<{
  currentLabel?: string
  title: string
  description: string
  children: ReactNode
}>

export function ArboGuidePageLayout({ currentLabel, title, description, children }: ArboGuidePageLayoutProps) {
  const breadcrumbs = currentLabel
    ? [{ label: 'Home', href: publicRoutes.home }, { label: 'Arbo-wijzers', href: publicRoutes.guides }, { label: currentLabel }]
    : [{ label: 'Home', href: publicRoutes.home }, { label: 'Arbo-wijzers' }]

  return (
    <PublicPageLayout
      breadcrumbs={breadcrumbs}
      eyebrow={currentLabel ?? 'Arbo-wijzers'}
      title={title}
      description={description}
      compactHero
    >
      <Section spacing="compact" containerSize="default">
        {children}
      </Section>
    </PublicPageLayout>
  )
}

export function ArboGuideNotice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-7 rounded-card border border-brand-primary/20 bg-brand-primary-subtle p-5 text-sm text-text-secondary">
      {children}
    </div>
  )
}

export function ArboGuideOverviewCard({ title, description, href, actionLabel }: Readonly<{
  title: string
  description: string
  href: PublicRoute
  actionLabel: string
}>) {
  return (
    <Card className="flex h-full flex-col shadow-none">
      <h2 className="text-2xl font-bold text-brand-dark">{title}</h2>
      <p className="mt-3 flex-1 text-text-secondary">{description}</p>
      <LinkButton href={href} className="mt-6 self-start">{actionLabel}</LinkButton>
    </Card>
  )
}
