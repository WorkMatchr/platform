import type { ReactNode } from 'react'
import { Container } from '@/components/layout/container'
import { ProviderDossierNavigation, type ProviderNavigationItem } from '@/components/providers/provider-dossier-navigation'
import { getProviderDossierDashboard } from '@/lib/providers/provider-dossier-query-service'
import { requireProviderDossierContext } from '@/lib/providers/provider-onboarding-context'
import type { ProviderDossierSection } from '@/generated/prisma/client'

const groups: Array<{ label: string; href: string; matchPaths: string[]; sections: ProviderDossierSection[] }> = [
  { label: 'Overzicht', href: '/aanbiedersdossier', matchPaths: ['/aanbiedersdossier'], sections: [] },
  { label: 'Dienstverlenersprofiel', href: '/aanbiedersdossier/profiel', matchPaths: ['/aanbiedersdossier/profiel', '/aanbiedersdossier/voorvertoning'], sections: ['ORGANIZATION', 'CAPABILITIES'] },
  { label: 'Bedrijfsgegevens', href: '/aanbiedersdossier/bedrijfsgegevens', matchPaths: ['/aanbiedersdossier/bedrijfsgegevens'], sections: ['ORGANIZATION'] },
  { label: 'Mijn dienstverlening', href: '/aanbiedersdossier/diensten-en-ervaring', matchPaths: ['/aanbiedersdossier/diensten-en-ervaring', '/aanbiedersdossier/diensten', '/aanbiedersdossier/sectorervaring', '/aanbiedersdossier/werkgebied'], sections: ['CAPABILITIES', 'SECTOR_EXPERIENCE', 'WORK_AREA'] },
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
      <div data-provider-workspace className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside><ProviderDossierNavigation items={items} /></aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  )
}
