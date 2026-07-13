import { Section } from '@/components/layout/section'

export default function IntakeLoading() {
  return (
    <Section spacing="compact">
      <div role="status" className="animate-pulse space-y-5 motion-reduce:animate-none">
        <span className="sr-only">Hulpvragen laden</span>
        <div className="h-12 w-2/3 rounded-control bg-brand-primary-subtle" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="h-64 rounded-card bg-surface-subtle" />
          <div className="h-64 rounded-card bg-surface-subtle" />
        </div>
      </div>
    </Section>
  )
}
