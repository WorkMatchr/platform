import { Children, type ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'

export const buttonBaseStyles =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-5 py-2.5 text-center text-sm font-semibold transition-colors duration-normal disabled:cursor-not-allowed disabled:opacity-55'

export const buttonVariantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary text-text-on-dark hover:bg-brand-primary-hover',
  secondary: 'bg-brand-dark text-text-on-dark hover:bg-text-primary',
  outline: 'border border-border bg-surface text-brand-dark hover:border-brand-primary hover:bg-brand-primary-subtle',
  ghost: 'bg-transparent text-brand-dark hover:bg-brand-primary-subtle',
  destructive: 'bg-error text-text-on-dark hover:bg-error/90',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean
  loadingLabel?: string
  variant?: ButtonVariant
}

export function Button({
  children,
  className = '',
  disabled,
  loading,
  loadingLabel,
  type = 'button',
  variant = 'primary',
  ...props
}: ButtonProps) {
  const actionText = Children.toArray(children).filter(child => typeof child === 'string' || typeof child === 'number').join('')
  const pendingText = loadingLabel ?? (actionText && !['Verder', 'Terug', 'Wijzigen'].includes(actionText) ? `${actionText}…` : 'Bezig…')
  return (
    <button
      type={type}
      className={`${buttonBaseStyles} ${buttonVariantStyles[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      <span className="inline-grid min-w-0 items-center justify-items-center">
        <span className={`${loading ? 'invisible' : ''} col-start-1 row-start-1`} aria-hidden={loading || undefined}>{children}</span>
        {loading !== undefined && <span className={`${loading ? '' : 'invisible'} col-start-1 row-start-1 inline-flex max-w-full items-center justify-center gap-2`} aria-hidden={!loading || undefined}>
          <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
          <span>{pendingText}</span>
        </span>}
      </span>
    </button>
  )
}
