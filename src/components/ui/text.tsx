import type { ComponentPropsWithoutRef, ElementType } from 'react'

type TextProps<T extends ElementType> = {
  as?: T
  className?: string
  size?: 'sm' | 'default' | 'lg'
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'className'>

const sizes = {
  sm: 'text-body-sm leading-6',
  default: 'text-body leading-7',
  lg: 'text-body-lg leading-8',
}

export function Text<T extends ElementType = 'p'>({
  as,
  className = '',
  size = 'default',
  ...props
}: TextProps<T>) {
  const Component = as ?? 'p'
  return <Component className={`${sizes[size]} ${className}`} {...props} />
}
