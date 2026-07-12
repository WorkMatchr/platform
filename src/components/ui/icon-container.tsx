import type { ComponentProps } from 'react'

export function IconContainer({ className = '', ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-hidden="true"
      className={`inline-grid size-11 shrink-0 place-items-center rounded-control bg-brand-primary-subtle text-brand-primary-hover ${className}`}
      {...props}
    />
  )
}
