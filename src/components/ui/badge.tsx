import type { ComponentProps } from 'react'

type BadgeProps = ComponentProps<'span'> & {
  variant?: 'brand' | 'success' | 'neutral'
}

const variants = {
  brand: 'bg-brand-primary-subtle text-brand-primary-hover',
  success: 'bg-success/10 text-success',
  neutral: 'bg-surface-subtle text-text-secondary',
}

export function Badge({ className = '', variant = 'brand', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-pill px-3 py-1 text-xs font-semibold tracking-wide ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
