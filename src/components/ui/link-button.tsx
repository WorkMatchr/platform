import Link from 'next/link'
import type { ComponentProps } from 'react'
import { buttonBaseStyles, buttonVariantStyles, type ButtonVariant } from '@/components/ui/button'

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant
}

export function LinkButton({ className = '', variant = 'primary', ...props }: LinkButtonProps) {
  return <Link className={`${buttonBaseStyles} ${buttonVariantStyles[variant]} ${className}`} {...props} />
}
