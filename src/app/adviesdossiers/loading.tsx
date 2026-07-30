import { Container } from '@/components/layout/container'
import { Section } from '@/components/layout/section'

export default function AdviceDossiersLoading() {
  return (
    <Section spacing="compact">
      <Container>
        <div
          className="h-8 w-64 animate-pulse rounded-control bg-surface-subtle motion-reduce:animate-none"
          aria-label="Adviesdossiers laden"
        />
        <div className="mt-7 space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-card border border-border bg-surface-subtle motion-reduce:animate-none"
            />
          ))}
        </div>
      </Container>
    </Section>
  )
}
