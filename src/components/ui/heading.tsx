import type { ComponentPropsWithoutRef, ElementType } from 'react'

type HeadingProps<T extends ElementType> = {
  as?: T
  className?: string
  size?: 'display' | 'h1' | 'h2' | 'h3'
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>

const sizes = {
  display: 'text-display leading-[1.08] tracking-[-0.035em]',
  h1: 'text-heading-1 leading-[1.1] tracking-[-0.03em]',
  h2: 'text-heading-2 leading-tight tracking-[-0.025em]',
  h3: 'text-heading-3 leading-snug',
}

export function Heading<T extends ElementType = 'h2'>({
  as,
  className = '',
  size = 'h2',
  ...props
}: HeadingProps<T>) {
  const Component = as ?? 'h2'
  return <Component className={`font-bold text-balance ${sizes[size]} ${className}`} {...props} />
}
