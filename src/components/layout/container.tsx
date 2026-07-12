import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

type ContainerProps<T extends ElementType> = {
  as?: T
  children: ReactNode
  className?: string
  size?: 'default' | 'narrow'
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>

export function Container<T extends ElementType = 'div'>({
  as,
  children,
  className = '',
  size = 'default',
  ...props
}: ContainerProps<T>) {
  const Component = as ?? 'div'
  const width = size === 'narrow' ? 'max-w-4xl' : 'max-w-7xl'

  return (
    <Component className={`mx-auto w-full ${width} px-5 sm:px-8 lg:px-10 ${className}`} {...props}>
      {children}
    </Component>
  )
}
