import Link from 'next/link'
import type { ReactNode } from 'react'

export function AdminPageHeader({
  eyebrow = 'Platformbeheer',
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-brand-dark sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
      </div>
      {action}
    </header>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  href,
  attention = false,
}: {
  label: string
  value: number | string
  detail?: string
  href?: string
  attention?: boolean
}) {
  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${attention ? 'text-error' : 'text-brand-dark'}`}>{value}</p>
      {detail ? <p className="mt-1 text-xs text-text-secondary">{detail}</p> : null}
    </>
  )
  const className =
    'block min-h-28 rounded-card border border-border bg-surface p-4 shadow-sm transition hover:border-brand-primary'
  return href ? <Link className={className} href={href}>{content}</Link> : <div className={className}>{content}</div>
}

export function AdminSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="mt-6">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-brand-dark">{title}</h2>
        {description ? <p className="mt-1 text-sm text-text-secondary">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-card border border-dashed border-border bg-surface p-6 text-sm text-text-secondary">{children}</p>
}

export function StatusPill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warning' | 'bad' }) {
  const toneClass = {
    neutral: 'bg-background text-text-secondary',
    good: 'bg-surface-subtle text-success',
    warning: 'bg-surface-subtle text-warning',
    bad: 'bg-surface-subtle text-error',
  }[tone]
  return <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${toneClass}`}>{children}</span>
}

export function AdminTable({
  headers,
  children,
}: {
  headers: string[]
  children: ReactNode
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-background text-xs uppercase tracking-wide text-text-secondary">
          <tr>{headers.map((header) => <th className="px-4 py-3 font-semibold" key={header}>{header}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  )
}

export function FilterForm({ children }: { children: ReactNode }) {
  return (
    <form className="mb-5 flex flex-wrap items-end gap-3 rounded-card border border-border bg-surface p-4">
      {children}
      <button className="min-h-10 rounded-control bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-dark" type="submit">
        Toepassen
      </button>
    </form>
  )
}

export function FilterField({
  name,
  label,
  defaultValue,
  children,
}: {
  name: string
  label: string
  defaultValue?: string
  children?: ReactNode
}) {
  return (
    <label className="grid min-w-44 gap-1 text-xs font-semibold text-text-secondary">
      {label}
      {children ?? <input className="min-h-10 rounded-control border border-border bg-surface px-3 text-sm text-brand-dark" name={name} defaultValue={defaultValue} />}
    </label>
  )
}
