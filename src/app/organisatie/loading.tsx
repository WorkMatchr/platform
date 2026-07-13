import { Section } from '@/components/layout/section'

export default function OrganizationLoading() {
  return <Section spacing="compact"><div role="status" className="animate-pulse space-y-5 motion-reduce:animate-none"><span className="sr-only">Organisatiegegevens laden</span><div className="h-12 w-2/3 rounded-control bg-brand-primary-subtle" /><div className="h-52 rounded-card bg-surface-subtle" /></div></Section>
}
