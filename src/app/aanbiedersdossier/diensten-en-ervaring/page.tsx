import { ProviderPageHeader } from '@/components/providers/provider-page-header'
import { Card } from '@/components/ui/card'
import { LinkButton } from '@/components/ui/link-button'

const sections = [
  {
    title: 'Diensten en specialismen',
    description: 'Leg vast welke diensten, specialismen en leveringsvormen uw organisatie aanbiedt.',
    href: '/aanbiedersdossier/diensten',
    linkLabel: 'Naar diensten en specialismen',
  },
  {
    title: 'Sectorervaring',
    description: 'Beschrijf in welke sectoren uw organisatie aantoonbare ervaring heeft.',
    href: '/aanbiedersdossier/sectorervaring',
    linkLabel: 'Naar sectorervaring',
  },
] as const

export function ProviderServicesExperienceOverview() {
  return (
    <>
      <ProviderPageHeader
        title="Diensten en ervaring"
        description="Beheer de diensten en specialismen van uw organisatie en leg de relevante sectorervaring afzonderlijk vast."
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] items-stretch gap-5">
        {sections.map((section) => (
          <Card key={section.href} className="flex min-w-0 flex-col">
            <h2 className="text-xl font-bold text-brand-dark">{section.title}</h2>
            <p className="mt-3 flex-1 text-text-secondary">{section.description}</p>
            <LinkButton href={section.href} variant="outline" className="mt-6 w-full sm:w-fit">
              {section.linkLabel}
            </LinkButton>
          </Card>
        ))}
      </div>
    </>
  )
}

export default function ProviderServicesExperiencePage() {
  return <ProviderServicesExperienceOverview />
}
