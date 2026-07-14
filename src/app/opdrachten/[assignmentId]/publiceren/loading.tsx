import { Section } from '@/components/layout/section'

export default function AssignmentPublicationLoading() {
  return (
    <Section spacing="compact" containerSize="narrow">
      <div
        role="status"
        className="animate-pulse space-y-5 motion-reduce:animate-none"
      >
        <span className="sr-only">Publicatiecontrole laden</span>
        <div className="h-12 w-2/3 rounded-control bg-brand-primary-subtle" />
        <div className="h-72 rounded-card bg-surface-subtle" />
        <div className="h-48 rounded-card bg-surface-subtle" />
      </div>
    </Section>
  )
}
