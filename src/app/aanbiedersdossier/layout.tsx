import type { ReactNode } from 'react'
import { Container } from '@/components/layout/container'
import { ProviderDossierNavigation, type ProviderNavigationItem } from '@/components/providers/provider-dossier-navigation'
import { getProviderDossierDashboard } from '@/lib/providers/provider-dossier-query-service'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import type { ProviderDossierSection } from '@/generated/prisma/client'

const groups: Array<{ label: string; href: string; matchPaths: string[]; sections: ProviderDossierSection[] }> = [
  { label: 'Dienstverlenersprofiel', href: '/aanbiedersdossier', matchPaths: ['/aanbiedersdossier'], sections: [] },
  { label: 'Bedrijfsgegevens', href: '/aanbiedersdossier/bedrijfsgegevens', matchPaths: ['/aanbiedersdossier/bedrijfsgegevens'], sections: ['ORGANIZATION'] },
  { label: 'Diensten en ervaring', href: '/aanbiedersdossier/diensten-en-ervaring', matchPaths: ['/aanbiedersdossier/diensten-en-ervaring', '/aanbiedersdossier/diensten', '/aanbiedersdossier/sectorervaring'], sections: ['CAPABILITIES', 'SECTOR_EXPERIENCE'] },
  { label: 'Werkgebied', href: '/aanbiedersdossier/werkgebied', matchPaths: ['/aanbiedersdossier/werkgebied'], sections: ['WORK_AREA'] },
  { label: 'Professionals en kwalificaties', href: '/aanbiedersdossier/professionals', matchPaths: ['/aanbiedersdossier/professionals'], sections: ['PROFESSIONALS', 'QUALIFICATIONS'] },
  { label: 'Verzekeringen en bewijsstukken', href: '/aanbiedersdossier/verzekeringen', matchPaths: ['/aanbiedersdossier/verzekeringen', '/aanbiedersdossier/bewijsstukken'], sections: ['INSURANCE', 'EVIDENCE'] },
  { label: 'Verklaringen en indienen', href: '/aanbiedersdossier/verklaringen', matchPaths: ['/aanbiedersdossier/verklaringen', '/aanbiedersdossier/controleren'], sections: ['DECLARATIONS'] },
]

export default async function ProviderDossierLayout({ children }: { children: ReactNode }) {
  const context = await requireProviderDossierContext('/aanbiedersdossier')
  const dashboard = await getProviderDossierDashboard(context.user.id, context.providerProfileId)
  const items: ProviderNavigationItem[] = groups.map((group) => {
    const reasons = group.sections.length === 0
      ? dashboard.completeness.reasons
      : dashboard.completeness.reasons.filter((reason) => group.sections.includes(reason.section))
    const status = reasons.some((reason) => reason.state === 'EXPIRED') ? 'Verlopen'
      : reasons.some((reason) => reason.state === 'ACTION_REQUIRED' || reason.state === 'WARNING') ? 'Actie nodig'
        : reasons.some((reason) => reason.state === 'NOT_STARTED') ? 'Niet gestart' : 'Gereed'
    return { label: group.label, href: group.href, matchPaths: group.matchPaths, status }
  })

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-6 rounded-card border border-border bg-surface px-5 py-4">
        <p className="text-sm text-text-secondary">Actieve organisatie</p>
        <p className="font-bold text-brand-dark">{context.organization.name}</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside><ProviderDossierNavigation items={items} /></aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  )
}
