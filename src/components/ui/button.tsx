import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost'

export const buttonBaseStyles =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-5 py-2.5 text-center text-sm font-semibold transition-colors duration-normal disabled:cursor-not-allowed disabled:opacity-55'

export const buttonVariantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary text-text-on-dark hover:bg-brand-primary-hover',
  secondary: 'bg-brand-dark text-text-on-dark hover:bg-text-primary',
  outline: 'border border-border bg-surface text-brand-dark hover:border-brand-primary hover:bg-brand-primary-subtle',
  ghost: 'bg-transparent text-brand-dark hover:bg-brand-primary-subtle',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  variant?: ButtonVariant
}

export function Button({
  children,
  className = '',
  disabled,
  loading = false,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${buttonBaseStyles} ${buttonVariantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
        />
      )}
      {loading ? <span>Bezig…</span> : children}
    </button>
  )
}
