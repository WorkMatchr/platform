import type { ComponentProps } from 'react'

type CardProps = ComponentProps<'article'> & {
  variant?: 'default' | 'subtle' | 'dark'
}

const variants = {
  default: 'border-border bg-surface text-text-primary shadow-card',
  subtle: 'border-brand-primary/15 bg-surface-subtle text-text-primary',
  dark: 'border-brand-dark bg-brand-dark text-text-on-dark',
}

export function Card({ className = '', variant = 'default', ...props }: CardProps) {
  return <article className={`rounded-card border p-7 sm:p-8 ${variants[variant]} ${className}`} {...props} />
}
