import type { ComponentProps } from 'react'
import { Container } from '@/components/layout/container'

type SectionProps = ComponentProps<'section'> & {
  containerClassName?: string
  containerSize?: 'default' | 'narrow'
  spacing?: 'default' | 'compact'
}

export function Section({
  children,
  className = '',
  containerClassName = '',
  containerSize = 'default',
  spacing = 'default',
  ...props
}: SectionProps) {
  const spacingClass = spacing === 'compact' ? 'py-12 sm:py-16' : 'py-20 sm:py-24'

  return (
    <section className={`${spacingClass} ${className}`} {...props}>
      <Container size={containerSize} className={containerClassName}>
        {children}
      </Container>
    </section>
  )
}
