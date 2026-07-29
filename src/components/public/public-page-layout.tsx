import type { ReactNode } from 'react'
import { Container } from '@/components/layout/container'
import { Breadcrumbs } from './breadcrumbs'
import { PublicPageHero } from './public-page-hero'
import type { InternalHref } from '@/content/public-homepage'

type PublicPageLayoutProps = {
  breadcrumbs: readonly { label: string; href?: InternalHref }[]
  eyebrow?: string
  title: string
  description: string
  compactHero?: boolean
  children: ReactNode
}

export function PublicPageLayout({
  breadcrumbs,
  eyebrow,
  title,
  description,
  compactHero = false,
  children,
}: PublicPageLayoutProps) {
  return (
    <div>
      <div className="border-b border-border bg-surface-subtle">
        <Container className={compactHero ? 'pt-4 sm:pt-5' : 'pt-8'}>
          <Breadcrumbs items={breadcrumbs} />
          <PublicPageHero
            eyebrow={eyebrow}
            title={title}
            description={description}
            compact={compactHero}
          />
        </Container>
      </div>
      {children}
    </div>
  )
}
