import type { ComponentProps } from 'react'

export function VisuallyHidden({ className = '', ...props }: ComponentProps<'span'>) {
  return <span className={`sr-only ${className}`} {...props} />
}
